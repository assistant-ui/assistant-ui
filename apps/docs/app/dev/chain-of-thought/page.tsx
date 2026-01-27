"use client";

import {
  ChainOfThoughtVariantsSample,
  ChainOfThoughtStreamingSample,
  ChainOfThoughtLabelsSample,
  ChainOfThoughtPlaceholderSample,
  ChainOfThoughtUserDismissSample,
  ChainOfThoughtStressTestSample,
  ChainOfThoughtTimelineSample,
  ChainOfThoughtNumberedStepsSample,
  ChainOfThoughtTimelineStreamingSample,
  ChainOfThoughtPartsGroupedSample,
  ChainOfThoughtAgentTraceSample,
  ChainOfThoughtToolCallsSample,
} from "@/components/docs/samples/chain-of-thought";

export default function ChainOfThoughtPreviewPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 p-8">
      <div>
        <h1 className="mb-2 font-bold text-3xl">ChainOfThought Component</h1>
        <p className="text-muted-foreground">
          Preview and pressure test the ChainOfThought primitive.
        </p>
      </div>

      {/* Timeline section - NEW */}
      <section>
        <h2 className="mb-4 font-semibold text-xl">Timeline with Steps</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          A vertical line extends from the Reasoning icon with bullets at each
          step. Use <code>ChainOfThought.Timeline</code> and{" "}
          <code>ChainOfThought.Step</code>.
        </p>
        <ChainOfThoughtTimelineSample />
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-xl">Numbered Steps</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Steps can show numbers instead of bullets using the{" "}
          <code>stepLabel</code> prop.
        </p>
        <ChainOfThoughtNumberedStepsSample />
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-xl">Timeline Streaming</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Steps appear progressively with active indicators. The current step
          pulses and shows a shimmer.
        </p>
        <ChainOfThoughtTimelineStreamingSample />
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-xl">
          PartsGrouped Trace (parentId)
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Demonstrates <code>MessagePrimitive.Unstable_PartsGrouped</code> with{" "}
          <code>parentId</code> grouping, rendered as timeline steps via{" "}
          <code>ChainOfThought.Trace</code>.
        </p>
        <ChainOfThoughtPartsGroupedSample />
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-xl">
          Agent Trace (Search + Images)
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Different step types with distinct icons: search (🔍), image (🖼️),
          text, tool. Includes source badges and inline images.
        </p>
        <ChainOfThoughtAgentTraceSample />
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-xl">Tool Calls</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Shows tool invocations with parameter badges, results, and status
          indicators (complete, active, pending).
        </p>
        <ChainOfThoughtToolCallsSample />
      </section>

      {/* Original sections */}
      <section>
        <h2 className="mb-4 font-semibold text-xl">Variants</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Three style variants: outline (default), ghost, and muted.
        </p>
        <ChainOfThoughtVariantsSample />
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-xl">Streaming Behavior</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Test the shimmer effect, auto-open, and streaming text. Adjust speed
          and content length.
        </p>
        <ChainOfThoughtStreamingSample />
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-xl">Label Customization</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          The label defaults to &quot;Reasoning&quot; (safe UX). You can
          customize it to &quot;Thinking&quot;, add &quot;(summary)&quot;
          suffix, or show duration.
        </p>
        <ChainOfThoughtLabelsSample />
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-xl">
          Placeholder (Redaction-Safe)
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          When reasoning content is empty, redacted, or encrypted, show a
          neutral placeholder instead of broken UI.
        </p>
        <ChainOfThoughtPlaceholderSample />
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-xl">User Dismiss Behavior</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          If you close the disclosure while streaming, it respects your choice
          and won&apos;t re-open on subsequent updates.
        </p>
        <ChainOfThoughtUserDismissSample />
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-xl">Stress Test</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Multiple instances with shimmer effects. Tests scroll behavior and
          rendering performance.
        </p>
        <ChainOfThoughtStressTestSample />
      </section>
    </div>
  );
}
