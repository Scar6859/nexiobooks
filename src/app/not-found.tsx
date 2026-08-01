import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <h2 className="text-xl font-bold text-[var(--foreground)]">Page not found</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="btn-navy mt-6 px-6 py-2.5 text-sm"
      >
        Go home
      </Link>
    </div>
  );
}
