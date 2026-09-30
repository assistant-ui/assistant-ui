import {
  ScoreBreakdown,
  type ScoreCriterion,
} from "@assistant-ui/ui/components/assistant-ui/elements/score-breakdown.tsx";
import { defineSections } from "../types";

const CRITERIA: readonly ScoreCriterion[] = [
  {
    label: "Fixes the root cause",
    score: 4.5,
    weight: 3,
    note: "Moves the style into a nonce-carrying stylesheet.",
  },
  { label: "Test coverage", score: 4, weight: 2 },
  {
    label: "Scope discipline",
    score: 3,
    weight: 1,
    note: "Carries an unrelated formatting change.",
  },
];

export default defineSections([
  {
    id: "score-breakdown",
    title: "Score breakdown",
    category: "content",
    notes: "A weighted review score with notes, all criteria revealed.",
    render: () => (
      <ScoreBreakdown
        verdict="approve"
        total={4.1}
        outOf={5}
        criteria={CRITERIA}
        visibleCount={CRITERIA.length}
      />
    ),
  },
]);
