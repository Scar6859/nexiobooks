import Link from "next/link";
import { BookOpen, HandCoins, IdCard } from "lucide-react";
import { LISTING_FEE_BRACKETS } from "@/lib/constants";

export default function SellHandoffInfo() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">
            List in person
          </h1>
          <p className="mt-3 text-base text-[var(--muted)]">
            For you to list your book, hand over your book to us in person and
            let us know the listing fee along with your name.
          </p>
        </div>

        <ul className="space-y-3 text-sm text-[var(--foreground)]">
          <li className="flex gap-3">
            <HandCoins className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold-muted)]" />
            <span>Bring the book to us and tell us your asking price.</span>
          </li>
          <li className="flex gap-3">
            <IdCard className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold-muted)]" />
            <span>Share your name so we can credit the listing to you.</span>
          </li>
          <li className="flex gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold-muted)]" />
            <span>Pay the listing fee when you hand the book over.</span>
          </li>
        </ul>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Listing fee schedule
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Based on your asking price
          </p>
          <div className="mt-3 space-y-1.5">
            {LISTING_FEE_BRACKETS.map((bracket) => (
              <div
                key={bracket.label}
                className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--muted)]">{bracket.label}</span>
                <span className="font-semibold tabular-nums text-[var(--gold-muted)]">
                  ${bracket.fee.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Link href="/buy" className="btn-navy inline-flex px-6 py-3 text-sm">
          Browse books
        </Link>
      </div>
    </div>
  );
}
