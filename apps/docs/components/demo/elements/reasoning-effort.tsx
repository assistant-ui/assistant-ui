"use client";

import { useState } from "react";
import {
  ReasoningEffort,
  type EffortLevel,
} from "@/components/elements/reasoning-effort";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const LEVELS: readonly EffortLevel[] = [
  { key: "low", label: "Low", budget: 2_000 },
  { key: "medium", label: "Medium", budget: 8_000 },
  { key: "high", label: "High", budget: 24_000 },
  { key: "max", label: "Max", budget: 64_000 },
];

const PHASES = [900, 900, 900, 900, 0] as const;
const SPENT = [0.14, 0.29, 0.41, 0.52, 0.58] as const;

export function ReasoningEffortDemo() {
  const { phase } = useStoryPhases(PHASES);
  const [selectedKey, setSelectedKey] = useState("high");
  const level = LEVELS.find((item) => item.key === selectedKey);
  const budget = level?.budget ?? 0;
  const ratio = SPENT[Math.min(phase, SPENT.length - 1)] ?? 0;

  return (
    <ReasoningEffort
      levels={LEVELS}
      selectedKey={selectedKey}
      spent={Math.round(budget * ratio)}
      onSelect={setSelectedKey}
    />
  );
}
