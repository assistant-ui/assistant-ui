"use client";

import {
  ScoreBreakdown,
  type ScoreCriterion,
} from "@/components/assistant-ui/elements/score-breakdown";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const CRITERIA: readonly ScoreCriterion[] = [
  {
    label: "Fixes the root cause",
    score: 4.5,
    weight: 3,
    note: "Clears the slot at the source rather than at the call site.",
  },
  { label: "Test coverage", score: 4, weight: 2 },
  {
    label: "Scope discipline",
    score: 3,
    weight: 1,
    note: "Carries an unrelated formatting change.",
  },
];

const PHASES = [600, 600, 0] as const;

export function ScoreBreakdownDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <ScoreBreakdown
      verdict="approve"
      total={4.1}
      outOf={5}
      criteria={CRITERIA}
      visibleCount={Math.min(phase + 1, CRITERIA.length)}
    />
  );
}
