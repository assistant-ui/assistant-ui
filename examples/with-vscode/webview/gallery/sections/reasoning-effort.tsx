import { useState } from "react";
import {
  ReasoningEffort,
  type EffortLevel,
} from "@assistant-ui/ui/components/assistant-ui/elements/reasoning-effort.tsx";
import { defineSections } from "../types";

const LEVELS: readonly EffortLevel[] = [
  { key: "low", label: "Low", budget: 2_000 },
  { key: "medium", label: "Medium", budget: 8_000 },
  { key: "high", label: "High", budget: 24_000 },
  { key: "max", label: "Max", budget: 64_000 },
];

function ReasoningEffortExample() {
  const [selectedKey, setSelectedKey] = useState("high");
  const budget = LEVELS.find((level) => level.key === selectedKey)?.budget ?? 0;
  return (
    <ReasoningEffort
      levels={LEVELS}
      selectedKey={selectedKey}
      spent={Math.round(budget * 0.58)}
      onSelect={setSelectedKey}
    />
  );
}

export default defineSections([
  {
    id: "reasoning-effort",
    title: "Reasoning effort",
    category: "chat",
    notes:
      "reasoning-effort.tsx (standalone): High selected, 58% of its budget spent.",
    render: () => <ReasoningEffortExample />,
  },
]);
