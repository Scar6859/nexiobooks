import type { SupabaseClient } from "@supabase/supabase-js";
import type { Listing, ListingWithSeller, Profile } from "@/lib/types";

const MAX_IMAGES = 4;

export const LISTING_SCHEMA_MESSAGE =
  "Your database is missing listing columns. Open supabase/fix-live-schema.sql in the Supabase SQL Editor for project qbjicdrathvdgphzwogk, run it, then try again.";

type ListingRow = Record<string, unknown> & {
  image_url?: string | null;
  image_urls?: string[] | null;
  video_url?: string | null;
};

export function normalizeImageUrls(
  urls: string[] | null | undefined,
): string[] {
  return (urls ?? []).filter(Boolean).slice(0, MAX_IMAGES);
}

/** Map legacy `image_url` rows onto the modern Listing shape. */
export function normalizeListing(row: ListingRow): Listing {
  const fromArray = normalizeImageUrls(row.image_urls);
  const image_urls =
    fromArray.length > 0
      ? fromArray
      : normalizeImageUrls(row.image_url ? [row.image_url] : []);

  const regularRaw = (row as { regular_price?: unknown }).regular_price;
  const regular_price =
    regularRaw == null || regularRaw === ""
      ? null
      : Number(regularRaw);

  return {
    ...(row as unknown as Listing),
    image_urls,
    video_url: (row.video_url as string | null | undefined) ?? null,
    regular_price:
      regular_price != null && !Number.isNaN(regular_price) ? regular_price : null,
  };
}

export function normalizeListings(rows: ListingRow[] | null | undefined): Listing[] {
  return (rows ?? []).map(normalizeListing);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "";
}

export function isMissingListingColumnError(err: unknown): boolean {
  const message = getErrorMessage(err);
  return /image_urls|video_url|regular_price|schema cache|column .* does not exist/i.test(
    message,
  );
}

type SaveListingInput = {
  userId?: string;
  title: string;
  topic: string;
  condition: string;
  listing_type: "sell" | "donate";
  price: number | null;
  regular_price: number;
  location: string;
  note: string | null;
  image_urls: string[];
  video_url?: string | null;
  seller_initials: string;
  includeVideo: boolean;
};

async function writeListing(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
  existingId?: string,
) {
  if (existingId) {
    return supabase.from("listings").update(row).eq("id", existingId);
  }
  return supabase.from("listings").insert(row);
}

/** Insert/update with modern columns, falling back to legacy `image_url`. */
export async function saveListing(
  supabase: SupabaseClient,
  input: SaveListingInput,
  existingId?: string,
): Promise<void> {
  const image_urls = normalizeImageUrls(input.image_urls);
  if (image_urls.length < 1) {
    throw new Error("Add at least one photo of the book.");
  }
  if (
    input.regular_price == null ||
    Number.isNaN(input.regular_price) ||
    input.regular_price <= 0
  ) {
    throw new Error("Enter the book's regular retail price.");
  }
  if (
    input.listing_type === "sell" &&
    input.price != null &&
    input.regular_price < input.price
  ) {
    throw new Error("Regular price should be at least your listing price.");
  }

  const base = {
    title: input.title,
    topic: input.topic,
    condition: input.condition,
    listing_type: input.listing_type,
    price: input.price,
    regular_price: input.regular_price,
    location: input.location,
    note: input.note,
    seller_initials: input.seller_initials,
    ...(existingId ? {} : { user_id: input.userId }),
  };

  const modern: Record<string, unknown> = {
    ...base,
    image_urls,
  };
  if (input.includeVideo) {
    modern.video_url = input.video_url ?? null;
  }

  const modernResult = await writeListing(supabase, modern, existingId);
  if (!modernResult.error) return;

  if (!isMissingListingColumnError(modernResult.error)) {
    throw modernResult.error;
  }

  if (input.includeVideo && input.video_url) {
    throw new Error(LISTING_SCHEMA_MESSAGE);
  }

  // Legacy schema: singular image_url (+ optional book_type), no image_urls/video_url.
  const legacy: Record<string, unknown> = {
    ...base,
    image_url: image_urls[0] ?? "",
  };

  let legacyResult = await writeListing(supabase, legacy, existingId);
  if (
    legacyResult.error &&
    /book_type/i.test(getErrorMessage(legacyResult.error))
  ) {
    legacyResult = await writeListing(
      supabase,
      { ...legacy, book_type: input.topic },
      existingId,
    );
  }

  if (legacyResult.error) {
    const message = getErrorMessage(legacyResult.error);
    if (/row-level security|42501/i.test(message)) {
      throw new Error(
        "Could not save listing (permission denied). Make sure you are logged in, then run supabase/fix-live-schema.sql in the Supabase SQL Editor.",
      );
    }
    if (isMissingListingColumnError(legacyResult.error)) {
      throw new Error(LISTING_SCHEMA_MESSAGE);
    }
    throw legacyResult.error;
  }
}

export function attachSellers(
  listings: Listing[],
  profiles: Pick<Profile, "id" | "full_name" | "school">[] | null | undefined,
): ListingWithSeller[] {
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return listings.map((listing) => {
    const profile = profileMap.get(listing.user_id);
    const seller_name = profile?.full_name?.trim() || null;
    return {
      ...listing,
      seller_name,
      seller_school: profile?.school?.trim() || null,
    };
  });
}

export async function fetchSellerProfiles(
  supabase: SupabaseClient,
  listings: Listing[],
) {
  const sellerIds = [...new Set(listings.map((l) => l.user_id).filter(Boolean))];
  if (sellerIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, school")
    .in("id", sellerIds);

  if (error) {
    console.error("fetchSellerProfiles", error);
    return [];
  }

  return data ?? [];
}

export async function uploadListingImages(
  supabase: SupabaseClient,
  userId: string,
  files: File[],
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("book-images")
      .upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("book-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export async function uploadListingVideo(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<string> {
  if (!VIDEO_TYPES.includes(file.type) && !file.name.match(/\.(mp4|webm|mov)$/i)) {
    throw new Error("Please upload an MP4, WebM, or MOV video.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Video must be 50MB or smaller.");
  }

  const ext = file.name.split(".").pop() ?? "mp4";
  const path = `${userId}/videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("book-images").upload(path, file, {
    contentType: file.type || "video/mp4",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("book-images").getPublicUrl(path);
  return data.publicUrl;
}

export { MAX_IMAGES, MAX_VIDEO_BYTES };
