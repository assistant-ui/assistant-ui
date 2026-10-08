"use client";

import { useState } from "react";
import {
  JobProgress,
  type JobStage,
} from "@/components/assistant-ui/elements/job-progress";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const STAGES: readonly JobStage[] = [
  { name: "clone", weight: 1, description: "Fetching the branch" },
  { name: "install", weight: 4, description: "Restoring dependencies" },
  { name: "build", weight: 3, description: "Compiling packages" },
  { name: "test", weight: 2, description: "Running the suite" },
];

const PHASES = [1000, 1000, 1000, 1000, 0] as const;
const ETAS = ["about 4 min", "about 3 min", "about 1 min", "seconds"] as const;

export function JobProgressDemo() {
  const { phase, takeOver } = useStoryPhases(PHASES);
  const [cancelledAt, setCancelledAt] = useState<number | undefined>();
  const stageIndex = cancelledAt ?? phase;
  const finished = cancelledAt === undefined && phase === STAGES.length;

  return (
    <JobProgress
      title="Verify the fix on CI"
      stages={STAGES}
      stageIndex={stageIndex}
      stageProgress={0.6}
      eta={ETAS[Math.min(stageIndex, ETAS.length - 1)] ?? "seconds"}
      onCancel={() => {
        takeOver();
        setCancelledAt(phase);
      }}
      outcome={
        cancelledAt !== undefined
          ? {
              status: "cancelled",
              summary: `Cancelled during ${STAGES[cancelledAt]?.name ?? "the run"}.`,
            }
          : finished
            ? {
                status: "partial",
                summary:
                  "Build passed. Tests stopped after the preview timed out.",
              }
            : undefined
      }
      elapsedMs={finished ? 72_000 : undefined}
    />
  );
}
