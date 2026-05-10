"use client";

import { QuoteIcon, XIcon } from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function QuoteSample() {
  return (
    <SampleFrame className="flex h-auto flex-wrap items-start justify-center gap-10 p-8">
      {/* Quote Block — as it appears in user messages */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground text-xs">User message</span>
        <div className="rounded-2xl bg-muted px-4 py-2.5">
          <div className="mb-2 flex items-start gap-1.5">
            <QuoteIcon className="mt-0.5 size-3 shrink-0 text-muted-foreground/60" />
            <p className="line-clamp-2 min-w-0 text-muted-foreground/80 text-sm italic">
              The runtime system follows a layered architecture
            </p>
          </div>
          <p className="text-foreground text-sm">
            Can you explain how the layers connect?
          </p>
        </div>
      </div>

      {/* Selection Toolbar — floating toolbar on text selection */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground text-xs">Selection Toolbar</span>
        <div className="flex items-center gap-1 rounded-lg border bg-popover px-1 py-1 shadow-md">
          <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-popover-foreground text-sm transition-colors hover:bg-accent">
            <QuoteIcon className="size-3.5" />
            Quote
          </div>
        </div>
      </div>

      {/* Composer Preview — quote preview inside the composer */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground text-xs">Composer Preview</span>
        <div className="w-64 rounded-xl border">
          <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2">
            <QuoteIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" />
            <span className="line-clamp-2 min-w-0 flex-1 text-muted-foreground text-sm">
              The runtime system follows a layered architecture
            </span>
            <button
              type="button"
              className="shrink-0 rounded-sm p-0.5 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
          <div className="px-3 py-2.5 text-muted-foreground/50 text-sm">
            Send a message...
          </div>
        </div>
      </div>
    </SampleFrame>
  );
}
