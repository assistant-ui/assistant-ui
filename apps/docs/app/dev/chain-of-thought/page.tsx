"use client";

import {
  ChainOfThoughtVariantsSample,
  ChainOfThoughtStreamingSample,
  ChainOfThoughtLabelsSample,
  ChainOfThoughtPlaceholderSample,
  ChainOfThoughtUserDismissSample,
  ChainOfThoughtTimelineSample,
  ChainOfThoughtNumberedStepsSample,
  ChainOfThoughtTimelineStreamingSample,
  ChainOfThoughtPartsGroupedSample,
  ChainOfThoughtNestedTraceSample,
  ChainOfThoughtCustomGroupSummarySample,
  ChainOfThoughtAISDKAdapterSample,
  ChainOfThoughtAgentTraceSample,
  ChainOfThoughtToolCallsSample,
  ChainOfThoughtErrorStateSample,
  ChainOfThoughtAutoScrollSample,
  ChainOfThoughtStreamingCursorSample,
  ChainOfThoughtAccessibilitySample,
} from "@/components/docs/samples/chain-of-thought";

export default function ChainOfThoughtPreviewPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-16 p-8">
      {/* Header */}
      <header>
        <h1 className="mb-2 font-bold text-3xl">ChainOfThought Component</h1>
        <p className="text-muted-foreground">
          Preview the ChainOfThought primitive with v1 trace behavior, nested
          subagent groups, and core streaming/timeline features.
        </p>
      </header>

      {/* ================================================================== */}
      {/* SECTION: Basic Usage */}
      {/* ================================================================== */}
      <div className="space-y-8">
        <div className="border-muted-foreground/20 border-b pb-2">
          <h2 className="font-semibold text-primary text-xl">Basic Usage</h2>
          <p className="text-muted-foreground text-sm">
            Core features and variants of the ChainOfThought component.
          </p>
        </div>

        <section>
          <h3 className="mb-2 font-medium text-lg">Variants</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Three style variants: outline (default), ghost, and muted.
          </p>
          <ChainOfThoughtVariantsSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Label Customization</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            The label defaults to &quot;Reasoning&quot;. You can customize it,
            add duration, or use alternative labels like &quot;Thinking&quot;.
          </p>
          <ChainOfThoughtLabelsSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">
            Placeholder (Redaction-Safe)
          </h3>
          <p className="mb-4 text-muted-foreground text-sm">
            When reasoning content is empty, redacted, or encrypted, show a
            neutral placeholder instead of broken UI.
          </p>
          <ChainOfThoughtPlaceholderSample />
        </section>
      </div>

      {/* ================================================================== */}
      {/* SECTION: Streaming Behavior */}
      {/* ================================================================== */}
      <div className="space-y-8">
        <div className="border-muted-foreground/20 border-b pb-2">
          <h2 className="font-semibold text-primary text-xl">
            Streaming Behavior
          </h2>
          <p className="text-muted-foreground text-sm">
            Real-time streaming with shimmer effects, auto-open, and user
            dismiss handling.
          </p>
        </div>

        <section>
          <h3 className="mb-2 font-medium text-lg">Basic Streaming</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Test the shimmer effect, auto-open, and streaming text. Adjust speed
            and content length.
          </p>
          <ChainOfThoughtStreamingSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">User Dismiss Behavior</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            If you close the disclosure while streaming, it respects your choice
            and won&apos;t re-open on subsequent updates.
          </p>
          <ChainOfThoughtUserDismissSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">
            Auto-Scroll & Jump to Latest
          </h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Content auto-scrolls to follow streaming. If you scroll up to read,
            a &quot;Jump to latest&quot; button appears to catch up.
          </p>
          <ChainOfThoughtAutoScrollSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Streaming Cursor</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Optional blinking cursor at the end of streaming text for a
            typewriter feel.
          </p>
          <ChainOfThoughtStreamingCursorSample />
        </section>
      </div>

      {/* ================================================================== */}
      {/* SECTION: Timeline & Steps */}
      {/* ================================================================== */}
      <div className="space-y-8">
        <div className="border-muted-foreground/20 border-b pb-2">
          <h2 className="font-semibold text-primary text-xl">
            Timeline & Steps
          </h2>
          <p className="text-muted-foreground text-sm">
            Vertical timeline with step indicators, icons, and progressive
            streaming.
          </p>
        </div>

        <section>
          <h3 className="mb-2 font-medium text-lg">Timeline with Steps</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            A vertical line extends from the Reasoning icon with bullets at each
            step. Use <code>ChainOfThought.Timeline</code> and{" "}
            <code>ChainOfThought.Step</code>.
          </p>
          <ChainOfThoughtTimelineSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Numbered Steps</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Steps can show numbers instead of bullets using the{" "}
            <code>stepLabel</code> prop.
          </p>
          <ChainOfThoughtNumberedStepsSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Timeline Streaming</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Steps appear progressively with active indicators. The current step
            pulses and shows a shimmer.
          </p>
          <ChainOfThoughtTimelineStreamingSample />
        </section>
      </div>

      {/* ================================================================== */}
      {/* SECTION: Agent Traces */}
      {/* ================================================================== */}
      <div className="space-y-8">
        <div className="border-muted-foreground/20 border-b pb-2">
          <h2 className="font-semibold text-primary text-xl">Agent Traces</h2>
          <p className="text-muted-foreground text-sm">
            Complex agent execution traces with tool calls, search results,
            images, and metadata badges.
          </p>
        </div>

        <section>
          <h3 className="mb-2 font-medium text-lg">
            PartsGrouped Trace (parentId)
          </h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Demonstrates <code>MessagePrimitive.Unstable_PartsGrouped</code>{" "}
            with <code>parentId</code> grouping, rendered as timeline steps via{" "}
            <code>ChainOfThought.Trace</code>.
          </p>
          <ChainOfThoughtPartsGroupedSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Nested Subagent Trace</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Opinionated v1 nested trace with subagent groups. Collapsed view
            shows the most recent step with a marquee summary and tool badge.
          </p>
          <ChainOfThoughtNestedTraceSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Custom Group Summary</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Override the group summary to differentiate top-level agents and
            subagents while keeping the same trace data.
          </p>
          <ChainOfThoughtCustomGroupSummarySample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">AI SDK Trace Adapter</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Converts AI SDK <code>UIMessage</code> data into Assistant UI thread
            messages, then derives trace nodes for
            <code>ChainOfThought.Trace</code>.
          </p>
          <ChainOfThoughtAISDKAdapterSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">
            Agent Trace (Search + Images)
          </h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Different step types with distinct icons: search, image, text, tool.
            Includes source badges and inline images.
          </p>
          <ChainOfThoughtAgentTraceSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Tool Calls</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Shows tool invocations with parameter badges, results, and status
            indicators (complete, active, pending).
          </p>
          <ChainOfThoughtToolCallsSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Error State & Retry</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Steps can fail with error status. Includes visual indicator and
            optional retry button. Click retry twice to simulate recovery.
          </p>
          <ChainOfThoughtErrorStateSample />
        </section>
      </div>

      {/* ================================================================== */}
      {/* SECTION: Accessibility */}
      {/* ================================================================== */}
      <div className="space-y-8">
        <div className="border-muted-foreground/20 border-b pb-2">
          <h2 className="font-semibold text-primary text-xl">Accessibility</h2>
          <p className="text-muted-foreground text-sm">
            Features to ensure the component works well for all users, including
            those using assistive technologies.
          </p>
        </div>

        <section>
          <h3 className="mb-2 font-medium text-lg">
            Live Region Announcements
          </h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Screen readers announce step completion via aria-live regions. Use{" "}
            <code>ChainOfThought.Announcer</code> with dynamic messages.
          </p>
          <ChainOfThoughtAccessibilitySample />
        </section>
      </div>
    </div>
  );
}
