"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  gradient: string;
  label?: string | undefined;
  className?: string | undefined;
  src?: string | undefined;
};

export function Thumbnail({ gradient, label, className, src }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = src && !imgFailed;

  return (
    <div
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
