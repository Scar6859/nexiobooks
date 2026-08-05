"use client";

import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import { normalizeImageUrls } from "@/lib/listings";

export default function ImageGallery({
  urls,
  videoUrl,
  alt,
  compact = false,
}: {
  urls: string[];
  videoUrl?: string | null;
  alt: string;
  compact?: boolean;
}) {
  const images = normalizeImageUrls(urls);
  const hasVideo = Boolean(videoUrl);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const heightClass = compact ? "h-36" : "h-48";

  if (images.length === 0 && !hasVideo) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold-muted)] ${heightClass}`}
      >
        <BookOpen className="h-8 w-8" />
      </div>
    );
  }

  const prev = () => setActive((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setActive((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <>
      <div>
        <div
          className={`group relative w-full overflow-hidden rounded-xl bg-[var(--surface-2)] ${heightClass}`}
        >
          {showVideo && videoUrl ? (
            <video
              src={videoUrl}
              controls
              playsInline
              className="h-full w-full object-contain bg-black"
            />
          ) : images.length > 0 ? (
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="block h-full w-full"
              aria-label={`View photos of ${alt}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[active]}
                alt={alt}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          ) : (
            <video
              src={videoUrl!}
              controls
              playsInline
              className="h-full w-full object-contain bg-black"
            />
          )}

          {!showVideo && images.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--surface)]/90 text-[var(--foreground)] shadow hover:bg-[var(--surface)]"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--surface)]/90 text-[var(--foreground)] shadow hover:bg-[var(--surface)]"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
                {active + 1}/{images.length}
              </span>
            </>
          )}
        </div>

        {(images.length > 1 || hasVideo) && (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {images.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => {
                  setShowVideo(false);
                  setActive(i);
                }}
                className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 ${
                  !showVideo && i === active
                    ? "border-[var(--gold-muted)]"
                    : "border-transparent opacity-70"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            {hasVideo && (
              <button
                type="button"
                onClick={() => setShowVideo(true)}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 bg-black text-[10px] font-semibold text-white ${
                  showVideo || images.length === 0
                    ? "border-[var(--gold-muted)]"
                    : "border-transparent opacity-70"
                }`}
                aria-label="Play listing video"
              >
                Video
              </button>
            )}
          </div>
        )}
      </div>

      {lightbox && images.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 rounded-full bg-[var(--surface)]/10 p-2 text-white hover:bg-[var(--surface)]/20"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[active]}
            alt={alt}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
