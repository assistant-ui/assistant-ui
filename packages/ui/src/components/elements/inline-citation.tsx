"use client";

import type { ComponentProps } from "react";
import { PreviewCard } from "@base-ui/react/preview-card";
import { cn } from "@/lib/utils";
import { floating, mono } from "./surfaces";

export interface Source {
  domain: string;
  title: string;
  snippet: string;
}

interface CitationProps {
  index: number;
  source: Source;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Citation({ index, source, open, onOpenChange }: CitationProps) {
  return (
    <PreviewCard.Root open={open} onOpenChange={onOpenChange}>
      <PreviewCard.Trigger
        delay={0}
        render={<button type="button" />}
        className={cn(
          "mx-0.5 inline-flex h-4 min-w-4 translate-y-[-2px] cursor-default items-center justify-center rounded-[5px] px-1 align-middle font-mono text-[10px] font-medium tabular-nums transition-colors",
          open
            ? "bg-foreground text-background"
            : "bg-foreground/[0.06] text-foreground/45 hover:text-foreground/90",
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
            <div className="flex items-center gap-1.5">
              <span className="bg-foreground/[0.06] text-foreground/45 flex size-4 items-center justify-center rounded text-[9px] font-medium">
                {source.domain[0]?.toUpperCase()}
              </span>
              <span className={cn(mono, "text-foreground/40")}>
                {source.domain}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-snug font-medium">
              {source.title}
            </p>
            <p className="text-foreground/50 mt-1 text-[13px] leading-relaxed">
              {source.snippet}
            </p>
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

export interface InlineCitationProps extends Omit<
  ComponentProps<"p">,
  "children"
> {
  sources: Source[];
  openIndex: number | null;
  onOpenIndexChange: (index: number | null) => void;
}

export function InlineCitation({
  sources,
  openIndex,
  onOpenIndexChange,
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
      Optimistic updates keep the thread responsive while the server confirms
      the write
      {sources[0] && (
        <Citation
          index={0}
          source={sources[0]}
          open={openIndex === 0}
          onOpenChange={(open) => onOpenIndexChange(open ? 0 : null)}
        />
      )}
      . The store already exposes a consistent snapshot for every subscriber
      {sources[1] && (
        <Citation
          index={1}
          source={sources[1]}
          open={openIndex === 1}
          onOpenChange={(open) => onOpenIndexChange(open ? 1 : null)}
        />
      )}
      , so no extra reconciliation pass is needed.
    </p>
  );
}
