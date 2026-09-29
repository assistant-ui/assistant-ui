"use client";

import type { ComponentProps } from "react";
import { PreviewCard } from "@base-ui/react/preview-card";
import { cn } from "@/lib/utils";
import { floating, mono } from "./surfaces";
import { hostOf, safeHref } from "../utils/href";

export interface Source {
  domain?: string | undefined;
  title: string;
  snippet: string;
  url?: string | undefined;
  publishedAt?: string | undefined;
}

export interface CitationProps extends Omit<
  ComponentProps<"button">,
  "aria-label" | "children" | "className" | "type"
> {
  index: number;
  source: Source;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  className?: string | undefined;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

function formatPublishedAt(publishedAt: string | undefined) {
  if (publishedAt === undefined) return undefined;
  const date = new Date(publishedAt);
  return Number.isNaN(date.getTime()) ? undefined : dateFormatter.format(date);
}

export function Citation({
  index,
  source,
  open,
  onOpenChange,
  className,
  ...props
}: CitationProps) {
  const domain = source.domain ?? hostOf(source.url);
  const href = safeHref(source.url);
  const publishedAt = formatPublishedAt(source.publishedAt);
  const hasMetadata = domain !== undefined || publishedAt !== undefined;

  return (
    <PreviewCard.Root open={open} onOpenChange={onOpenChange}>
      <PreviewCard.Trigger
        delay={0}
        render={<button type="button" {...props} />}
        aria-label={`Source ${index + 1}: ${source.title}`}
        className={cn(
          "bg-foreground/[0.06] text-foreground/45 hover:text-foreground/90 data-[popup-open]:bg-foreground data-[popup-open]:text-background ms-0.5 inline-flex h-4 min-w-4 translate-y-[-2px] cursor-default items-center justify-center rounded-[5px] px-1 align-middle font-mono text-[10px] font-medium tabular-nums transition-colors motion-reduce:transition-none",
          className,
        )}
      >
        {index + 1}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner side="top" sideOffset={8}>
          <PreviewCard.Popup
            className={cn(
              floating,
              "z-50 w-64 origin-(--transform-origin) rounded-2xl p-3.5 outline-none",
              "transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
              "data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0",
            )}
          >
            {hasMetadata ? (
              <div className="flex items-center gap-1.5">
                {domain ? (
                  <>
                    <span className="bg-foreground/[0.06] text-foreground/45 flex size-4 items-center justify-center rounded text-[9px] font-medium">
                      {domain[0]?.toUpperCase()}
                    </span>
                    <span className={cn(mono, "text-foreground/40")}>
                      {domain}
                    </span>
                  </>
                ) : null}
                {publishedAt ? (
                  <span className={cn(mono, "text-foreground/35")}>
                    {publishedAt}
                  </span>
                ) : null}
              </div>
            ) : null}
            <p
              className={cn(
                "text-[13px] leading-snug font-medium",
                hasMetadata && "mt-2",
              )}
            >
              {source.title}
            </p>
            <p className="text-foreground/50 mt-1 text-[13px] leading-relaxed">
              {source.snippet}
            </p>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/55 hover:text-foreground mt-3 inline-flex text-xs underline-offset-2 transition-colors hover:underline motion-reduce:transition-none"
              >
                Open source{" "}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : null}
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

export interface InlineCitationProps extends ComponentProps<"p"> {}

export function InlineCitation({
  children,
  className,
  ...props
}: InlineCitationProps) {
  return (
    <p
      data-slot="inline-citation"
      className={cn(
        "text-foreground/90 max-w-sm text-sm leading-relaxed",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
