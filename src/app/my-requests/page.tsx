import Link from "next/link";
import { redirect } from "next/navigation";
import ContactAdminButton from "@/components/ContactAdminButton";
import { createClient } from "@/lib/supabase/server";
import type { ListingRequest } from "@/lib/types";

type BuyerRequest = ListingRequest & {
  listing?: {
    id: string;
    title: string;
    location: string;
    listing_type: "sell" | "donate";
    price: number | null;
    seller_initials: string | null;
    user_id: string;
  } | null;
  seller_name?: string | null;
};

const STATUS_STYLES: Record<BuyerRequest["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-[var(--gold)]/15 text-[var(--foreground)]",
  declined: "bg-red-50 text-red-700",
  completed: "bg-[var(--surface-2)] text-[var(--muted)]",
};

const STATUS_HELP: Record<BuyerRequest["status"], string> = {
  pending: "Waiting for the seller to respond.",
  accepted:
    "Accepted! Message a NexioBooks admin — books go to us first, then we deliver them to you.",
  declined: "The seller declined this request.",
  completed: "This request was marked completed.",
};

export default async function MyRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/my-requests");
  }

  const { data: rawRequests, error } = await supabase
    .from("listing_requests")
    .select(
      "*, listings(id, title, location, listing_type, price, seller_initials, user_id)",
    )
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  let requests: BuyerRequest[] = [];

  if (!error && rawRequests) {
    const sellerIds = [
      ...new Set(
        rawRequests
          .map((r) => {
            const listing = r.listings as BuyerRequest["listing"] | BuyerRequest["listing"][] | null;
            const row = Array.isArray(listing) ? listing[0] : listing;
            return row?.user_id;
          })
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const { data: sellers } = sellerIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", sellerIds)
      : { data: [] };

    const sellerMap = new Map((sellers ?? []).map((s) => [s.id, s.full_name]));

    requests = rawRequests.map((r) => {
      const listingRaw = r.listings as BuyerRequest["listing"] | BuyerRequest["listing"][] | null;
      const listing = Array.isArray(listingRaw) ? listingRaw[0] : listingRaw;
      return {
        id: r.id,
        listing_id: r.listing_id,
        buyer_id: r.buyer_id,
        message: r.message,
        status: r.status,
        created_at: r.created_at,
        listing: listing ?? null,
        seller_name: listing ? sellerMap.get(listing.user_id) ?? null : null,
      };
    });
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const acceptedCount = requests.filter((r) => r.status === "accepted").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">My Requests</h1>
        <p className="mt-2 text-[var(--muted)]">
          Track books you&apos;ve asked for.{" "}
          <span className="font-medium text-[var(--foreground)]">
            {pendingCount} pending
          </span>
          {acceptedCount > 0 && (
            <>
              {" · "}
              <span className="font-medium text-[var(--foreground)]">
                {acceptedCount} accepted
              </span>
            </>
          )}
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
          Requests aren&apos;t available yet. Run{" "}
          <code className="text-[var(--foreground)]">supabase/fix-live-schema.sql</code>{" "}
          in the Supabase SQL Editor, then refresh.
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]">
          You haven&apos;t requested any books yet.{" "}
          <Link href="/buy" className="font-semibold text-[var(--gold-muted)] hover:underline">
            Browse listings
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const priceLabel =
              !req.listing ||
              req.listing.listing_type === "donate" ||
              req.listing.price == null
                ? "Free"
                : `$${Number(req.listing.price).toFixed(0)}`;

            return (
              <article
                key={req.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-[var(--foreground)]">
                      {req.listing?.title ?? "Listing unavailable"}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {req.listing?.location ?? "—"}
                      {" · "}
                      Seller:{" "}
                      {req.seller_name?.trim() || "Student"}
                      {" · "}
                      {priceLabel}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[req.status]}`}
                  >
                    {req.status}
                  </span>
                </div>

                <p className="mt-3 text-sm text-[var(--foreground)]">{req.message}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {STATUS_HELP[req.status]}
                </p>

                {(req.status === "accepted" || req.status === "completed") && (
                  <div className="mt-4">
                    <ContactAdminButton requestId={req.id} />
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                  <span>
                    Sent{" "}
                    {new Date(req.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {req.listing && (
                    <Link
                      href="/buy"
                      className="font-semibold text-[var(--gold-muted)] hover:underline"
                    >
                      Back to browse
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
