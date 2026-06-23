"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  gradient: string;
  label?: string | undefined;
  className?: string | undefined;
  src?: string | undefined;
  previewUrl?: string | undefined;
};

export function Thumbnail({
  gradient,
  label,
  className,
  src,
  previewUrl,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const showImage = src && !imgFailed;
  const showPreviewFrame = !showImage && previewUrl && isNearViewport;

  useEffect(() => {
    if (!previewUrl || showImage) return;
    const el = rootRef.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: "500px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [previewUrl, showImage]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden rounded-md bg-gradient-to-br",
        gradient,
        className,
      )}
    >
      {showImage ? (
        // biome-ignore lint/performance/noImgElement: Template thumbnails may be generated preview images.
        <img
          src={src}
          alt={label ?? ""}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : showPreviewFrame ? (
        <>
          <iframe
            src={previewUrl}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={label ? `${label} thumbnail preview` : "Template preview"}
            className="pointer-events-none absolute top-0 left-0 h-[400%] w-[400%] origin-top-left scale-25 border-0 bg-white"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/65 to-transparent" />
          {label ? (
            <div className="pointer-events-none absolute inset-0 flex items-end p-2">
              <span className="text-[10px] font-medium tracking-wider text-white/80 uppercase drop-shadow-sm">
                {label}
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_90%,rgba(0,0,0,0.25),transparent_60%)]" />
          {label ? (
            <div className="absolute inset-0 flex items-end p-2">
              <span className="text-[10px] font-medium tracking-wider text-white/70 uppercase">
                {label}
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
