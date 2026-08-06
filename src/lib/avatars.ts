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
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
