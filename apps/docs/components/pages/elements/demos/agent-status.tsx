"use client";

import {
  AgentStatus,
  type StatusStep,
} from "@/components/elements/agent-status";
import {
  formatSeconds,
  useElapsed,
  useStoryPhases,
} from "@/components/demo/use-demo";

const PHASES = [3200, 2400, 2600, 3000] as const;
const STEPS: StatusStep[] = [
  { state: "working", label: "Refactoring composer" },
  { state: "waiting", label: "Waiting for approval" },
  { state: "working", label: "Running tests" },
  { state: "done", label: "Finished, 2 files changed" },
];

export function AgentStatusDemo() {
  const { phase, running } = useStoryPhases(PHASES);
  const step = STEPS[phase]!;
  const elapsed = useElapsed(running && step.state !== "done");

  return (
    <AgentStatus
      state={step.state}
      label={step.label}
      elapsed={formatSeconds(elapsed)}
    />
  );
}
