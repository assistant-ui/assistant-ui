"use client";

import {
  ScoreBreakdown,
  type ScoreCriterion,
} from "@/components/assistant-ui/elements/score-breakdown";
import { defineStates } from "./types";

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

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "The verdict is in and only the first criterion has arrived.",
    Component: () => (
      <ScoreBreakdown
        verdict="approve"
        total={4.1}
        outOf={5}
        criteria={CRITERIA}
        visibleCount={1}
      />
    ),
  },
  {
    key: "mixed",
    label: "Mixed",
    note: "A middling score reads amber.",
    Component: () => (
      <ScoreBreakdown
        verdict="needs changes"
        total={3.1}
        outOf={5}
        criteria={[
          { label: "Fixes the root cause", score: 4, weight: 3 },
          {
            label: "Test coverage",
            score: 2,
            weight: 2,
            note: "No test covers the remote thread case.",
          },
          { label: "Scope discipline", score: 2.5, weight: 1 },
        ]}
        visibleCount={3}
      />
    ),
  },
  {
    key: "failing",
    label: "Failing",
    note: "A low score reads red, with the criteria that pulled it down.",
    Component: () => (
      <ScoreBreakdown
        verdict="reject"
        total={1.6}
        outOf={5}
        criteria={[
          {
            label: "Fixes the root cause",
            score: 1,
            weight: 3,
            note: "Hides the symptom with a retry instead of fixing the race.",
          },
          { label: "Test coverage", score: 2, weight: 2 },
          { label: "Scope discipline", score: 2.5, weight: 1 },
        ]}
        visibleCount={3}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long criteria",
    note: "Long labels truncate and long notes wrap under their bars.",
    Component: () => (
      <ScoreBreakdown
        verdict="approve"
        total={8.3}
        outOf={10}
        criteria={[
          {
            label:
              "Handles every error path the API documents, including rate limits",
            score: 9,
            weight: 3,
            note: "Retries 429 and 529 with backoff, surfaces 400s to the user, and logs the request id for every failure so support can trace it.",
          },
          {
            label:
              "Keeps the public types backward compatible for existing users",
            score: 7.5,
            weight: 2,
          },
          { label: "Docs", score: 8, weight: 1 },
        ]}
        visibleCount={3}
      />
    ),
  },
]);
