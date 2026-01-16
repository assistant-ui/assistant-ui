"use client";

import { memo, type FC } from "react";
import type { SourceMessagePartComponent } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

const extractDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const Favicon: FC<{ url: string; className?: string }> = ({
  url,
  className,
}) => {
  const domain = extractDomain(url);
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      className={cn(
        "aui-source-favicon size-3.5 shrink-0 rounded-sm",
        className,
      )}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
};

const SourcesImpl: SourceMessagePartComponent = ({
  url,
  title,
  sourceType,
}) => {
  if (sourceType !== "url" || !url) return null;

  const domain = extractDomain(url);
  const displayTitle = title || domain;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "aui-source-root inline-flex cursor-pointer items-center gap-1.5",
        "rounded-md bg-muted/50 px-2 py-1 text-xs",
        "transition-colors hover:bg-muted",
        "text-muted-foreground hover:text-foreground",
      )}
    >
      <Favicon url={url} />
      <span className="aui-source-title max-w-37.5 truncate">
        {displayTitle}
      </span>
    </a>
  );
};

export const Sources = memo(SourcesImpl);
Sources.displayName = "Sources";
