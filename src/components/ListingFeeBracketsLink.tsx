"use client";

import { LISTING_FEE_BRACKETS } from "@/lib/constants";

type ListingFeeBracketsLinkProps = {
  className?: string;
};

export default function ListingFeeBracketsLink({
  className = "",
}: ListingFeeBracketsLinkProps) {
  return (
    <span className={`group/fee relative inline-block ${className}`}>
      <button
        type="button"
        className="text-[var(--gold-muted)] underline decoration-[var(--gold)]/40 underline-offset-2 transition-colors duration-200 hover:text-[var(--gold)] hover:decoration-[var(--gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/30"
        aria-describedby="listing-fee-brackets-popup"
      >
        See fee brackets
      </button>

      <span
        id="listing-fee-brackets-popup"
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 w-[16.5rem] -translate-x-1/2 origin-bottom pb-2 opacity-0 scale-95 transition-all duration-200 ease-out group-hover/fee:pointer-events-auto group-hover/fee:scale-100 group-hover/fee:opacity-100 group-focus-within/fee:pointer-events-auto group-focus-within/fee:scale-100 group-focus-within/fee:opacity-100"
      >
        <span className="relative block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-2xl shadow-black/25 ring-1 ring-[var(--gold)]/15">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/70 to-transparent"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[var(--gold)]/10 blur-xl"
          />

          <span className="relative block">
            <span className="font-display block text-base font-semibold tracking-wide text-[var(--foreground)]">
              Listing fee schedule
            </span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              Based on your asking price
            </span>

            <span className="mt-3 block space-y-1.5">
              {LISTING_FEE_BRACKETS.map((bracket) => (
                <span
                  key={bracket.label}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-2)]/80 px-2.5 py-1.5 text-xs"
                >
                  <span className="font-medium text-[var(--muted)]">
                    {bracket.label}
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--gold-muted)]">
                    ${bracket.fee.toFixed(2)}
                  </span>
                </span>
              ))}
            </span>
          </span>
        </span>
        <span
          aria-hidden
          className="absolute bottom-0.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-[var(--border)] bg-[var(--surface)]"
        />
      </span>
    </span>
  );
}
