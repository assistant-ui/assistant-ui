"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { hostOf, safeHref } from "../utils/href";
import { field, mono, paper } from "./surfaces";

export interface LinkPreviewProps extends Omit<
  ComponentProps<"article">,
  "children" | "title"
> {
  href: string;
  title?: string | undefined;
  description?: string | undefined;
  image?: string | undefined;
  imageAlt?: string | undefined;
  siteName?: string | undefined;
  favicon?: string | undefined;
  layout?: "card" | "compact" | undefined;
}

export function LinkPreview({
  href,
  title,
  description,
  image,
  imageAlt,
  siteName,
  favicon,
  layout = "card",
  className,
  ...props
}: LinkPreviewProps) {
  const [failedImage, setFailedImage] = useState<string | undefined>();
  const [failedFavicon, setFailedFavicon] = useState<string | undefined>();
  const safeUrl = safeHref(href);
  const host = hostOf(href);
  const site = siteName ?? host;
  const label = title ?? host ?? href;
  const hasImage = image !== undefined && image !== "" && failedImage !== image;
  const hasFavicon =
    favicon !== undefined && favicon !== "" && failedFavicon !== favicon;

  const imageFrame = hasImage ? (
    <div
      data-slot="link-preview-image"
      className={cn(
        field,
        "relative shrink-0 overflow-hidden",
        layout === "card" ? "aspect-video w-full" : "size-16",
      )}
    >
      <img
        src={image}
        alt={imageAlt ?? ""}
        className="size-full object-cover"
        onError={() => setFailedImage(image)}
      />
    </div>
  ) : null;

  return (
    <article
      data-slot="link-preview"
      data-layout={layout}
      className={cn(
        paper,
        "focus-within:ring-foreground/20 relative flex w-full max-w-sm overflow-hidden rounded-2xl transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none focus-within:ring-1 hover:-translate-y-px motion-reduce:transition-none",
        layout === "card" ? "flex-col" : "items-stretch",
        className,
      )}
      {...props}
    >
      {imageFrame}
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {hasFavicon ? (
            <img
              data-slot="link-preview-favicon"
              src={favicon}
              alt=""
              className="size-4 shrink-0 rounded-sm object-cover"
              onError={() => setFailedFavicon(favicon)}
            />
          ) : (
            <span
              aria-hidden
              data-slot="link-preview-site-initial"
              className={cn(
                field,
                "text-foreground/45 flex size-4 shrink-0 items-center justify-center rounded-sm text-[9px] font-medium",
              )}
            >
              {site?.charAt(0).toUpperCase() ?? "?"}
            </span>
          )}
          {site ? (
            <span className={cn(mono, "text-foreground/40 truncate")}>
              {site}
            </span>
          ) : null}
        </div>
        {safeUrl ? (
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/90 line-clamp-2 text-[13.5px] leading-5 font-medium after:absolute after:inset-0 after:z-10"
          >
            {label}
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <span className="text-foreground/90 line-clamp-2 text-[13.5px] leading-5 font-medium">
            {label}
          </span>
        )}
        {description ? (
          <span className="text-foreground/50 line-clamp-2 text-xs leading-relaxed">
            {description}
          </span>
        ) : null}
      </div>
    </article>
  );
}
