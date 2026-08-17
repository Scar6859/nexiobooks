"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BookCard from "@/components/BookCard";
import { createClient } from "@/lib/supabase/client";
import { approveListingAsAdmin } from "@/lib/listings";
import type { ListingWithSeller } from "@/lib/types";

export default function PendingSubmissions({
  listings,
  adminId,
}: {
  listings: ListingWithSeller[];
  adminId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await approveListingAsAdmin(supabase, id, adminId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve listing.");
    } finally {
      setBusyId(null);
    }
  }

  async function decline(id: string) {
    setBusyId(id);
    setError(null);
    const { error: updateError } = await supabase
      .from("listings")
      .update({ status: "declined", available: false })
      .eq("id", id);
    if (updateError) {
      setError(updateError.message);
      setBusyId(null);
      return;
    }
    router.refresh();
    setBusyId(null);
  }

  if (listings.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--muted)]">
        No pending listing requests yet. When a student fills out the sell form,
        it will show up here and in your Sellers messages tab.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <div key={listing.id} className="space-y-2">
            <BookCard listing={listing} isAdmin />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busyId === listing.id}
                onClick={() => void approve(listing.id)}
                className="btn-navy flex-1 py-2 text-xs disabled:opacity-60"
              >
                {busyId === listing.id ? "Saving..." : "Approve as my listing"}
              </button>
              <button
                type="button"
                disabled={busyId === listing.id}
                onClick={() => void decline(listing.id)}
                className="flex-1 rounded-full border border-[var(--border)] py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-60"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
