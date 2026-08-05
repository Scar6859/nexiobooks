import { notFound, redirect } from "next/navigation";
import ListingForm from "@/components/ListingForm";
import { resolveIsAdmin } from "@/lib/auth";
import { normalizeListing } from "@/lib/listings";
import { initialsFromName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/sell/edit/${id}`);
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (!listing) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const typedListing = normalizeListing(listing);
  const typedProfile = profile as Profile | null;
  const isOwner = typedListing.user_id === user.id;
  const isAdmin = resolveIsAdmin(user.email, typedProfile?.is_admin);

  if (!isOwner && !isAdmin) {
    redirect("/buy");
  }

  if (isAdmin && typedProfile && !typedProfile.is_admin) {
    await supabase.from("profiles").upsert({ id: user.id, is_admin: true });
  }

  const { data: ownerProfile } = isOwner
    ? { data: profile }
    : await supabase.from("profiles").select("*").eq("id", typedListing.user_id).single();

  const owner = ownerProfile as Profile | null;
  const sellerInitials =
    owner?.initials ||
    (owner?.full_name ? initialsFromName(owner.full_name) : null) ||
    typedListing.seller_initials ||
    "??";

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <ListingForm
        userId={typedListing.user_id}
        sellerInitials={sellerInitials}
        listing={typedListing}
      />
    </div>
  );
}
