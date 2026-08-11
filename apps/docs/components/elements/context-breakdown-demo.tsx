"use client";

import {
  ContextBreakdown,
  type ContextSegment,
} from "@/components/elements/context-breakdown";
import { useStoryPhases } from "./use-demo";

const GROWTH = [0.45, 0.72, 1] as const;

const SEGMENTS: readonly ContextSegment[] = [
  { label: "System prompt", tokens: 1_800, tint: "bg-foreground/45" },
  { label: "Tools", tokens: 4_200, tint: "bg-foreground/25" },
  {
    label: "Attached files",
    tokens: 38_500,
    tint: "bg-blue-500/60 dark:bg-blue-400/60",
  },
  {
    label: "Conversation",
    tokens: 68_400,
    tint: "bg-blue-500 dark:bg-blue-400",
  },
];

const PHASES = [1200, 1200, 0] as const;

export function ContextBreakdownDemo() {
  const { phase } = useStoryPhases(PHASES);
  const scale = GROWTH[Math.min(phase, GROWTH.length - 1)]!;

  return (
    <ContextBreakdown
      segments={SEGMENTS.map((segment) => ({
        ...segment,
        tokens: Math.round(segment.tokens * scale),
      }))}
      limit={128_000}
    />
  );
}
