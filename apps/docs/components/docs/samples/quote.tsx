"use client";

import { QuoteIcon, XIcon } from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function QuoteSample() {
  return (
    <SampleFrame className="flex h-auto flex-wrap items-start justify-center gap-10 p-8">
      {/* Quote Block — as it appears in user messages */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground text-xs">User message</span>
        <div className="bg-muted rounded-2xl px-4 py-2.5">
          <div className="mb-2 flex items-start gap-1.5">
            <QuoteIcon className="text-muted-foreground/60 mt-0.5 size-3 shrink-0" />
            <p className="text-muted-foreground/80 line-clamp-2 min-w-0 text-sm italic">
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
        <div className="bg-popover flex items-center gap-1 rounded-lg border px-1 py-1 shadow-md">
          <div className="text-popover-foreground hover:bg-accent flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors">
            <QuoteIcon className="size-3.5" />
            Quote
          </div>
        </div>
      </div>

      {/* Composer Preview — quote preview inside the composer */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground text-xs">Composer Preview</span>
        <div className="w-64 rounded-xl border">
          <div className="bg-muted/60 mx-3 mt-2 flex items-start gap-2 rounded-lg px-3 py-2">
            <QuoteIcon className="text-muted-foreground/70 mt-0.5 size-3.5 shrink-0" />
            <span className="text-muted-foreground line-clamp-2 min-w-0 flex-1 text-sm">
              The runtime system follows a layered architecture
            </span>
            <button
              type="button"
              className="text-muted-foreground/70 hover:bg-accent hover:text-foreground shrink-0 rounded-sm p-0.5 transition-colors"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
          <div className="text-muted-foreground/50 px-3 py-2.5 text-sm">
            Send a message...
          </div>
        </div>
      </div>
    </SampleFrame>
  );
}
