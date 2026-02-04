"use client";

import {
  ChainOfThoughtNestedTraceStreamingSample,
  ChainOfThoughtParallelTraceStreamingSample,
} from "@/components/docs/samples/chain-of-thought";

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

      <section className="space-y-4">
        <h2 className="font-semibold text-xl">Nested Trace</h2>
        <ChainOfThoughtNestedTraceStreamingSample windowSize={3} />
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-xl">Parallel Subagents</h2>
        <ChainOfThoughtParallelTraceStreamingSample windowSize={3} />
      </section>
    </div>
  );
}
