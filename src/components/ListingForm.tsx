"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CONDITIONS,
  TOPICS,
  SCHOOLS,
  MAX_LISTINGS_PER_USER,
  LISTING_FEE_RATE,
  calcListingFee,
  formatListingFee,
} from "@/lib/constants";
import { LISTING_LIMIT_MESSAGE, MAX_IMAGES, normalizeImageUrls, uploadListingImages } from "@/lib/listings";
import type { Listing } from "@/lib/types";
import FancySelect from "./FancySelect";
import { ImagePlus, X } from "lucide-react";

type ListingFormProps = {
  userId: string;
  sellerInitials: string;
  listing?: Listing;
  listingCount?: number;
};

export default function ListingForm({ userId, sellerInitials, listing, listingCount = 0 }: ListingFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = Boolean(listing);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listingType, setListingType] = useState<"sell" | "donate">(
    listing?.listing_type ?? "sell"
  );
  const [existingUrls, setExistingUrls] = useState<string[]>(
    normalizeImageUrls(listing?.image_urls)
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [priceInput, setPriceInput] = useState(
    listing?.price != null ? String(listing.price) : ""
  );

  const totalImages = existingUrls.length + newFiles.length;
  const priceNumber = priceInput === "" ? null : Number(priceInput);
  const listingFee =
    listingType === "sell" && priceNumber != null && !Number.isNaN(priceNumber)
      ? calcListingFee(priceNumber)
      : 0;

  function onFilesSelected(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_IMAGES - totalImages;
    const picked = Array.from(files).slice(0, remaining);
    if (picked.length === 0) return;

    setNewFiles((prev) => [...prev, ...picked]);
    setPreviews((prev) => [
      ...prev,
      ...picked.map((f) => URL.createObjectURL(f)),
    ]);
  }

  function removeExisting(url: string) {
    setExistingUrls((prev) => prev.filter((u) => u !== url));
  }

  function removeNew(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "");
    const topic = String(form.get("topic") ?? "");
    const condition = String(form.get("condition") ?? "");
    const location = String(form.get("location") ?? "");
    const note = String(form.get("note") ?? "");
    const priceRaw = String(form.get("price") ?? "");
    const price =
      listingType === "donate" ? null : priceRaw ? Number(priceRaw) : null;

    try {
      const uploaded = await uploadListingImages(supabase, userId, newFiles);
      const image_urls = [...existingUrls, ...uploaded].slice(0, MAX_IMAGES);

      const payload = {
        title,
        topic,
        condition,
        listing_type: listingType,
        price,
        location,
        note: note || null,
        image_urls,
        seller_initials: sellerInitials,
      };

      if (isEdit && listing) {
        const { error: updateError } = await supabase
          .from("listings")
          .update(payload)
          .eq("id", listing.id);

        if (updateError) throw updateError;
        router.push("/my-listings");
      } else {
        if (listingCount >= MAX_LISTINGS_PER_USER) {
          throw new Error(LISTING_LIMIT_MESSAGE);
        }

        const { error: insertError } = await supabase.from("listings").insert({
          user_id: userId,
          ...payload,
        });

        if (insertError) throw insertError;
        router.push("/buy");
      }

      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(
        message.includes("Listing limit") || message.includes("listing limit")
          ? LISTING_LIMIT_MESSAGE
          : message
      );
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          {isEdit ? "Edit listing" : "List a book"}
        </h2>
        <p className="text-sm text-[var(--muted)]">
          {isEdit
            ? "Update your listing details and photos."
            : `Create a listing for your study materials. (${listingCount}/${MAX_LISTINGS_PER_USER} used)`}
        </p>
      </div>

      <input
        name="title"
        required
        defaultValue={listing?.title}
        placeholder="Book title"
        className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
      />

      <FancySelect
        name="topic"
        label="Subject / exam"
        required
        defaultValue={listing?.topic ?? TOPICS[0]}
        options={TOPICS}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FancySelect
          name="condition"
          label="Condition"
          required
          defaultValue={listing?.condition ?? CONDITIONS[1]}
          options={CONDITIONS}
        />

        <FancySelect
          label="Listing type"
          value={listingType}
          onChange={(v) => setListingType(v as "sell" | "donate")}
          options={[
            { value: "sell", label: "Sell" },
            { value: "donate", label: "Donate" },
          ]}
        />
      </div>

      {listingType === "sell" && (
        <div className="space-y-2">
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="Price"
            className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
          />
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-[var(--foreground)]">
                Listing fee ({Math.round(LISTING_FEE_RATE * 100)}%)
              </span>
              <span className="text-base font-semibold text-[var(--gold-muted)]">
                {formatListingFee(priceNumber)}
              </span>
            </div>
            <p className="mt-1.5 text-[var(--muted)]">
              Listing fee payments are collected when you hand the book over to us.
            </p>
            {listingFee > 0 && priceNumber != null && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                On a ${Number(priceNumber).toFixed(2)} book, you keep $
                {(Number(priceNumber) - listingFee).toFixed(2)} after the fee.
              </p>
            )}
          </div>
        </div>
      )}

      <FancySelect
        name="location"
        label="Pickup school"
        required
        defaultValue={
          SCHOOLS.find(
            (s) => s.toLowerCase() === (listing?.location ?? "").toLowerCase()
          ) ?? SCHOOLS[0]
        }
        options={SCHOOLS}
      />

      <textarea
        name="note"
        rows={3}
        defaultValue={listing?.note ?? ""}
        placeholder="Short note about condition or what's included"
        className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Photos ({totalImages}/{MAX_IMAGES})
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {existingUrls.map((url) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeExisting(url)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {previews.map((url, i) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeNew(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {totalImages < MAX_IMAGES && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--gold-muted)] hover:text-[var(--gold-muted)]">
              <ImagePlus className="h-6 w-6" />
              <span className="mt-1 text-xs font-medium">Add photo</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onFilesSelected(e.target.files)}
              />
            </label>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-full border border-[var(--border)] py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-navy flex-1 py-3 text-sm disabled:opacity-60"
        >
          {loading ? "Saving..." : isEdit ? "Save changes" : "Add listing"}
        </button>
      </div>
    </form>
  );
}
