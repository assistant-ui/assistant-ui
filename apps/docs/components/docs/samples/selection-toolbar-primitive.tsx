"use client";

import { QuoteIcon } from "lucide-react";
import { SampleFrame } from "./sample-frame";

export function SelectionToolbarPrimitiveSample() {
  return (
    <SampleFrame className="bg-background flex h-auto items-center justify-center p-8">
      <div className="w-full max-w-xl">
        <div className="border-border bg-muted/40 relative rounded-xl border px-5 py-4">
          <div className="text-muted-foreground mb-6 text-xs font-medium">
            Assistant
          </div>
          <div className="relative inline text-sm leading-relaxed">
            React Server Components allow you to{" "}
            <span className="relative">
              <span className="bg-popover text-popover-foreground absolute start-1/2 -top-10 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm shadow-md rtl:translate-x-1/2">
                <QuoteIcon className="size-3.5" />
                Quote
              </span>
              <mark className="bg-primary/20 rounded px-px">
                render on the server and stream to the client
              </mark>
            </span>
            , reducing the amount of JavaScript shipped to the browser while
            keeping your UI interactive.
          </div>
        </div>
      </div>
    </SampleFrame>
  );
}
