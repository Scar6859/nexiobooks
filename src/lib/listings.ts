import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_LISTINGS_PER_USER } from "@/lib/constants";
import type { Listing, ListingWithSeller, Profile } from "@/lib/types";

const MAX_IMAGES = 4;

export const LISTING_LIMIT_MESSAGE = `You can list up to ${MAX_LISTINGS_PER_USER} books. Remove an existing listing to add another.`;

export function normalizeImageUrls(
  urls: string[] | null | undefined,
): string[] {
  return (urls ?? []).filter(Boolean).slice(0, MAX_IMAGES);
}

export function attachSellers(
  listings: Listing[],
  profiles: Pick<Profile, "id" | "full_name" | "school">[] | null | undefined,
): ListingWithSeller[] {
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return listings.map((listing) => {
    const profile = profileMap.get(listing.user_id);
    return {
      ...listing,
      seller_name: profile?.full_name ?? null,
      seller_school: profile?.school ?? null,
    };
  });
}

export async function fetchSellerProfiles(
  supabase: SupabaseClient,
  listings: Listing[],
) {
  const sellerIds = [...new Set(listings.map((l) => l.user_id))];
  if (sellerIds.length === 0) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, school")
    .in("id", sellerIds);

  return data ?? [];
}

export async function getUserListingCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

export function isListingLimitReached(count: number): boolean {
  return count >= MAX_LISTINGS_PER_USER;
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
