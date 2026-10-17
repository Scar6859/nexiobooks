import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { calcListingSavings } from "@/lib/constants";
import { normalizeListings } from "@/lib/listings";
import { ArrowRight, BookOpen, Heart, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type ListingStatRow = {
  price: number | string | null;
  regular_price?: number | string | null;
  listing_type: string | null;
  available?: boolean | null;
  status?: string | null;
};

function isCountedListing(l: ListingStatRow): boolean {
  // Pending/declined submissions never count. Missing status = live (pre-migration).
  const status = l.status == null || l.status === "" ? "live" : String(l.status);
  if (status === "pending" || status === "declined") return false;
  // Missing available = still listed (pre-migration / older rows).
  if (l.available == null) return true;
  return Boolean(l.available);
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

async function fetchListingStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ListingStatRow[]> {
  // Prefer select("*") — unlike an explicit column list, this succeeds when
  // status/available/regular_price haven't been migrated yet and still returns
  // whichever of those columns do exist (so savings aren't silently zeroed).
  const full = await supabase.from("listings").select("*");
  if (!full.error) {
    return normalizeListings(full.data).map((row) => ({
      price: row.price,
      regular_price: row.regular_price,
      listing_type: row.listing_type,
      available: row.available,
      status: row.status,
    }));
  }

  // Keep regular_price in the fallback (the old path dropped it → $0 savings).
  const withRegular = await supabase
    .from("listings")
    .select("price, regular_price, listing_type");
  if (!withRegular.error) {
    const rows = (withRegular.data ?? []) as unknown as ListingStatRow[];
    return rows.map((row) => ({
      price: row.price ?? null,
      regular_price: row.regular_price ?? null,
      listing_type: row.listing_type ?? null,
      available: null,
      status: null,
    }));
  }

  const basic = await supabase.from("listings").select("price, listing_type");
  if (!basic.error) {
    const rows = (basic.data ?? []) as unknown as ListingStatRow[];
    return rows.map((row) => ({
      price: row.price ?? null,
      regular_price: null,
      listing_type: row.listing_type ?? null,
      available: null,
      status: null,
    }));
  }

  console.error("fetchListingStats failed", full.error);
  return [];
}

async function getStats() {
  const supabase = await createClient();
  const listings = await fetchListingStats(supabase);
  const counted = listings.filter(isCountedListing);

  const books = counted.length;
  const donations = counted.filter((l) => l.listing_type === "donate").length;
  const savings = counted.reduce((sum, l) => {
    return (
      sum +
      calcListingSavings(
        toNumber(l.regular_price),
        toNumber(l.price),
        l.listing_type as "sell" | "donate",
      )
    );
  }, 0);

  return { books, donations, savings: Math.round(savings) };
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div>
      <section className="relative isolate flex min-h-[calc(100vh-4.5rem)] items-center overflow-hidden">
        <Image
          src="/brand/hero-books.jpg"
          alt="Stacks of books in warm library light"
          fill
          priority
          className="animate-fade-in object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[var(--navy)]/78" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy)] via-[var(--navy)]/40 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-28">
          <p className="animate-fade-up font-display text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            NEXIO<span className="text-[var(--gold)]">BOOKS</span>
          </p>
          <h1 className="animate-fade-up-delay mt-5 max-w-2xl text-2xl font-medium leading-snug text-white/95 sm:text-3xl lg:text-4xl">
            Turning old books into new opportunities.
          </h1>
          <p className="animate-fade-up-delay mt-5 max-w-xl text-base text-white/75 sm:text-lg">
            Buy, sell, and donate used AP, Regents, SAT, and ACT prep materials within trusted
            school communities.
          </p>
          <div className="animate-fade-up-delay-2 mt-10 flex flex-wrap gap-4">
            <Link href="/buy" className="btn-gold inline-flex items-center gap-2">
              Browse Books
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/sell" className="btn-ghost">
              List a Book
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[var(--background)] py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <BookOpen className="mx-auto h-6 w-6 text-[var(--gold-muted)]" />
              <div className="mt-3 font-display text-4xl font-semibold text-[var(--foreground)]">
                {stats.books}
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">Books listed</div>
            </div>
            <div className="text-center">
              <ShieldCheck className="mx-auto h-6 w-6 text-[var(--gold-muted)]" />
              <div className="mt-3 font-display text-4xl font-semibold text-[var(--foreground)]">
                ${stats.savings.toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">Estimated savings</div>
            </div>
            <div className="text-center">
              <Heart className="mx-auto h-6 w-6 text-[var(--gold-muted)]" />
              <div className="mt-3 font-display text-4xl font-semibold text-[var(--foreground)]">
                {stats.donations}
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">Donations</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--surface)] py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
          <h2 className="font-display text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">
            Study smarter. Waste less.
          </h2>
          <p className="mt-4 text-base text-[var(--muted)] sm:text-lg">
            NEXIOBOOKS gives every study guide a second life — making exam prep more affordable,
            sustainable, and accessible for students nearby.
          </p>
        </div>
      </section>
    </div>
  );
}
