"use client";

import {
  ContextDisplayBar,
  ContextDisplayRing,
  ContextDisplayText,
  type TokenUsage,
} from "@/components/assistant-ui/elements/context-display.aui";
import { defineStates } from "./types";

const WINDOW = 128_000;

function UsageRow({ usage }: { usage: TokenUsage }) {
  return (
    <div className="flex h-full w-full flex-wrap items-center justify-center gap-6 p-8">
      <ContextDisplayRing modelContextWindow={WINDOW} usage={usage} />
      <ContextDisplayBar modelContextWindow={WINDOW} usage={usage} />
      <ContextDisplayText modelContextWindow={WINDOW} usage={usage} />
    </div>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Empty",
    note: "A new thread has reported zero tokens, so every form reads 0%.",
    Component: () => <UsageRow usage={{ totalTokens: 0 }} />,
  },
  {
    key: "low",
    label: "Low",
    note: "Usage under 65% of the window stays neutral.",
    Component: () => (
      <UsageRow
        usage={{
          totalTokens: 31_400,
          inputTokens: 24_800,
          outputTokens: 6_600,
        }}
      />
    ),
  },
  {
    key: "warning",
    label: "Warning",
    note: "Usage between 65% and 85% of the window turns amber.",
    Component: () => (
      <UsageRow
        usage={{
          totalTokens: 92_200,
          inputTokens: 71_300,
          cachedInputTokens: 41_200,
          outputTokens: 20_900,
        }}
      />
    ),
  },
  {
    key: "critical",
    label: "Critical",
    note: "Usage above 85% of the window turns red.",
    Component: () => (
      <UsageRow
        usage={{
          totalTokens: 117_000,
          inputTokens: 88_100,
          outputTokens: 20_500,
          reasoningTokens: 8_400,
        }}
      />
    ),
  },
  {
    key: "overflow",
    label: "Over limit",
    note: "A total past the window caps the ring and bar at 100%.",
    Component: () => (
      <UsageRow usage={{ totalTokens: 141_600, inputTokens: 141_600 }} />
    ),
  },
]);
