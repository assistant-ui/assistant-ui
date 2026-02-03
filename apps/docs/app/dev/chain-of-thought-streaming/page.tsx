"use client";

import { ChainOfThoughtNestedTraceStreamingSample } from "@/components/docs/samples/chain-of-thought";

export default function ChainOfThoughtStreamingPreviewPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="space-y-2">
        <h1 className="font-bold text-3xl">Nested Trace Streaming</h1>
        <p className="text-muted-foreground text-sm">
          Dedicated preview for the streaming nested trace demo. This page is
          intentionally focused to evaluate pacing, shimmer, and nesting
          behavior without other samples.
        </p>
      </header>

      <section>
        <ChainOfThoughtNestedTraceStreamingSample />
      </section>
    </div>
  );
}
