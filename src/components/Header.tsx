"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";

const nav = [
  { href: "/buy", label: "Buy" },
  { href: "/sell", label: "Sell" },
  { href: "/my-listings", label: "My Listings", auth: true },
  { href: "/about", label: "About Us" },
];

const themeColorTransition =
  "transition-[color,border-color,background-color] duration-[250ms] ease";

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();
  const { theme } = useTheme();
  const isHome = pathname === "/";
  const onDarkBar = theme === "dark";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase.auth]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md ${themeColorTransition} ${
        onDarkBar
          ? isHome
            ? "border-white/10 bg-[var(--navy)]"
            : "border-white/10 bg-[#050b14]"
          : "border-[var(--header-border)] bg-[var(--header-bg)]"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={42} />
          <div className="leading-tight">
            <div
              className={`text-lg font-bold tracking-wide text-[var(--header-text)] ${themeColorTransition}`}
            >
              NEXIO<span className="text-[var(--gold)]">BOOKS</span>
            </div>
            <div
              className={`hidden text-[10px] uppercase tracking-[0.14em] text-[var(--header-text-muted)] sm:block ${themeColorTransition}`}
            >
              Turning old books into new opportunities
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {nav
            .filter((item) => !item.auth || user)
            .map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium ${themeColorTransition} ${
                    active
                      ? "text-[var(--header-nav-active)]"
                      : "text-[var(--header-nav)] hover:text-[var(--header-nav-hover)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <span
                className={`hidden text-sm text-[var(--header-text-muted)] sm:inline ${themeColorTransition}`}
              >
                {user.email}
              </span>
              <button
                onClick={signOut}
                className={`rounded-full border border-[var(--header-control-border)] px-4 py-2 text-sm font-medium text-[var(--header-text)] hover:bg-[var(--header-control-hover)] ${themeColorTransition}`}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`rounded-full border border-[var(--header-control-border)] px-4 py-2 text-sm font-medium text-[var(--header-text)] hover:bg-[var(--header-control-hover)] ${themeColorTransition}`}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#0a1628] transition-[background-color] duration-[250ms] ease hover:bg-[var(--gold-light)]"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
