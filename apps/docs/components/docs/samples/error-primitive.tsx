"use client";

import { SampleFrame } from "./sample-frame";

export function ErrorPrimitiveSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center bg-background p-8">
      <div className="mx-auto w-full max-w-lg space-y-3">
        <div className="flex justify-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
            AI
          </div>
          <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2.5 text-sm">
            Let me look that up for you...
          </div>
        </div>
        <div
          className="ml-11 rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm"
          role="alert"
        >
          An error occurred. Please try again.
        </div>
      </div>
    </SampleFrame>
  );
}
