"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizeEmail } from "@/lib/auth";
import { ensureUserProfile } from "@/lib/profile";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = normalizeEmail(String(form.get("email")));
    const password = String(form.get("password"));

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await ensureUserProfile(supabase, data.user);
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Log in</h1>
      <p className="text-sm text-[var(--muted)]">Welcome back to NexioBooks.</p>

      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
      />
      <div className="space-y-2">
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
        />
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-[var(--gold-muted)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="btn-navy w-full py-3 text-sm disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Log in"}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        Don&apos;t have an account?{" "}
        <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-[var(--gold-muted)] hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
