"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  // true only when Supabase has confirmed this is a PASSWORD_RECOVERY session
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for the short-lived cookie set by /auth/callback or /auth/confirm
    // when a real password-recovery email link is followed.
    const hasCookie = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith("reset-in-progress="));

    if (hasCookie) {
      // Consume the cookie immediately so it can't be reused.
      document.cookie = "reset-in-progress=; Max-Age=0; path=/";
      setRecoveryReady(true);
      setReady(true);
      return () => {};
    }

    // Fallback: also accept the PASSWORD_RECOVERY event emitted by the
    // client-side implicit/OTP flow (not used in the PKCE server-side path,
    // but kept for completeness).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
        setReady(true);
      } else if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        // Session exists but did not come from a recovery link.
        setReady(true);
      }
    });

    // Fallback timeout so the UI doesn't spin forever.
    const timeout = setTimeout(() => setReady(true), 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase]);

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

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Sign the user out so they land on login and authenticate with the new password.
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
          <Link href="/forgot-password" className="btn-navy inline-block px-6 py-3 text-sm">
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
          Choose a new password for your NexioBooks account.
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
