import { BookOpen, Heart, School, Shield } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-4xl font-semibold text-[var(--foreground)] sm:text-5xl">
        About Nexio<span className="text-[var(--gold-muted)]">Books</span>
      </h1>
      <p className="mt-4 text-lg text-[var(--muted)]">
        Every study guide deserves a second life. NEXIOBOOKS is a student marketplace for buying,
        selling, and donating used prep books within local school communities.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {[
          {
            icon: BookOpen,
            title: "Sustainable reuse",
            text: "Reduce educational waste by keeping review books in circulation.",
          },
          {
            icon: School,
            title: "Local school communities",
            text: "Trade with students at nearby schools for easy pickup.",
          },
          {
            icon: Heart,
            title: "Pass it Forward",
            text: "Donate materials to students who cannot afford prep books.",
          },
          {
            icon: Shield,
            title: "Trusted exchanges",
            text: "Built for verified school communities and safe local meetups.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <Icon className="h-6 w-6 text-[var(--gold-muted)]" />
            <h3 className="mt-3 font-semibold text-[var(--foreground)]">{title}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-[var(--navy)] p-6 text-white">
        <h2 className="font-display text-2xl font-semibold text-[var(--gold)]">Our vision</h2>
        <p className="mt-2 text-white/80">
          To become the leading student marketplace for reused educational materials — making
          academic preparation more affordable, accessible, and sustainable.
        </p>
        <Link href="/buy" className="btn-gold mt-6 inline-block">
          Browse books
        </Link>
      </div>
    </div>
  );
}
