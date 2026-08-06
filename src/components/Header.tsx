"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import Avatar from "@/components/Avatar";
import { ensureUserProfile } from "@/lib/profile";
import { LayoutGrid, X } from "lucide-react";

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
};

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { theme } = useTheme();
  const isHome = pathname === "/";
  const onDarkBar = theme === "dark";

  const mobileNav = [
    ...nav.filter((item) => !item.auth || user),
    ...(user ? [{ href: "/profile", label: "My Profile", auth: true }] : []),
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
        .select("full_name, initials, avatar_url")
        .eq("id", nextUser.id)
        .maybeSingle();
      setProfile(
        data
          ? {
              full_name: data.full_name,
              initials: data.initials,
              avatar_url: data.avatar_url ?? null,
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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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
      <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-2 px-4 py-3 sm:gap-3">
        <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
          <div className="relative md:hidden" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--header-control-border)] text-[var(--header-text)] transition-all duration-200 hover:bg-[var(--header-control-hover)] ${
                menuOpen ? "bg-[var(--header-control-hover)]" : ""
              }`}
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <LayoutGrid className="h-5 w-5" />
              )}
            </button>

            <div
              className={`absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-2rem))] origin-top-left transition-all duration-200 ${
                menuOpen
                  ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none -translate-y-1 scale-95 opacity-0"
              }`}
              role="menu"
            >
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl shadow-black/20">
                <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Navigate
                </p>
                <div className="space-y-1">
                  {mobileNav.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                          active
                            ? "bg-[var(--navy)] text-white"
                            : "text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
            <Logo size={42} />
            <div className="min-w-0 leading-tight">
              <div
                className={`whitespace-nowrap text-lg font-bold tracking-wide text-[var(--header-text)] ${themeColorTransition}`}
              >
                NEXIO<span className="text-[var(--gold)]">BOOKS</span>
              </div>
              <div
                className={`hidden whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-[var(--header-text-muted)] lg:block ${themeColorTransition}`}
              >
                Turning old books into new opportunities
              </div>
            </div>
          </Link>
        </div>

        <nav className="hidden min-w-0 shrink items-center gap-3 overflow-hidden md:flex lg:gap-5">
          {nav
            .filter((item) => !item.auth || user)
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

        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          <ThemeToggle />
          {user ? (
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
                className={`shrink-0 whitespace-nowrap rounded-full border border-[var(--header-control-border)] px-3 py-2 text-sm font-medium text-[var(--header-text)] hover:bg-[var(--header-control-hover)] sm:px-4 ${themeColorTransition}`}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`shrink-0 whitespace-nowrap rounded-full border border-[var(--header-control-border)] px-3 py-2 text-sm font-medium text-[var(--header-text)] hover:bg-[var(--header-control-hover)] sm:px-4 ${themeColorTransition}`}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="shrink-0 whitespace-nowrap rounded-full bg-[var(--gold)] px-3 py-2 text-sm font-semibold text-[#0a1628] transition-[background-color] duration-[250ms] ease hover:bg-[var(--gold-light)] sm:px-4"
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
