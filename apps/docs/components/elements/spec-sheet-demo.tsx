"use client";

import { SpecSheet, type SpecRow } from "@/components/elements/spec-sheet";
import { useStoryPhases } from "./use-demo";

const ROWS: readonly SpecRow[] = [
  { label: "context", value: "500,000 tokens" },
  { label: "input", value: "$15.00 / M" },
  { label: "output", value: "$75.00 / M" },
  { label: "vision", value: "yes" },
  { label: "knowledge", value: "May 2026" },
  { label: "best for", value: "Long agentic runs", emphasis: true },
];

const PHASES = [260, 260, 260, 260, 260, 0] as const;

export function SpecSheetDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <SpecSheet
      title="Opus 5"
      subtitle="claude-opus-5"
      rows={ROWS}
      visibleCount={Math.min(phase + 1, ROWS.length)}
    />
  );
}
