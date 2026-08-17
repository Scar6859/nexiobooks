"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, IdCard } from "lucide-react";
import ListingForm from "@/components/ListingForm";

export default function SellHandoffInfo({
  loggedIn = false,
  userId,
  sellerInitials,
  defaultLocation,
}: {
  loggedIn?: boolean;
  userId?: string;
  sellerInitials?: string;
  defaultLocation?: string;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">
            List in person
          </h1>
          <p className="mt-3 text-base text-[var(--muted)]">
            For you to list your book, hand over your book to us in person and
            let us know your asking price and your name.
          </p>
        </div>

        <ul className="space-y-3 text-sm text-[var(--foreground)]">
          <li className="flex gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold-muted)]" />
            <span>Bring the book to us and tell us your asking price.</span>
          </li>
          <li className="flex gap-3">
            <IdCard className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold-muted)]" />
            <span>Share your name so we can credit the listing to you.</span>
          </li>
        </ul>

        <div className="flex flex-wrap gap-3">
          {loggedIn && userId && sellerInitials ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="btn-navy inline-flex px-6 py-3 text-sm"
            >
              Fill out listing details
            </button>
          ) : (
            <Link
              href="/login?redirect=/sell"
              className="btn-navy inline-flex px-6 py-3 text-sm"
            >
              Log in to fill out details
            </Link>
          )}
          <Link
            href="/buy"
            className="inline-flex rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)]"
          >
            Browse books
          </Link>
        </div>
      </div>

      {showForm && userId && sellerInitials && (
        <div className="mt-8">
          <ListingForm
            userId={userId}
            sellerInitials={sellerInitials}
            mode="handoff"
            defaultLocation={defaultLocation}
          />
        </div>
      )}
    </div>
  );
}
