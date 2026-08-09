"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeEmail } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = normalizeEmail(String(form.get("email")));

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
      },
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSentTo(email);
    setLoading(false);
  }

  if (sentTo) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
        <div className="w-full space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)]/10 text-[var(--gold-muted)]">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Check your email
          </h1>
          <p className="text-sm text-[var(--muted)]">
            If an account exists for{" "}
            <span className="font-medium text-[var(--foreground)]">{sentTo}</span>,
            we sent a link to reset your password.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-semibold text-[var(--gold-muted)] hover:underline"
          >
            Back to log in
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
          Forgot password
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-navy w-full py-3 text-sm disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>

        <p className="text-center text-sm text-[var(--muted)]">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--gold-muted)] hover:underline"
          >
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
