"use client";

import Image from "next/image";
import { TrainFront } from "lucide-react";
import { useEffect, useState } from "react";

type HomeHeroSlideshowProps = {
  images: string[];
  alt: string;
};

export function HomeHeroSlideshow({ images, alt }: HomeHeroSlideshowProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const cleanImages = images.filter(Boolean);

  useEffect(() => {
    if (cleanImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % cleanImages.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [cleanImages.length]);

  if (!cleanImages.length) {
    return <TrainFront className="hero-media-icon relative z-10 h-40 w-40 text-white" />;
  }

  return (
    <>
      {cleanImages.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          priority={index === 0}
          sizes="(min-width: 768px) 45vw, 100vw"
          className={`hero-media-image object-cover transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      {cleanImages.length > 1 ? (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-black/50 px-3 py-2">
          {cleanImages.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 w-2.5 rounded-full transition ${index === activeIndex ? "bg-rail-red" : "bg-white/50"}`}
              aria-label={`Show home image ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
