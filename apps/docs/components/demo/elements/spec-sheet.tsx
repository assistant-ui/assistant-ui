"use client";

import {
  SpecSheet,
  type SpecRow,
} from "@/components/assistant-ui/elements/spec-sheet";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const ROWS: readonly SpecRow[] = [
  { label: "context", value: "1,000,000 tokens" },
  { label: "input", value: "$4.00 / M" },
  { label: "output", value: "$20.00 / M" },
  { label: "vision", value: "yes" },
  { label: "knowledge", value: "May 2026" },
  { label: "best for", value: "Long agentic runs", emphasis: true },
];

const PHASES = [260, 260, 260, 260, 260, 0] as const;

export function SpecSheetDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <SpecSheet
      title="Opus 5.5"
      subtitle="claude-opus-5-5"
      rows={ROWS}
      visibleCount={Math.min(phase + 1, ROWS.length)}
    />
  );
}
