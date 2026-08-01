"use client";

import { useMemo, useState } from "react";
import BookCard from "./BookCard";
import FancySelect from "./FancySelect";
import type { ListingWithSeller } from "@/lib/types";
import { SCHOOLS, TOPICS } from "@/lib/constants";
import { Search } from "lucide-react";

export default function BookBrowse({
  listings,
  currentUserId,
  isAdmin,
  requestedListingIds,
  initialDonateOnly = false,
}: {
  listings: ListingWithSeller[];
  currentUserId?: string;
  isAdmin?: boolean;
  requestedListingIds?: string[];
  initialDonateOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All");
  const [school, setSchool] = useState("All");
  const [donateOnly, setDonateOnly] = useState(initialDonateOnly);

  const requestedSet = useMemo(
    () => new Set(requestedListingIds ?? []),
    [requestedListingIds]
  );

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.topic.toLowerCase().includes(q);
      const matchesTopic = topic === "All" || l.topic === topic;
      const matchesSchool =
        school === "All" || l.location.toLowerCase() === school.toLowerCase();
      const matchesDonate = !donateOnly || l.listing_type === "donate";
      return matchesQuery && matchesTopic && matchesSchool && matchesDonate;
    });
  }, [listings, query, topic, school, donateOnly]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:flex-row md:items-end">
        <div className="relative flex-1">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by book or subject..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--gold)]"
            />
          </div>
        </div>
        <FancySelect
          label="School"
          value={school}
          onChange={setSchool}
          allOption="All"
          options={SCHOOLS}
          className="min-w-[12rem] md:min-w-[15rem]"
        />
        <FancySelect
          label="Subject"
          value={topic}
          onChange={setTopic}
          allOption="All"
          options={TOPICS}
          className="min-w-[10rem] md:min-w-[12rem]"
        />
        <FancySelect
          label="Listing type"
          value={donateOnly ? "donate" : "all"}
          onChange={(v) => setDonateOnly(v === "donate")}
          options={[
            { value: "all", label: "All listings" },
            { value: "donate", label: "Donations only" },
          ]}
          className="min-w-[10rem] md:min-w-[12rem]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]">
          No books match your search yet.{" "}
          <a href="/sell" className="font-semibold text-[var(--gold-muted)] hover:underline">
            List one
          </a>
          !
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((listing) => (
            <div key={listing.id} className="h-full">
              <BookCard
                listing={listing}
                isOwn={listing.user_id === currentUserId}
                isAdmin={isAdmin}
                hasRequested={requestedSet.has(listing.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
