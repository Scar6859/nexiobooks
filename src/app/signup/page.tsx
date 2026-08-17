"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DUPLICATE_EMAIL_MESSAGE,
  getSignupErrorMessage,
  isDuplicateSignup,
  normalizeEmail,
} from "@/lib/auth";
import { SCHOOLS } from "@/lib/constants";
import FancySelect from "@/components/FancySelect";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = normalizeEmail(String(form.get("email")));
    const password = String(form.get("password"));
    const fullName = String(form.get("full_name"));
    const school = String(form.get("school"));
    const phone = String(form.get("phone") ?? "").trim();

    if (!phone) {
      setError("Phone number is required.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/confirmed")}`,
        // Persist profile fields for creation after email confirm (no session yet).
        data: {
          full_name: fullName,
          school,
          phone,
        },
      },
    });

    if (error) {
      setError(getSignupErrorMessage(error));
      setLoading(false);
      return;
    }

    if (isDuplicateSignup(data)) {
      setError(DUPLICATE_EMAIL_MESSAGE);
      setLoading(false);
      return;
    }

    // Only works when email confirm is off (session present). Otherwise RLS blocks
    // this and ensureUserProfile runs after confirm/login from user_metadata.
    if (data.user && data.session) {
      const { ensureUserProfile } = await import("@/lib/profile");
      await ensureUserProfile(supabase, data.user);
    }

    if (data.user && !data.session) {
      setConfirmationEmail(email);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  if (confirmationEmail) {
    return (
      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)]/15 text-[var(--gold-muted)]">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Check your email</h1>
        <p className="text-sm text-[var(--muted)]">
          A confirmation link has been sent to{" "}
          <span className="font-semibold text-[var(--foreground)]">{confirmationEmail}</span>.
          Click the link to activate your account, then you can log in.
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(redirect)}`}
          className="btn-navy inline-block px-6 py-3 text-sm"
        >
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Sign up</h1>
      <p className="text-sm text-[var(--muted)]">Create your NEXIOBOOKS account to list and buy books.</p>

      <input
        name="full_name"
        required
        placeholder="Full name"
        className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
      />
      <FancySelect
        name="school"
        label="School"
        required
        defaultValue={SCHOOLS[0]}
        options={SCHOOLS}
      />
      <input
        name="phone"
        type="tel"
        required
        placeholder="Phone number"
        autoComplete="tel"
        className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
      />
      <input
        name="password"
        type="password"
        required
        minLength={6}
        placeholder="Password (min 6 characters)"
        className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="btn-navy w-full py-3 text-sm disabled:opacity-60"
      >
        {loading ? "Creating account..." : "Sign up"}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-[var(--gold-muted)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <Suspense>
        <SignupForm />
      </Suspense>
    </div>
  );
}
