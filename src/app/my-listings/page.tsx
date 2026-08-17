import Link from "next/link";
import { redirect } from "next/navigation";
import BookCard from "@/components/BookCard";
import IncomingRequests from "@/components/IncomingRequests";
import PendingSubmissions from "@/components/PendingSubmissions";
import { createClient } from "@/lib/supabase/server";
import { resolveIsAdmin } from "@/lib/auth";
import { attachSellers, fetchSellerProfiles, normalizeListings } from "@/lib/listings";
import type { ListingRequestWithBuyer, Profile } from "@/lib/types";

export default async function MyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/my-listings");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const typedListings = normalizeListings(listings);
  const listingIds = typedListings.map((l) => l.id);

  let requests: ListingRequestWithBuyer[] = [];
  if (listingIds.length > 0) {
    const { data: rawRequests, error: requestsError } = await supabase
      .from("listing_requests")
      .select("*, listings(title)")
      .in("listing_id", listingIds)
      .order("created_at", { ascending: false });

    if (!requestsError && rawRequests) {
      const buyerIds = [...new Set(rawRequests.map((r) => r.buyer_id))];
      const { data: buyers } = buyerIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, school, initials")
            .in("id", buyerIds)
        : { data: [] };

      const buyerMap = new Map((buyers ?? []).map((b) => [b.id, b]));

      requests = rawRequests.map((r) => ({
        ...r,
        buyer: buyerMap.get(r.buyer_id) ?? null,
        listing: r.listings as { title: string } | null,
      }));
    }
  }

  const typedProfile = profile as Profile | null;
  const isAdmin = resolveIsAdmin(user.email, typedProfile?.is_admin);

  const liveListings = typedListings.filter(
    (l) => (l.status ?? "live") === "live",
  );
  const ownPending = typedListings.filter((l) => l.status === "pending");

  let pendingForAdmin = normalizeListings([]);
  if (isAdmin) {
    const { data: pendingRows } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    pendingForAdmin = normalizeListings(pendingRows);
  }

  const pendingWithSellers = attachSellers(
    pendingForAdmin,
    await fetchSellerProfiles(supabase, pendingForAdmin),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">My Listings</h1>
          <p className="mt-2 text-[var(--muted)]">
            Manage your books and respond to buyer requests.
          </p>
        </div>
        <Link
          href="/sell"
          className="btn-navy px-6 py-2.5 text-sm"
        >
          List a book
        </Link>
      </div>

      {isAdmin && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">
            Pending submissions ({pendingWithSellers.length})
          </h2>
          <PendingSubmissions listings={pendingWithSellers} adminId={user.id} />
        </section>
      )}

      {!isAdmin && ownPending.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">
            Waiting for admin ({ownPending.length})
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Message your school admin to arrange a time to hand the book over.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownPending.map((listing) => (
              <BookCard
                key={listing.id}
                listing={listing}
                isOwn
              />
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">
          Incoming requests ({requests.filter((r) => r.status === "pending").length})
        </h2>
        <IncomingRequests requests={requests} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">
          Your listings ({liveListings.length})
        </h2>
        {liveListings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]">
            You haven&apos;t listed any books yet.{" "}
            <Link href="/sell" className="font-semibold text-[var(--gold-muted)] hover:underline">
              Create your first listing
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveListings.map((listing) => (
              <BookCard
                key={listing.id}
                listing={listing}
                isOwn
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
