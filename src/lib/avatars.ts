import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<string> {
  if (!AVATAR_TYPES.includes(file.type)) {
    throw new Error("Please upload a JPG, PNG, WebP, or GIF image.");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Profile photo must be 5MB or smaller.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  // Use book-images (already exists in prod). Prefer avatars bucket when present.
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const buckets = ["avatars", "book-images"] as const;

  let lastError: Error | null = null;
  for (const bucket of buckets) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }
    lastError = error;
    // Only fall through when the preferred bucket is missing.
    if (!/bucket not found|not found/i.test(error.message)) {
      throw error;
    }
  }

  throw lastError ?? new Error("Could not upload profile photo.");
}
