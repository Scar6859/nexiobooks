import Link from "next/link";
import { redirect } from "next/navigation";
import ListingForm from "@/components/ListingForm";
import { getUserListingCount, isListingLimitReached, LISTING_LIMIT_MESSAGE } from "@/lib/listings";
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

  const [{ data: profile }, listingCount] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, initials")
      .eq("id", user.id)
      .maybeSingle(),
    getUserListingCount(supabase, user.id),
  ]);

  const sellerInitials =
    profile?.initials ||
    (profile?.full_name ? initialsFromName(profile.full_name) : null) ||
    "??";
  const atLimit = isListingLimitReached(listingCount);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      {atLimit ? (
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Listing limit reached</h2>
          <p className="text-sm text-[var(--muted)]">{LISTING_LIMIT_MESSAGE}</p>
          <Link
            href="/my-listings"
            className="btn-navy inline-block px-6 py-3 text-sm"
          >
            Manage my listings
          </Link>
        </div>
      ) : (
        <ListingForm
          userId={user.id}
          sellerInitials={sellerInitials}
          listingCount={listingCount}
        />
      )}
    </div>
  );
}
