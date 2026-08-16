"use client";

import {
  SubagentList,
  type SubagentItem,
} from "@/components/elements/subagent-list";
import { useStoryPhases } from "./use-demo";

const AGENTS: readonly SubagentItem[] = [
  { name: "Explore the runtime", model: "haiku" },
  { name: "Fix composer types", model: "sonnet" },
  { name: "Write regression tests", model: "sonnet" },
];

const SUMMARY_AGENT: SubagentItem = {
  name: "Summarize findings",
  model: "haiku",
};
const PHASES = [1800, 1800, 2800] as const;
const PROGRESS = [
  [68, 44, 22],
  [100, 68, 44],
  [100, 100, 68],
] as const;

export function SubagentListDemo() {
  const { phase } = useStoryPhases(PHASES);
  const completedCount = phase === 0 ? 0 : phase === 1 ? 1 : 2;
  const progress =
    phase === 0 ? PROGRESS[0] : phase === 1 ? PROGRESS[1] : PROGRESS[2];

  return (
    <SubagentList
      agents={AGENTS}
      completedCount={completedCount}
      progress={progress}
      showSummary={phase === 2}
      summaryAgent={SUMMARY_AGENT}
    />
  );
}
