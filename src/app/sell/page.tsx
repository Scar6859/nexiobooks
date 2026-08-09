import { redirect } from "next/navigation";
import ListingForm from "@/components/ListingForm";
import { ensureUserProfile, initialsFromName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function SellPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/sell");
  }

  await ensureUserProfile(supabase, user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, initials")
    .eq("id", user.id)
    .maybeSingle();

  const sellerInitials =
    profile?.initials ||
    (profile?.full_name ? initialsFromName(profile.full_name) : null) ||
    "??";

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <ListingForm userId={user.id} sellerInitials={sellerInitials} />
    </div>
  );
}
