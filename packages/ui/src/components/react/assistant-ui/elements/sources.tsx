"use client";

import { ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { collapsePanel, fieldInteractive, mono, paper } from "./surfaces";
import { hostOf, safeHref } from "../utils/href";

export interface Source {
  domain?: string | undefined;
  title: string;
  url?: string | undefined;
  snippet?: string | undefined;
  author?: string | undefined;
  publishedAt?: string | undefined;
}

export interface SourcesProps {
  sources: readonly Source[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout?: "grid" | "list";
  locale?: string | undefined;
  className?: string | undefined;
}

function SourceGlyph({ domain }: { domain: string }) {
  return (
    <span className="bg-foreground/[0.06] text-foreground/45 flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-medium">
      {domain.charAt(0).toUpperCase()}
    </span>
  );
}

const displayDomain = (source: Source) => source.domain || hostOf(source.url);

const formatPublishedAt = (publishedAt: string | undefined, locale: string) => {
  if (!publishedAt) return undefined;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.valueOf())) return undefined;
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    year: "numeric",
  };
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }
};

export function Sources({
  sources,
  open,
  onOpenChange,
  layout = "grid",
  locale = "en-US",
  className,
}: SourcesProps) {
  const badgeDomains = sources
    .map(displayDomain)
    .filter((domain): domain is string => domain !== undefined)
    .slice(0, 3);

  return (
    <Collapsible
      data-slot="sources"
      open={open}
      onOpenChange={onOpenChange}
      className={cn("w-full max-w-sm", className)}
    >
      <CollapsibleTrigger
        className={cn(
          fieldInteractive,
          "group/trigger text-foreground/60 hover:text-foreground/90 inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-xs outline-none",
        )}
      >
        {badgeDomains.length > 0 ? (
          <span aria-hidden className="flex -space-x-1">
            {badgeDomains.map((domain, index) => (
              <span
                key={`${domain}-${index}`}
                data-slot="sources-badge"
                className="bg-foreground/[0.08] text-foreground/55 ring-background dark:ring-popover flex size-4 items-center justify-center rounded-full text-[8px] font-medium ring-1"
              >
                {domain.charAt(0).toUpperCase()}
              </span>
            ))}
          </span>
        ) : null}
        <span>Sources</span>
        <span className={cn(mono, "text-foreground/35 tabular-nums")}>
          {sources.length}
        </span>
        <ChevronDownIcon className="size-3 opacity-60 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-open/trigger:rotate-180 group-data-panel-open/trigger:rotate-180 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(collapsePanel, "outline-none")}>
        <div
          className={
            layout === "list"
              ? "flex flex-col gap-1 pt-2.5"
              : "grid grid-cols-2 gap-2 pt-2.5"
          }
          data-slot={layout === "list" ? "sources-list" : undefined}
        >
          {sources.map((source, index) => {
            const domain = displayDomain(source);
            const href = safeHref(source.url);
            const meta = [
              source.author,
              formatPublishedAt(source.publishedAt, locale),
            ]
              .filter((value): value is string => Boolean(value))
              .join(" · ");
            const cardClassName = cn(
              layout === "grid" && paper,
              "focus-visible:ring-foreground/20 flex flex-col gap-1.5 outline-none focus-visible:ring-1",
              layout === "list"
                ? "rounded-lg px-1 py-1"
                : "rounded-2xl p-3 transition-transform duration-150 hover:-translate-y-px motion-reduce:transition-none",
            );
            const content = (
              <>
                {layout === "list" ? (
                  <div className="flex min-w-0 items-center gap-2">
                    {domain ? <SourceGlyph domain={domain} /> : null}
                    <span className="text-foreground/90 min-w-0 flex-1 truncate text-[13px] leading-snug">
                      {source.title}
                    </span>
                    {domain ? (
                      <span
                        className={cn(
                          mono,
                          "text-foreground/35 max-w-[40%] min-w-0 shrink truncate text-[11px]",
                        )}
                      >
                        {domain}
                      </span>
                    ) : null}
                  </div>
                ) : domain ? (
                  <div className="flex items-center gap-1.5">
                    <SourceGlyph domain={domain} />
                    <span className={cn(mono, "text-foreground/40 truncate")}>
                      {domain}
                    </span>
                  </div>
                ) : null}
                <div className="flex min-w-0 flex-col gap-1">
                  {layout === "grid" ? (
                    <span className="text-foreground/90 line-clamp-2 text-[13px] leading-snug font-medium">
                      {source.title}
                    </span>
                  ) : null}
                  {source.snippet ? (
                    <span className="text-foreground/50 line-clamp-2 text-xs leading-relaxed">
                      {source.snippet}
                    </span>
                  ) : null}
                  {meta ? (
                    <span className="text-foreground/40 truncate text-xs">
                      {meta}
                    </span>
                  ) : null}
                </div>
              </>
            );

            if (href) {
              return (
                <a
                  key={`${source.url ?? source.domain ?? source.title}-${index}`}
                  data-slot="source-card"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cardClassName}
                >
                  {content}
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              );
            }

            return (
              <div
                key={`${source.url ?? source.domain ?? source.title}-${index}`}
                data-slot="source-card"
                className={cardClassName}
              >
                {content}
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
