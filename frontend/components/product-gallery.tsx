"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useCallback } from "react";
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

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, handlePrev, handleNext]);

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
    <div className="space-y-3.5">
      {/* Main Showcase Stage */}
      <div className="group relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-2xl transition-all duration-300">
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
            className="relative h-full w-full cursor-zoom-in"
          >
            <Image
              src={activeItem.url}
              alt={activeItem.title}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
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
              className="absolute right-3.5 top-3.5 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition-all duration-200 hover:bg-rail-amber hover:text-black hover:scale-105 shadow-md"
            >
              <Expand size={14} />
              <span>Fullscreen</span>
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
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/60 p-2 text-white/80 opacity-0 backdrop-blur-md transition-all duration-200 group-hover:opacity-100 hover:bg-white hover:text-black hover:scale-110"
              aria-label="Previous screenshot"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/60 p-2 text-white/80 opacity-0 backdrop-blur-md transition-all duration-200 group-hover:opacity-100 hover:bg-white hover:text-black hover:scale-110"
              aria-label="Next screenshot"
            >
              <ChevronRight size={20} />
            </button>
          </>
        ) : null}

        {/* Simulator & Status Badges */}
        <div className="pointer-events-none absolute bottom-3.5 left-3.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md border border-white/15 bg-black/80 px-2.5 py-1 font-semibold uppercase tracking-wider text-slate-200 backdrop-blur-md shadow-md">
            {asset.simulator_type.replace("_", " ")}
          </span>
          <span className="rounded-md border border-white/15 bg-black/80 px-2.5 py-1 font-semibold text-slate-300 backdrop-blur-md shadow-md">
            {asset.file_size}
          </span>
          <span className="rounded-md bg-rail-red px-2.5 py-1 font-extrabold text-white shadow-md">
            {asset.is_upcoming ? "Coming soon" : asset.is_free ? "Free Download" : `INR ${asset.price}`}
          </span>
        </div>

        {/* Media counter indicator */}
        <div className="pointer-events-none absolute bottom-3.5 right-3.5 rounded-md bg-black/75 border border-white/10 px-2.5 py-1 text-[11px] font-mono font-medium text-slate-300 backdrop-blur-md">
          {activeIndex + 1} / {items.length}
        </div>
      </div>

      {/* Thumbnail Carousel Strip */}
      {items.length > 1 ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-white/10">
          {items.map((item, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`group relative flex-shrink-0 aspect-video w-24 sm:w-28 overflow-hidden rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? "border-rail-amber ring-2 ring-rail-amber/60 scale-105 shadow-md shadow-rail-amber/20"
                    : "border-white/10 opacity-70 hover:opacity-100 hover:border-white/30"
                }`}
              >
                {item.type === "video" ? (
                  <div className="flex h-full w-full items-center justify-center bg-purple-950/80 text-purple-300">
                    <Play size={20} className="fill-purple-300" />
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[9px] font-bold text-white uppercase">
                      Video
                    </span>
                  </div>
                ) : (
                  <Image
                    src={item.url}
                    alt={item.title}
                    fill
                    sizes="120px"
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
      ) : null}

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && !isVideo ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Top Bar Controls */}
          <div
            className="absolute top-4 left-4 right-4 flex items-center justify-between z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-mono text-white backdrop-blur-md">
                {activeIndex + 1} / {items.length}
              </span>
              <p className="text-sm font-semibold text-slate-200 hidden sm:block truncate max-w-md">
                {activeItem.title}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="flex items-center justify-center h-10 w-10 rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-rail-red hover:border-rail-red hover:scale-110"
              aria-label="Close fullscreen preview"
            >
              <X size={20} />
            </button>
          </div>

          {/* Centered Large Image */}
          <div
            className="relative max-h-[82vh] max-w-[92vw] aspect-video w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeItem.url}
              alt={activeItem.title}
              fill
              priority
              sizes="100vw"
              className="object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Lightbox Navigation Arrows */}
          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 flex items-center justify-center h-12 w-12 rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-white hover:text-black hover:scale-110 shadow-lg"
                aria-label="Previous image"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 flex items-center justify-center h-12 w-12 rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-white hover:text-black hover:scale-110 shadow-lg"
                aria-label="Next image"
              >
                <ChevronRight size={28} />
              </button>
            </>
          ) : null}

          {/* Bottom Thumbnails inside Lightbox */}
          {items.length > 1 ? (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex max-w-[90vw] items-center gap-2 overflow-x-auto p-2 rounded-xl bg-black/70 border border-white/15 backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`relative flex-shrink-0 aspect-video w-16 sm:w-20 overflow-hidden rounded-md border transition ${
                    idx === activeIndex
                      ? "border-rail-amber ring-2 ring-rail-amber/70 scale-105"
                      : "border-white/10 opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image src={item.url} alt={item.title} fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
