"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatListingFee } from "@/lib/constants";
import type { ListingWithSeller } from "@/lib/types";
import ImageGallery from "./ImageGallery";
import RequestModal from "./RequestModal";
import { Pencil, Trash2 } from "lucide-react";

export default function BookCard({
  listing,
  isOwn,
  isAdmin,
  hasRequested,
}: {
  listing: ListingWithSeller;
  isOwn?: boolean;
  isAdmin?: boolean;
  hasRequested?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [showRequest, setShowRequest] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage = isOwn || isAdmin;
  const priceLabel =
    listing.listing_type === "donate" || listing.price === null
      ? "Free"
      : `$${Number(listing.price).toFixed(0)}`;
  const showListingFee =
    isOwn && listing.listing_type === "sell" && listing.price != null;

  async function onDelete() {
    if (!confirm(`Remove "${listing.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("listings").delete().eq("id", listing.id);
    if (error) {
      alert(error.message);
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
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3">
            <div className="text-xs text-[var(--muted)]">
              <div>{listing.location}</div>
              <div>
                Seller:{" "}
                {isOwn
                  ? "You"
                  : listing.seller_name ?? listing.seller_initials ?? "Student"}
              </div>
              {!isOwn && listing.seller_school && (
                <div className="text-[var(--muted)]">{listing.seller_school}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[var(--gold-muted)]">{priceLabel}</div>
              {showListingFee && (
                <div className="mt-1 max-w-[11rem] text-xs text-[var(--muted)]">
                  Listing fee:{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {formatListingFee(Number(listing.price))}
                  </span>
                  <span className="mt-0.5 block leading-snug">
                    Due when you hand the book over. You get the buyer&apos;s full payment.
                  </span>
                </div>
              )}
              {!isOwn && (
                <button
                  type="button"
                  onClick={() => setShowRequest(true)}
                  disabled={hasRequested}
                  className="btn-navy mt-2 px-4 py-1.5 text-sm font-medium disabled:bg-slate-300"
                >
                  {hasRequested ? "Requested" : "Request"}
                </button>
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
