"use client";

import { SampleFrame } from "./sample-frame";

export function ErrorPrimitiveSample() {
  return (
    <SampleFrame className="bg-background flex h-auto items-center justify-center p-8">
      <div className="mx-auto w-full max-w-lg space-y-3">
        <div className="flex justify-start gap-3">
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
            AI
          </div>
          <div className="bg-muted max-w-[80%] rounded-2xl px-4 py-2.5 text-sm">
            Let me look that up for you...
          </div>
        </div>
        <div
          className="bg-destructive/10 text-destructive ms-11 rounded-md px-3 py-2 text-sm"
          role="alert"
        >
          An error occurred. Please try again.
        </div>
      </div>
    </SampleFrame>
  );
}
