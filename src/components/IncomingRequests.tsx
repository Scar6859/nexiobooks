"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ListingRequestWithBuyer } from "@/lib/types";

const STATUS_OPTIONS = ["pending", "accepted", "declined", "completed"] as const;

export default function IncomingRequests({
  requests,
}: {
  requests: ListingRequestWithBuyer[];
}) {
  const router = useRouter();
  const supabase = createClient();

  if (requests.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">
        No requests yet. When someone requests your books, they&apos;ll show up here.
      </p>
    );
  }

  async function updateStatus(id: string, status: (typeof STATUS_OPTIONS)[number]) {
    const { error } = await supabase
      .from("listing_requests")
      .update({ status })
      .eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div
          key={req.id}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-[var(--foreground)]">
                {req.buyer?.full_name ?? req.buyer?.initials ?? "Student"}
                {req.buyer?.school && (
                  <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                    · {req.buyer.school}
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                Re: {req.listing?.title ?? "Listing"}
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                req.status === "pending"
                  ? "bg-amber-100 text-amber-800"
                  : req.status === "accepted"
                    ? "bg-[var(--gold)]/15 text-[var(--foreground)]"
                    : "bg-[var(--surface-2)] text-[var(--muted)]"
              }`}
            >
              {req.status}
            </span>
          </div>
          <p className="mt-3 text-sm text-[var(--foreground)]">{req.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUS_OPTIONS.filter((s) => s !== req.status).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => updateStatus(req.id, status)}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium capitalize text-[var(--muted)] hover:border-[var(--gold-muted)] hover:text-[var(--gold-muted)]"
              >
                Mark {status}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
