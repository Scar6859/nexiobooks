import ListingForm from "@/components/ListingForm";
import SellHandoffInfo from "@/components/SellHandoffInfo";
import { resolveIsAdmin } from "@/lib/auth";
import { SCHOOLS } from "@/lib/constants";
import { ensureUserProfile, initialsFromName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function SellPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <SellHandoffInfo />;
  }

  await ensureUserProfile(supabase, user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, initials, is_admin, school")
    .eq("id", user.id)
    .maybeSingle();

  const typedProfile = profile as Pick<
    Profile,
    "full_name" | "initials" | "is_admin" | "school"
  > | null;
  const isAdmin = resolveIsAdmin(user.email, typedProfile?.is_admin);

  const sellerInitials =
    typedProfile?.initials ||
    (typedProfile?.full_name
      ? initialsFromName(typedProfile.full_name)
      : null) ||
    "??";

  if (!isAdmin) {
    const defaultLocation = SCHOOLS.find(
      (s) => s.toLowerCase() === (typedProfile?.school ?? "").toLowerCase(),
    );
    return (
      <SellHandoffInfo
        loggedIn
        userId={user.id}
        sellerInitials={sellerInitials}
        defaultLocation={defaultLocation}
      />
    );
  }

  if (typedProfile && !typedProfile.is_admin) {
    await supabase.from("profiles").upsert({ id: user.id, is_admin: true });
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <ListingForm userId={user.id} sellerInitials={sellerInitials} />
    </div>
  );
}
