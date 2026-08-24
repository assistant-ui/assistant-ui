"use client";

import { ThinkingIndicator } from "@/components/elements/thinking-indicator";
import { useStoryPhases } from "@/components/demo/use-demo";

const STATUSES = [
  "Thinking",
  "Reading thread.tsx",
  "Searching the docs",
  "Drafting a reply",
];

const PHASES = [2400, 2400, 2400, 0] as const;

export function ThinkingIndicatorDemo() {
  const { phase } = useStoryPhases(PHASES);

  return <ThinkingIndicator label={STATUSES[phase]!} />;
}
