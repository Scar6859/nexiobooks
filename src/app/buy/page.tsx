import BookBrowse from "@/components/BookBrowse";
import { resolveIsAdmin } from "@/lib/auth";
import {
  attachSellers,
  fetchSellerProfiles,
  normalizeListings,
} from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";
import type { ListingRequest } from "@/lib/types";

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
  let requestStatusByListingId: Record<string, ListingRequest["status"]> = {};

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    isAdmin = resolveIsAdmin(
      user.email,
      profile &&
        typeof profile === "object" &&
        "is_admin" in profile
        ? Boolean((profile as { is_admin?: boolean }).is_admin)
        : false,
    );

    // Keep admin flag in sync when the column exists.
    if (isAdmin && profile && "is_admin" in profile && !profile.is_admin) {
      await supabase.from("profiles").upsert({ id: user.id, is_admin: true });
    }

    const { data: requests, error: requestsError } = await supabase
      .from("listing_requests")
      .select("listing_id, status")
      .eq("buyer_id", user.id);

    if (!requestsError && requests) {
      requestStatusByListingId = Object.fromEntries(
        requests.map((r) => [r.listing_id, r.status as ListingRequest["status"]]),
      );
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
        requestStatusByListingId={requestStatusByListingId}
        initialDonateOnly={donate === "1"}
      />
    </div>
  );
}
