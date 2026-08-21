"use client";

import { AgentHandoff } from "@/components/elements/agent-handoff";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const CARRIED = [
  "The failing test and its output",
  "The two files the reader already narrowed to",
];

const PHASES = [1800, 0] as const;

export function AgentHandoffDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <AgentHandoff
      from="Triage"
      to="Maintainer"
      reason="Triage reproduced the report and narrowed it to the converter, so the fix goes to the agent that can write and verify a patch."
      carried={CARRIED}
      settled={phase >= 1}
    />
  );
}
