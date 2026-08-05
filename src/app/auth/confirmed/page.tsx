"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EmailConfirmedPage() {
  useEffect(() => {
    // Pick up sessions delivered via URL hash (implicit / older redirects).
    const supabase = createClient();
    void supabase.auth.getSession();
  }, []);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-5xl font-semibold tracking-tight text-[var(--foreground)] sm:text-6xl">
        Email confirmed
      </h1>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Your account is ready. You can log in now.
      </p>
      <Link href="/login" className="btn-navy mt-8 px-6 py-3 text-sm">
        Go to log in
      </Link>
    </div>
  );
}
