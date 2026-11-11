"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand, Play, TrainFront, X } from "lucide-react";
import type { Asset } from "@/lib/api";

type GalleryItem = {
  id: string | number;
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string;
  title: string;
};

function getYouTubeEmbedUrl(url: string) {
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube-nocookie.com/embed/${match[2]}?autoplay=1&rel=0` : url;
  } catch {
    return url;
  }
}

export function ProductGallery({ asset }: { asset: Asset }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Collect all gallery items (thumbnail, gallery images, video URLs)
  const items: GalleryItem[] = useMemo(() => {
    const list: GalleryItem[] = [];

    // Main thumbnail
    if (asset.thumbnail) {
      list.push({
        id: "main-thumb",
        type: "image",
        url: asset.thumbnail,
        title: `${asset.title} - Main Preview`,
      });
    }

    // Associated backend images
    if (asset.images && asset.images.length > 0) {
      asset.images.forEach((img, idx) => {
        if (img.image) {
          list.push({
            id: `img-${img.id || idx}`,
            type: "image",
            url: img.image,
            title: img.alt_text || `${asset.title} - View ${idx + 1}`,
          });
        }
      });
    }

    // Textarea newline screenshot URLs
    if (asset.gallery_image_urls) {
      const urls = asset.gallery_image_urls
        .split(/\r?\n/)
        .map((u) => u.trim())
        .filter(Boolean);
      urls.forEach((url, idx) => {
        list.push({
          id: `gallery-url-${idx}`,
          type: "image",
          url,
          title: `${asset.title} - Screenshot ${idx + 1}`,
        });
      });
    }

    // Video previews
    const videoUrls: string[] = [];
    if (asset.preview_video_url) videoUrls.push(asset.preview_video_url.trim());
    if (asset.media_gallery_urls) {
      asset.media_gallery_urls
        .split(/\r?\n/)
        .map((u) => u.trim())
        .filter(Boolean)
        .forEach((u) => {
          if (!videoUrls.includes(u)) videoUrls.push(u);
        });
    }

    videoUrls.forEach((vUrl, idx) => {
      list.push({
        id: `video-${idx}`,
        type: "video",
        url: vUrl,
        title: `${asset.title} - Gameplay Video Preview ${idx + 1}`,
      });
    });

    return list;
  }, [asset]);

  const activeItem = items[activeIndex] || items[0];
  const imageEntries = useMemo(
    () =>
      items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.type === "image"),
    [items]
  );
  const activeImagePos = imageEntries.findIndex(({ index }) => index === activeIndex);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  const handleLightboxPrev = useCallback(() => {
    if (imageEntries.length === 0) return;
    const pos = imageEntries.findIndex(({ index }) => index === activeIndex);
    const prevEntry = pos > 0 ? imageEntries[pos - 1] : imageEntries[imageEntries.length - 1];
    if (prevEntry) setActiveIndex(prevEntry.index);
  }, [activeIndex, imageEntries]);

  const handleLightboxNext = useCallback(() => {
    if (imageEntries.length === 0) return;
    const pos = imageEntries.findIndex(({ index }) => index === activeIndex);
    const nextEntry = pos >= 0 && pos < imageEntries.length - 1 ? imageEntries[pos + 1] : imageEntries[0];
    if (nextEntry) setActiveIndex(nextEntry.index);
  }, [activeIndex, imageEntries]);

  // Keyboard navigation & scroll lock for Lightbox
  useEffect(() => {
    if (!lightboxOpen || activeItem?.type === "video") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") handleLightboxPrev();
      if (e.key === "ArrowRight") handleLightboxNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen, activeItem?.type, handleLightboxPrev, handleLightboxNext]);

  if (items.length === 0) {
    return (
      <div className="cinematic-panel relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
        <TrainFront className="h-28 w-28 text-slate-600 animate-pulse" />
        <span className="absolute bottom-4 text-xs font-semibold text-slate-500">
          No screenshots uploaded yet
        </span>
      </div>
    );
  }

  const isVideo = activeItem.type === "video";
  const isYouTube = isVideo && (activeItem.url.includes("youtube.com") || activeItem.url.includes("youtu.be"));

  return (
    <div className="w-full min-w-0 max-w-full space-y-3">
      {/* Main Showcase Stage */}
      <div className="group relative aspect-video max-h-[420px] w-full overflow-hidden rounded-xl border border-white/10 bg-black/90 shadow-xl transition-all duration-300">
        {isVideo ? (
          <div className="relative h-full w-full bg-black">
            {isYouTube ? (
              <iframe
                src={getYouTubeEmbedUrl(activeItem.url)}
                title={activeItem.title}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={activeItem.url}
                controls
                autoPlay
                className="h-full w-full object-contain"
              >
                Your browser does not support playing this video.
              </video>
            )}
          </div>
        ) : (
          <div
            onClick={() => setLightboxOpen(true)}
            className="relative h-full w-full cursor-zoom-in overflow-hidden"
          >
            {/* Subtle blurred ambient backdrop to fill frame cleanly */}
            <Image
              src={activeItem.url}
              alt=""
              aria-hidden="true"
              fill
              sizes="150px"
              className="object-cover blur-xl opacity-35 pointer-events-none scale-110"
            />

            {/* Crisp foreground image */}
            <Image
              src={activeItem.url}
              alt={activeItem.title}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain transition-transform duration-300 group-hover:scale-[1.01]"
            />

            {/* Gradient Overlays for Badges */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* Expand / Lightbox Hover Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-white/20 bg-black/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md transition-all duration-200 hover:bg-rail-amber hover:text-black hover:border-rail-amber shadow"
            >
              <Expand size={13} />
              <span>Expand</span>
            </button>
          </div>
        )}

        {/* Quick Prev / Next overlay arrows on Main Stage (if > 1 item) */}
        {items.length > 1 ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/70 p-2 text-white/80 opacity-0 backdrop-blur-md transition-all duration-200 group-hover:opacity-100 hover:bg-white hover:text-black hover:scale-105 shadow-md"
              aria-label="Previous screenshot"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/70 p-2 text-white/80 opacity-0 backdrop-blur-md transition-all duration-200 group-hover:opacity-100 hover:bg-white hover:text-black hover:scale-105 shadow-md"
              aria-label="Next screenshot"
            >
              <ChevronRight size={18} />
            </button>
          </>
        ) : null}

        {/* Simulator & Status Badges */}
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded border border-white/15 bg-black/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-200 backdrop-blur-md shadow-md">
            {asset.simulator_type.replace("_", " ")}
          </span>
          <span className="rounded border border-white/15 bg-black/80 px-2 py-0.5 text-[11px] font-semibold text-slate-300 backdrop-blur-md shadow-md">
            {asset.file_size}
          </span>
          <span className="rounded bg-rail-red px-2 py-0.5 text-[11px] font-extrabold text-white shadow-md">
            {asset.is_upcoming ? "Coming soon" : asset.is_free ? "Free Download" : `₹${asset.price}`}
          </span>
        </div>

        {/* Media counter indicator */}
        <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/75 border border-white/10 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-300 backdrop-blur-md">
          {activeIndex + 1} / {items.length}
        </div>
      </div>

      {/* Thumbnail Carousel Strip */}
      {items.length > 1 ? (
        <div className="relative w-full min-w-0 max-w-full">
          <div className="flex w-full min-w-0 max-w-full items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-white/5">
            {items.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`group relative flex-shrink-0 aspect-video w-16 sm:w-20 overflow-hidden rounded-lg border transition-all duration-150 ${
                    isSelected
                      ? "border-rail-amber ring-2 ring-rail-amber/70 scale-105 shadow-md shadow-rail-amber/20 opacity-100"
                      : "border-white/10 opacity-60 hover:opacity-100 hover:border-white/30"
                  }`}
                >
                  {item.type === "video" ? (
                    <div className="flex h-full w-full items-center justify-center bg-purple-950/80 text-purple-300">
                      <Play size={14} className="fill-purple-300" />
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[8px] font-bold text-white uppercase">
                        Vid
                      </span>
                    </div>
                  ) : (
                    <Image
                      src={item.url}
                      alt={item.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  )}
                  {isSelected ? (
                    <div className="absolute inset-0 bg-rail-amber/10 pointer-events-none" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Fullscreen Lightbox Modal (portaled to body to stay locked to viewport) */}
      {mounted && lightboxOpen && !isVideo
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={activeItem.title}
              className="fixed inset-0 z-[9999] flex h-dvh w-screen flex-col justify-between gap-2 bg-black/95 p-3 backdrop-blur-xl sm:gap-3 sm:p-5"
              onClick={() => setLightboxOpen(false)}
            >
              {/* Top Bar Controls */}
              <div
                className="flex w-full shrink-0 items-center justify-between gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 font-mono text-xs text-white backdrop-blur-md">
                    {activeImagePos >= 0 ? activeImagePos + 1 : 1} / {imageEntries.length || items.length}
                  </span>
                  <p className="hidden max-w-xl truncate text-sm font-semibold text-slate-200 sm:block">
                    {activeItem.title}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:scale-110 hover:border-rail-red hover:bg-rail-red"
                  aria-label="Close fullscreen preview"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Centered Full-Height Stage */}
              <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
                <div
                  className="relative h-full w-full max-w-[96vw]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image
                    src={activeItem.url}
                    alt={activeItem.title}
                    fill
                    priority
                    sizes="100vw"
                    className="object-contain drop-shadow-2xl"
                  />
                </div>

                {imageEntries.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLightboxPrev();
                      }}
                      className="absolute left-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white shadow-lg transition hover:scale-110 hover:bg-white hover:text-black sm:left-4 sm:h-12 sm:w-12"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={28} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLightboxNext();
                      }}
                      className="absolute right-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white shadow-lg transition hover:scale-110 hover:bg-white hover:text-black sm:right-4 sm:h-12 sm:w-12"
                      aria-label="Next image"
                    >
                      <ChevronRight size={28} />
                    </button>
                  </>
                ) : null}
              </div>

              {/* Bottom Thumbnails inside Lightbox */}
              {imageEntries.length > 1 ? (
                <div
                  className="mx-auto flex max-w-[94vw] shrink-0 items-center gap-2 overflow-x-auto rounded-xl border border-white/15 bg-black/75 p-2 backdrop-blur-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  {imageEntries.map(({ item, index }) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`relative aspect-video w-16 flex-shrink-0 overflow-hidden rounded-md border transition sm:w-20 ${
                        index === activeIndex
                          ? "scale-105 border-rail-amber ring-2 ring-rail-amber/70"
                          : "border-white/10 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image src={item.url} alt={item.title} fill sizes="80px" className="object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
