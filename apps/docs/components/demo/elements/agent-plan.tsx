"use client";

import { AgentPlan } from "@/components/assistant-ui/elements/agent-plan";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const STEPS = [
  "Read existing composer state",
  "Design the draft store",
  "Wire runtime persistence",
  "Add regression tests",
  "Update the docs",
] as const;

const PHASES = [1900, 1900, 1900, 1900, 1900, 2400] as const;

export function AgentPlanDemo() {
  const { phase } = useStoryPhases(PHASES);

  return <AgentPlan steps={STEPS} activeIndex={phase} />;
}
