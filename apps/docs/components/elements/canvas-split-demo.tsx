"use client";

import {
  CanvasSplit,
  type CanvasMessage,
} from "@/components/elements/canvas-split";
import { useStoryPhases } from "./use-demo";

const MESSAGES: readonly CanvasMessage[] = [
  { id: "u1", role: "user", text: "Draft the migration note for 0.14" },
  {
    id: "a1",
    role: "assistant",
    text: "Opened it in the canvas — editing now.",
  },
];

const LINES: readonly string[] = [
  "# Migrating to 0.14",
  "The composer now owns its draft, so `useState` in the parent is no longer read.",
  "Replace the local draft with `useDraft(threadId)` and drop the hydrate effect.",
  "Threads that switch mid-edit keep their own draft instead of inheriting the last one.",
];

const PHASES = [900, 900, 900, 900, 0] as const;

export function CanvasSplitDemo() {
  const { phase } = useStoryPhases(PHASES);
  const visibleLines = Math.min(phase, LINES.length);

  return (
    <CanvasSplit
      messages={MESSAGES}
      title="migration-0.14.md"
      version={3}
      lines={LINES}
      visibleLines={visibleLines}
      saved={visibleLines >= LINES.length}
      onCopy={() => undefined}
      onClose={() => undefined}
    />
  );
}
