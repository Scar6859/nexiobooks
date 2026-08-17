import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { calcListingSavings } from "@/lib/constants";
import { ArrowRight, BookOpen, Heart, ShieldCheck } from "lucide-react";

async function getStats() {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("price, regular_price, listing_type, available, status");

  const live =
    listings?.filter(
      (l) =>
        (l.available ?? true) &&
        (l.status == null || l.status === "live"),
    ) ?? [];
  const books = live.length;
  const donations = live.filter((l) => l.listing_type === "donate").length;
  const savings =
    live.reduce((sum, l) => {
      return (
        sum +
        calcListingSavings(
          l.regular_price == null ? null : Number(l.regular_price),
          l.price == null ? null : Number(l.price),
          l.listing_type as "sell" | "donate",
        )
      );
    }, 0) ?? 0;

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
                ${stats.savings}
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
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/buy?donate=1" className="btn-primary">
              Find donations
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--gold)] hover:text-[var(--gold-muted)]"
            >
              About us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
