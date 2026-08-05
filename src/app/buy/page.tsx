import BookBrowse from "@/components/BookBrowse";
import {
  attachSellers,
  fetchSellerProfiles,
  normalizeListings,
} from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<{ donate?: string }>;
}) {
  const { donate } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  const listings = normalizeListings(data);
  const sellerProfiles = await fetchSellerProfiles(supabase, listings);
  const listingsWithSellers = attachSellers(listings, sellerProfiles);

  let isAdmin = false;
  let requestedListingIds: string[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    isAdmin = Boolean(
      profile &&
        typeof profile === "object" &&
        "is_admin" in profile &&
        (profile as { is_admin?: boolean }).is_admin,
    );

    const { data: requests, error: requestsError } = await supabase
      .from("listing_requests")
      .select("listing_id")
      .eq("buyer_id", user.id);

    if (!requestsError) {
      requestedListingIds = requests?.map((r) => r.listing_id) ?? [];
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">
          Browse Books
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Find affordable AP, Regents, SAT, and ACT prep materials near you.
        </p>
      </div>
      <BookBrowse
        listings={listingsWithSellers}
        currentUserId={user?.id}
        isAdmin={isAdmin}
        requestedListingIds={requestedListingIds}
        initialDonateOnly={donate === "1"}
      />
    </div>
  );
}
