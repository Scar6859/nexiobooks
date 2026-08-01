"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <h2 className="text-xl font-bold text-[var(--foreground)]">Something went wrong</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="btn-navy mt-6 px-6 py-2.5 text-sm"
      >
        Try again
      </button>
    </div>
  );
}
