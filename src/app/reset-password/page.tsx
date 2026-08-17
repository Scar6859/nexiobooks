"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { createBrowserClient } from "@supabase/ssr";

// Create a Supabase client with detectSessionInUrl disabled so the browser
// client does NOT auto-exchange the ?code= param and log the user in before
// they have submitted the form.
function createResetClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        detectSessionInUrl: false,
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  // Also handle the OTP / token_hash flow from /auth/confirm which sets this cookie.
  const [hasRecoveryCookie, setHasRecoveryCookie] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cookiePresent = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith("reset-in-progress="));
    if (cookiePresent) {
      document.cookie = "reset-in-progress=; Max-Age=0; path=/";
      setHasRecoveryCookie(true);
    }
  }, []);

  // Valid if arrived via a PKCE recovery code OR the OTP cookie path.
  const isValidReset = Boolean(code) || hasRecoveryCookie;

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

    const supabase = createResetClient();

    // PKCE flow: exchange the code now — this is the FIRST time we touch it,
    // so the user was never logged in before this moment.
    if (code) {
      const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exchErr) {
        setError(
          "This reset link has expired or already been used. Please request a new one."
        );
        setLoading(false);
        return;
      }
    }

    // OTP flow: a session was established server-side by /auth/confirm; use the
    // regular (session-aware) client here.
    const { createClient } = await import("@/lib/supabase/client");
    const sessionClient = code ? supabase : createClient();

    const { error: updateErr } = await sessionClient.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }

    // Sign out completely — user must log in fresh with their new password.
    await sessionClient.auth.signOut();
    router.replace("/login?reset=success");
  }

  if (!isValidReset) {
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
          Loading...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
