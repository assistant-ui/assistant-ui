"use client";

import { AgentPlan } from "@/components/assistant-ui/elements/agent-plan";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const STEPS = [
  {
    id: "read",
    label: "Read existing composer state",
    description: "Trace the current data flow before changing it.",
  },
  {
    id: "design",
    label: "Design the draft store",
    description: "Keep pending changes local until they are ready.",
  },
  { id: "wire", label: "Wire runtime persistence" },
  { id: "test", label: "Add regression tests" },
  { id: "docs", label: "Update the docs" },
] as const;

const PHASES = [1900, 1900, 1900, 1900, 1900, 2400] as const;

export function AgentPlanDemo() {
  const { phase } = useStoryPhases(PHASES);

  return <AgentPlan title="Composer draft" steps={STEPS} activeIndex={phase} />;
}
