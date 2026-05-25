"use client";

import { ArrowUpIcon, QuoteIcon, XIcon } from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function QuoteComposerSample() {
  return (
    <SampleFrame className="relative flex h-auto items-center justify-center p-8 pb-10">
      <div className="bg-background w-full max-w-xl rounded-2xl border shadow-xs">
        {/* Quote preview — matches ComposerQuotePreview styling */}
        <div className="bg-muted/60 mx-3 mt-2 flex items-start gap-2 rounded-lg px-3 py-2">
          <QuoteIcon className="text-muted-foreground/70 mt-0.5 size-3.5 shrink-0" />
          <span className="text-muted-foreground line-clamp-2 min-w-0 flex-1 text-sm">
            The runtime system follows a layered architecture with
            framework-agnostic core, public API adapters, and React context
            hooks
          </span>
          <button
            type="button"
            aria-label="Dismiss quote"
            className="text-muted-foreground/70 hover:bg-accent hover:text-foreground shrink-0 rounded-sm p-0.5 transition-colors"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>

        {/* Input row */}
        <div className="flex items-end gap-2 px-4 py-3">
          <span className="text-foreground flex-1 text-sm leading-relaxed">
            Can you explain how the layers connect?
          </span>
          <button
            type="button"
            className="bg-foreground text-background shrink-0 rounded-full p-1.5"
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Footnote linking to component page */}
      <p className="text-muted-foreground/60 absolute end-4 bottom-2.5 text-[11px]">
        Built-in{" "}
        <a
          href="/docs/ui/quote"
          className="hover:text-foreground underline underline-offset-2"
        >
          Quote component
        </a>
      </p>
    </SampleFrame>
  );
}
