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
  ChainOfThoughtLongContentSample,
  ChainOfThoughtOverflowSample,
  ChainOfThoughtUnicodeSample,
  ChainOfThoughtManyStepsSample,
  ChainOfThoughtManyBadgesSample,
  ChainOfThoughtRapidToggleSample,
  ChainOfThoughtNestedStructureSample,
  ChainOfThoughtConcurrentStreamingSample,
  ChainOfThoughtEdgeCasesSample,
  ChainOfThoughtMotionShowcaseSample,
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
          Preview and stress test the ChainOfThought primitive. This page covers
          variants, streaming behavior, timeline rendering, and edge cases.
        </p>
      </header>

      {/* ================================================================== */}
      {/* SECTION: Motion Showcase */}
      {/* ================================================================== */}
      <div className="space-y-8">
        <div className="border-muted-foreground/20 border-b pb-2">
          <h2 className="font-semibold text-primary text-xl">
            Motion Showcase
          </h2>
          <p className="text-muted-foreground text-sm">
            Premium motion design with spring physics, staggered reveals, and
            micro-interactions.
          </p>
        </div>

        <section>
          <h3 className="mb-2 font-medium text-lg">Interactive Demo</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Watch all motion refinements in action: spring-based easing,
            staggered step reveals, pulsing ring indicators, scale-pop
            completion effects, and diagonal shimmer.
          </p>
          <ChainOfThoughtMotionShowcaseSample />
        </section>
      </div>

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

        <section>
          <h3 className="mb-2 font-medium text-lg">Complex Nested Structure</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            A realistic agent trace with mixed content: planning, search
            results, images, code output, and active synthesis.
          </p>
          <ChainOfThoughtNestedStructureSample />
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

      {/* ================================================================== */}
      {/* SECTION: Stress Tests */}
      {/* ================================================================== */}
      <div className="space-y-8">
        <div className="border-muted-foreground/20 border-b pb-2">
          <h2 className="font-semibold text-primary text-xl">Stress Tests</h2>
          <p className="text-muted-foreground text-sm">
            Edge cases and performance tests to verify the component handles
            extreme scenarios gracefully.
          </p>
        </div>

        <section>
          <h3 className="mb-2 font-medium text-lg">Very Long Content</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Tests the max-h-64 scroll container with extensive markdown content
            including headers, lists, and code blocks.
          </p>
          <ChainOfThoughtLongContentSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Horizontal Overflow</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Tests handling of unbreakable content: extremely long words, URLs
            without spaces, and inline code.
          </p>
          <ChainOfThoughtOverflowSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Unicode & Emoji</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Tests rendering with emoji (including ZWJ sequences and skin tones),
            mathematical symbols, RTL text, and special characters.
          </p>
          <ChainOfThoughtUnicodeSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Many Steps (Performance)</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Tests rendering performance with a large number of timeline steps.
            Adjust the count to stress test the component.
          </p>
          <ChainOfThoughtManyStepsSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Many Badges</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Tests badge layout and wrapping behavior when a step has many source
            badges or parameter tags.
          </p>
          <ChainOfThoughtManyBadgesSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Many Instances</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Multiple instances with shimmer effects. Tests scroll behavior and
            rendering performance with concurrent components.
          </p>
          <ChainOfThoughtStressTestSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Concurrent Streaming</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Multiple instances streaming simultaneously with staggered start
            times. Tests independent state management.
          </p>
          <ChainOfThoughtConcurrentStreamingSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Rapid Toggle</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Rapidly toggles the disclosure open/closed to test animation
            performance and scroll lock behavior.
          </p>
          <ChainOfThoughtRapidToggleSample />
        </section>

        <section>
          <h3 className="mb-2 font-medium text-lg">Edge Cases</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Various edge cases: empty content, single character,
            whitespace-only, very long labels, and single-step timelines.
          </p>
          <ChainOfThoughtEdgeCasesSample />
        </section>
      </div>
    </div>
  );
}
