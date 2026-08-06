import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/profile";
import type { Profile } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/profile");
  }

  await ensureUserProfile(supabase, user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login?redirect=/profile");
  }

  const typed = {
    ...profile,
    phone: (profile as { phone?: string | null }).phone ?? null,
    avatar_url: (profile as { avatar_url?: string | null }).avatar_url ?? null,
  } as Profile;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">My Profile</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage your display name, phone, photo, email, and password.
        </p>
      </div>
      <ProfileForm profile={typed} email={user.email ?? ""} />
    </div>
  );
}
