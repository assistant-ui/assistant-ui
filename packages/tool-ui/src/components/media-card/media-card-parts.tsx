/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { cn } from "../../utils/cn";
import { Badge } from "../shared";
import { useMediaCard } from "./context";
import { Actions } from "./media-actions";

export function MediaCardHeader() {
  const { card, resolvedSourceUrl, handlers } = useMediaCard();
  const { source, domain } = card;
  const isLinkCard = card.kind === "link";

  // Link cards: simple domain + favicon only
  if (isLinkCard) {
    if (!domain) return null;
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <div className="border-border/60 bg-muted flex size-4 shrink-0 items-center justify-center rounded-full border">
          <Globe className="h-2.5 w-2.5" aria-hidden="true" />
        </div>
        <span>{domain}</span>
      </div>
    );
  }

  // Non-link cards: full source attribution
  if (!source && !domain) {
    return null;
  }

  const showDomain = domain && (!source || source.label !== domain);
  const showViewSource = resolvedSourceUrl;
  const showToolDetails = source?.url;

  return (
    <div className="text-muted-foreground flex w-full items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2.5">
        {source?.iconUrl ? (
          <img
            src={source.iconUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="border-border/60 relative z-20 h-5 w-5 shrink-0 rounded-full border object-cover"
          />
        ) : domain ? (
          <div className="border-border/60 bg-muted relative z-20 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border">
            <Globe className="h-3 w-3" aria-hidden="true" />
          </div>
        ) : null}
        {source?.label ? (
          <Badge
            variant="secondary"
            className="bg-muted text-foreground hover:bg-muted data-[state=open]:bg-muted"
          >
            {source.label}
          </Badge>
        ) : null}
        {showToolDetails ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const href = source?.url;
              if (!href) return;
              if (handlers.onNavigate) {
                handlers.onNavigate(href, card);
              } else if (typeof window !== "undefined") {
                window.open(href, "_blank", "noopener,noreferrer");
              }
            }}
            className="text-muted-foreground underline-offset-2 hover:underline"
          >
            Tool details
          </button>
        ) : null}
        {showDomain ? (
          <span className="text-muted-foreground">{domain}</span>
        ) : null}
      </div>
      {showViewSource ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (handlers.onNavigate) {
              handlers.onNavigate(resolvedSourceUrl, card);
            } else if (typeof window !== "undefined") {
              window.open(resolvedSourceUrl, "_blank", "noopener,noreferrer");
            }
          }}
          className="text-primary focus-visible:ring-ring relative z-20 text-[11px] font-medium underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          View source
        </button>
      ) : null}
    </div>
  );
}

export function MediaCardBody() {
  const { card } = useMediaCard();
  const title = card.title ?? card.og?.title;
  const description = card.description ?? card.og?.description;

  if (!title && !description) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-1">
      {title ? (
        <h3 className="text-foreground text-pretty text-base font-medium">
          <span className={cn("line-clamp-2")}>{title}</span>
        </h3>
      ) : null}
      {description ? (
        <p className="text-muted-foreground text-pretty leading-snug">
          <span className="line-clamp-2">{description}</span>
        </p>
      ) : null}
    </div>
  );
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.round(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function MediaCardFooter() {
  const { card, locale } = useMediaCard();
  const isLink = card.kind === "link";

  const meta: React.ReactNode[] = [];

  if (!isLink && card.durationMs) {
    meta.push(<span key="duration">{formatDuration(card.durationMs)}</span>);
  }

  if (!isLink && card.fileSizeBytes) {
    meta.push(<span key="size">{formatFileSize(card.fileSizeBytes)}</span>);
  }

  if (card.createdAtISO) {
    const date = new Date(card.createdAtISO);
    if (!Number.isNaN(date.getTime())) {
      const formatter = new Intl.DateTimeFormat(locale ?? "en-US", {
        dateStyle: "medium",
        timeStyle: isLink ? undefined : "short",
      });
      meta.push(
        <time
          key="created"
          dateTime={card.createdAtISO}
          title={date.toISOString()}
        >
          {formatter.format(date)}
        </time>,
      );
    }
  }

  if (!isLink && card.domain && meta.length === 0) {
    meta.push(<span key="domain">{card.domain}</span>);
  }

  const hasActions = card.kind !== "link";
  const hasMeta = meta.length > 0;

  if (!hasMeta && !hasActions) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {hasMeta && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {meta.map((node, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <span aria-hidden="true" className="text-muted-foreground">
                  &bull;
                </span>
              )}
              {node}
            </React.Fragment>
          ))}
        </div>
      )}
      {hasActions && <Actions />}
    </div>
  );
}
