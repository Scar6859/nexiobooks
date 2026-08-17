"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Inbox,
  Info,
  LayoutGrid,
  MessageCircle,
  ShoppingBag,
  Tag,
  User,
  X,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  auth?: boolean;
};

const ICONS: Record<string, typeof ShoppingBag> = {
  "/buy": ShoppingBag,
  "/sell": Tag,
  "/my-listings": BookOpen,
  "/my-requests": Inbox,
  "/messages": MessageCircle,
  "/about": Info,
  "/profile": User,
};

type NavWaffleProps = {
  items: NavItem[];
  pathname: string;
  alwaysVisible?: boolean;
  showSignup?: boolean;
};

export default function NavWaffle({
  items,
  pathname,
  alwaysVisible = false,
  showSignup = false,
}: NavWaffleProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={`relative z-50 shrink-0 ${alwaysVisible ? "" : "md:hidden"}`}
      ref={menuRef}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className={`group flex h-9 w-9 items-center justify-center rounded-xl border text-[var(--header-text)] transition-all duration-200 sm:h-10 sm:w-10 ${
          open
            ? "border-[var(--gold)]/50 bg-[var(--gold)]/15 shadow-[0_0_18px_rgba(201,162,39,0.28)]"
            : "border-[var(--header-control-border)] hover:border-[var(--gold)]/40 hover:bg-[var(--header-control-hover)]"
        }`}
      >
        {open ? (
          <X className="h-5 w-5 text-[var(--gold-muted)]" />
        ) : (
          <LayoutGrid className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
        )}
      </button>

      <div
        className={`absolute left-0 top-[calc(100%+0.6rem)] z-50 w-[min(19rem,calc(100vw-2rem))] origin-top-left transition-all duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1.5 scale-95 opacity-0"
        }`}
        role="menu"
      >
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl shadow-black/25 ring-1 ring-[var(--gold)]/15">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/80 to-transparent"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[var(--gold)]/15 blur-2xl"
          />

          <p className="relative px-3 pb-2 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Navigate
          </p>
          <div className="relative space-y-1">
            {items.map((item) => {
              const Icon = ICONS[item.href];
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                    active
                      ? "bg-[var(--navy)] text-white shadow-sm"
                      : "text-[var(--foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--gold-muted)]"
                  }`}
                >
                  {Icon && (
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        active
                          ? "bg-white/10 text-[var(--gold-light)]"
                          : "bg-[var(--surface-2)] text-[var(--gold-muted)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  )}
                  {item.label}
                </Link>
              );
            })}
            {showSignup && (
              <Link
                href="/signup"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] sm:hidden"
              >
                Sign up
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
