"use client";

import { ArrowUpIcon, QuoteIcon, XIcon } from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function QuoteComposerSample() {
  return (
    <SampleFrame className="relative flex h-auto items-center justify-center p-8 pb-10">
      <div className="w-full max-w-xl rounded-2xl border bg-background shadow-xs">
        {/* Quote preview — matches ComposerQuotePreview styling */}
        <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2">
          <QuoteIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" />
          <span className="line-clamp-2 min-w-0 flex-1 text-muted-foreground text-sm">
            The runtime system follows a layered architecture with
            framework-agnostic core, public API adapters, and React context
            hooks
          </span>
          <button
            type="button"
            aria-label="Dismiss quote"
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>

        {/* Input row */}
        <div className="flex items-end gap-2 px-4 py-3">
          <span className="flex-1 text-foreground text-sm leading-relaxed">
            Can you explain how the layers connect?
          </span>
          <button
            type="button"
            className="shrink-0 rounded-full bg-foreground p-1.5 text-background"
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Footnote linking to component page */}
      <p className="absolute right-4 bottom-2.5 text-[11px] text-muted-foreground/60">
        Built-in{" "}
        <a
          href="/docs/ui/quote"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Quote component
        </a>
      </p>
    </SampleFrame>
  );
}
