"use client";

import {
  ReasoningEffort,
  type EffortLevel,
} from "@/components/assistant-ui/elements/reasoning-effort";
import { defineStates } from "./types";

const noop = () => {};

const LEVELS: readonly EffortLevel[] = [
  { key: "low", label: "Low", budget: 2_000 },
  { key: "medium", label: "Medium", budget: 8_000 },
  { key: "high", label: "High", budget: 24_000 },
  { key: "max", label: "Max", budget: 64_000 },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "not-started",
    label: "Not started",
    note: "A level is picked but the run has not spent any of its budget.",
    Component: () => (
      <ReasoningEffort
        levels={LEVELS}
        selectedKey="medium"
        spent={0}
        onSelect={noop}
      />
    ),
  },
  {
    key: "exhausted",
    label: "Budget spent",
    note: "The run used its whole thinking budget on the low setting.",
    Component: () => (
      <ReasoningEffort
        levels={LEVELS}
        selectedKey="low"
        spent={2_000}
        onSelect={noop}
      />
    ),
  },
  {
    key: "disabled",
    label: "Read only",
    note: "Without a select handler the levels show the setting but cannot change it.",
    Component: () => (
      <ReasoningEffort levels={LEVELS} selectedKey="max" spent={41_312} />
    ),
  },
]);
