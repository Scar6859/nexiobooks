"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      // Support recovery links that land with a hash/session already present.
      await supabase.auth.getSession();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setHasSession(Boolean(user));
      setReady(true);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasSession(true);
        setReady(true);
      }
    });

    void bootstrap();

    return () => {
      active = false;
      subscription.unsubscribe();
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

    setDone(true);
    setLoading(false);
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 py-10 text-sm text-[var(--muted)]">
        Checking reset link...
      </div>
    );
  }

  if (!hasSession) {
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

  if (done) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
        <div className="w-full space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Password updated
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Your password has been changed. You can keep browsing or head back
            to log in on another device.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/buy" className="btn-navy px-6 py-3 text-sm">
              Browse books
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            >
              Go to log in
            </Link>
          </div>
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
