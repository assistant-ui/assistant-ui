"use client";

import { JobProgress, type JobStage } from "@/components/elements/job-progress";
import { useStoryPhases } from "./use-demo";

const STAGES: readonly JobStage[] = [
  { name: "clone", weight: 1 },
  { name: "install", weight: 4 },
  { name: "build", weight: 3 },
  { name: "test", weight: 2 },
];

const PHASES = [1000, 1000, 1000, 1000, 0] as const;
const ETAS = ["about 4 min", "about 3 min", "about 1 min", "seconds"] as const;

export function JobProgressDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <JobProgress
      title="Verify the fix on CI"
      stages={STAGES}
      stageIndex={phase}
      stageProgress={0.6}
      eta={ETAS[Math.min(phase, ETAS.length - 1)] ?? "seconds"}
    />
  );
}
