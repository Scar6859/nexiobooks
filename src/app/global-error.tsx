"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f0f9f4] font-sans antialiased">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
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
      </body>
    </html>
  );
}
