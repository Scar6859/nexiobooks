"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcListingSavings } from "@/lib/constants";
import type { ListingWithSeller } from "@/lib/types";
import ImageGallery from "./ImageGallery";
import RequestModal from "./RequestModal";
import { Pencil, Trash2 } from "lucide-react";

export default function BookCard({
  listing,
  isOwn,
  isAdmin,
  requestStatus,
}: {
  listing: ListingWithSeller;
  isOwn?: boolean;
  isAdmin?: boolean;
  requestStatus?: "pending" | "accepted" | "declined" | "completed";
}) {
  const router = useRouter();
  const supabase = createClient();
  const [showRequest, setShowRequest] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage = isOwn || isAdmin;
  const hasRequested = Boolean(requestStatus);
  const priceLabel =
    listing.listing_type === "donate" || listing.price === null
      ? "Free"
      : `$${Number(listing.price).toFixed(0)}`;
  const savings = calcListingSavings(
    listing.regular_price,
    listing.price,
    listing.listing_type,
  );

  const requestLabel =
    requestStatus === "accepted"
      ? "Accepted"
      : requestStatus === "declined"
        ? "Declined"
        : requestStatus === "completed"
          ? "Completed"
          : hasRequested
            ? "Requested"
            : "Request";

  async function onDelete() {
    if (!confirm(`Remove "${listing.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("listings").delete().eq("id", listing.id);
    if (error) {
      alert(
        /row-level security|42501/i.test(error.message)
          ? "Could not remove listing. Run supabase/fix-live-schema.sql so admin delete permissions are enabled, then log in again."
          : error.message,
      );
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <article className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 w-full">
          <ImageGallery
            urls={listing.image_urls}
            videoUrl={listing.video_url}
            alt={listing.title}
            compact
          />
        </div>

        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium capitalize text-[var(--muted)]">
            {listing.listing_type}
          </span>
          {canManage && (
            <div className="flex gap-1">
              <Link
                href={`/sell/edit/${listing.id}`}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--gold-muted)]"
                title="Edit listing"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="Remove listing"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold text-[var(--foreground)]">{listing.title}</h3>
        {listing.note && (
          <p className="mt-2 text-sm text-[var(--muted)] line-clamp-2">{listing.note}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--muted)]">
            {listing.topic}
          </span>
          <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--muted)]">
            {listing.condition}
          </span>
          {listing.status === "pending" && (
            <span className="rounded-full bg-[var(--gold)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--gold-muted)]">
              Pending approval
            </span>
          )}
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3">
            <div className="text-xs text-[var(--muted)]">
              <div>{listing.location}</div>
              <div>
                Seller:{" "}
                {isOwn
                  ? "You"
                  : listing.seller_name?.trim() || "Student"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[var(--gold-muted)]">{priceLabel}</div>
              {listing.regular_price != null && listing.regular_price > 0 && (
                <div className="mt-0.5 text-xs text-[var(--muted)]">
                  Reg. ${Number(listing.regular_price).toFixed(0)}
                  {savings > 0 ? ` · Save $${savings.toFixed(0)}` : ""}
                </div>
              )}
              {!isOwn && listing.status !== "pending" && (
                <div className="mt-2 flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => setShowRequest(true)}
                    disabled={hasRequested}
                    className="btn-navy px-4 py-1.5 text-sm font-medium disabled:bg-slate-300"
                  >
                    {requestLabel}
                  </button>
                  {hasRequested && (
                    <Link
                      href="/my-requests"
                      className="text-xs font-medium text-[var(--gold-muted)] hover:underline"
                    >
                      View status
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      {showRequest && (
        <RequestModal listing={listing} onClose={() => setShowRequest(false)} />
      )}
    </>
  );
}
