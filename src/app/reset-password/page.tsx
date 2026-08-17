"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // PKCE recovery flow: /auth/callback passes the raw code here without
  // exchanging it, so no session exists yet when the user sees this form.
  const code = searchParams.get("code");

  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // PKCE flow: a valid-looking code in the URL means the user arrived from
    // the recovery email. Show the form immediately — no session yet.
    if (code) {
      setRecoveryReady(true);
      setReady(true);
      return;
    }

    // OTP / token_hash flow: /auth/confirm verifies the token server-side
    // (session is already established) and sets this short-lived cookie.
    const hasCookie = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith("reset-in-progress="));

    if (hasCookie) {
      document.cookie = "reset-in-progress=; Max-Age=0; path=/";
      setRecoveryReady(true);
      setReady(true);
      return;
    }

    // Implicit / legacy fallback: listen for the PASSWORD_RECOVERY event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
        setReady(true);
      } else if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    const timeout = setTimeout(() => setReady(true), 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [code, supabase]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    // PKCE flow: exchange the code for a short-lived session now that the
    // user has confirmed they want to proceed.
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setError(
          "This reset link has expired or already been used. Please request a new one."
        );
        setLoading(false);
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Sign out immediately so the user must log in with their new password.
    await supabase.auth.signOut();
    router.replace("/login?reset=success");
  }

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 py-10 text-sm text-[var(--muted)]">
        Checking reset link...
      </div>
    );
  }

  if (!recoveryReady) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
        <div className="w-full space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Reset link invalid
          </h1>
          <p className="text-sm text-[var(--muted)]">
            This password reset link is invalid or has expired. Request a new
            one and try again.
          </p>
          <Link
            href="/forgot-password"
            className="btn-navy inline-block px-6 py-3 text-sm"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Set a new password
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Choose a new password for your NEXIOBOOKS account.
        </p>

        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="New password"
          className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
        />
        <input
          name="confirm"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Confirm new password"
          className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-navy w-full py-3 text-sm disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 py-10 text-sm text-[var(--muted)]">
          Checking reset link...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
