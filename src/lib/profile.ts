import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/auth";

export function initialsFromName(fullName: string): string {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "??";
}

function metaString(
  metadata: User["user_metadata"],
  key: string,
): string {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Creates/updates the public profile from auth user_metadata.
 * Needed because signup with email confirmation has no session, so the
 * initial profiles upsert is blocked by RLS.
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const fullName = metaString(user.user_metadata, "full_name");
  const school = metaString(user.user_metadata, "school");
  const phone = metaString(user.user_metadata, "phone");
  const initials = fullName ? initialsFromName(fullName) : "";

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, full_name, school, initials, phone, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const payload: {
    id: string;
    full_name?: string;
    school?: string;
    initials?: string;
    phone?: string;
    is_admin?: boolean;
  } = { id: user.id };

  if (fullName && !existing?.full_name) payload.full_name = fullName;
  if (school && !existing?.school) payload.school = school;
  if (phone && !existing?.phone) payload.phone = phone;
  if (initials && !existing?.initials) payload.initials = initials;
  if (user.email && isAdminEmail(user.email)) payload.is_admin = true;

  if (!existing || Object.keys(payload).length > 1) {
    let { error } = await supabase.from("profiles").upsert(payload);
    if (error && payload.phone) {
      delete payload.phone;
      ({ error } = await supabase.from("profiles").upsert(payload));
    }
    if (error && payload.is_admin) {
      delete payload.is_admin;
      await supabase.from("profiles").upsert(payload);
    }
  }
}
