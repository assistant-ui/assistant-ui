"use client";

import {
  MemoryChips,
  type MemoryChip,
} from "@/components/elements/memory-chips";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const CHIPS: readonly MemoryChip[] = [
  { id: "1", text: "Prefers TypeScript", change: "existing" },
  { id: "2", text: "Works in a pnpm monorepo", change: "existing" },
  { id: "3", text: "Ships with changesets", change: "added" },
  { id: "4", text: "Reviews before merging", change: "added" },
];

const PHASES = [1400, 900, 0] as const;

export function MemoryChipsDemo() {
  const { phase } = useStoryPhases(PHASES);

  return <MemoryChips chips={CHIPS.slice(0, 2 + phase)} />;
}
