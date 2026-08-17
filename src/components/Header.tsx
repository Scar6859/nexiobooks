"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Logo from "@/components/Logo";
import NavWaffle from "@/components/NavWaffle";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import Avatar from "@/components/Avatar";
import { resolveIsAdmin } from "@/lib/auth";
import { ensureUserProfile } from "@/lib/profile";

const nav = [
  { href: "/buy", label: "Buy" },
  { href: "/sell", label: "Sell" },
  { href: "/my-listings", label: "My Listings", auth: true },
  { href: "/my-requests", label: "My Requests", auth: true },
  { href: "/messages", label: "Messages", auth: true },
  { href: "/about", label: "About Us" },
];

const themeColorTransition =
  "transition-[color,border-color,background-color] duration-[250ms] ease";

type HeaderProfile = {
  full_name: string | null;
  initials: string | null;
  avatar_url: string | null;
  is_admin: boolean;
};

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const supabase = createClient();
  const { theme } = useTheme();
  const isHome = pathname === "/";
  const isResetPage = pathname === "/reset-password";
  const onDarkBar = theme === "dark";
  const isAdmin = resolveIsAdmin(user?.email, profile?.is_admin);

  const waffleNav = [
    ...nav.filter((item) => !item.auth || (user && !isResetPage)),
    ...(user && !isResetPage
      ? [{ href: "/profile", label: "My Profile", auth: true }]
      : []),
  ];

  useEffect(() => {
    async function load(nextUser: User | null) {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        return;
      }
      await ensureUserProfile(supabase, nextUser);
      const { data } = await supabase
        .from("profiles")
        .select("full_name, initials, avatar_url, is_admin")
        .eq("id", nextUser.id)
        .maybeSingle();
      setProfile(
        data
          ? {
              full_name: data.full_name,
              initials: data.initials,
              avatar_url: data.avatar_url ?? null,
              is_admin: Boolean(data.is_admin),
            }
          : null,
      );
    }

    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const displayName =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Profile";

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
      <div className="mx-auto flex max-w-6xl flex-nowrap items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
          <NavWaffle
            items={waffleNav}
            pathname={pathname}
            alwaysVisible={isAdmin}
            showSignup={!user}
          />

          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-3"
          >
            <span className="shrink-0 sm:hidden">
              <Logo size={34} />
            </span>
            <span className="hidden shrink-0 sm:inline">
              <Logo size={42} />
            </span>
            <div className="min-w-0 flex-1 overflow-hidden leading-tight">
              <div
                className={`truncate text-base font-bold tracking-wide text-[var(--header-text)] sm:text-lg ${themeColorTransition}`}
              >
                NEXIO<span className="text-[var(--gold)]">BOOKS</span>
              </div>
              <div
                className={`hidden truncate text-[10px] uppercase tracking-[0.14em] text-[var(--header-text-muted)] lg:block ${themeColorTransition}`}
              >
                Turning old books into new opportunities
              </div>
            </div>
          </Link>
        </div>

        {!isAdmin && (
          <nav className="hidden min-w-0 shrink items-center gap-3 overflow-hidden md:flex lg:gap-5">
            {nav
              .filter((item) => !item.auth || (user && !isResetPage))
              .map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap text-sm font-medium ${themeColorTransition} ${
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
        )}

        <div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user && !isResetPage ? (
            <>
              <Link
                href="/profile"
                className={`flex max-w-[8.5rem] flex-nowrap items-center gap-2 rounded-full border border-[var(--header-control-border)] py-1 pl-1 pr-2.5 hover:bg-[var(--header-control-hover)] sm:max-w-[10rem] sm:pr-3 ${themeColorTransition}`}
                title={displayName}
              >
                <Avatar
                  name={displayName}
                  initials={profile?.initials}
                  src={profile?.avatar_url}
                  size="sm"
                  className="shrink-0"
                />
                <span
                  className={`hidden min-w-0 truncate whitespace-nowrap text-sm font-medium text-[var(--header-text)] sm:inline ${themeColorTransition}`}
                >
                  {displayName}
                </span>
              </Link>
              <button
                onClick={signOut}
                className={`shrink-0 whitespace-nowrap rounded-full border border-[var(--header-control-border)] px-2.5 py-2 text-sm font-medium text-[var(--header-text)] hover:bg-[var(--header-control-hover)] sm:px-4 ${themeColorTransition}`}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`shrink-0 whitespace-nowrap rounded-full border border-[var(--header-control-border)] px-2.5 py-2 text-sm font-medium text-[var(--header-text)] hover:bg-[var(--header-control-hover)] sm:px-4 ${themeColorTransition}`}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="hidden shrink-0 whitespace-nowrap rounded-full bg-[var(--gold)] px-3 py-2 text-sm font-semibold text-[#0a1628] transition-[background-color] duration-[250ms] ease hover:bg-[var(--gold-light)] sm:inline-flex sm:px-4"
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
