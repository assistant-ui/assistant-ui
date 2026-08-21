"use client";

import {
  BackgroundInbox,
  type BackgroundRun,
} from "@/components/elements/background-inbox";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const RUNS: readonly BackgroundRun[] = [
  {
    id: "1",
    title: "Audit the adapters for parity gaps",
    state: "ready",
    elapsed: "4m",
    summary: "6 gaps found",
  },
  {
    id: "2",
    title: "Regenerate the API reference",
    state: "running",
    elapsed: "1m",
  },
  {
    id: "3",
    title: "Bump dependencies",
    state: "failed",
    elapsed: "2m",
    summary: "lockfile conflict",
  },
];

const PHASES = [2200, 0] as const;

export function BackgroundInboxDemo() {
  const { phase } = useStoryPhases(PHASES);

  const runs =
    phase === 0
      ? RUNS
      : RUNS.map((run) =>
          run.state === "running"
            ? {
                ...run,
                state: "ready" as const,
                elapsed: "3m",
                summary: "142 pages written",
              }
            : run,
        );

  return <BackgroundInbox runs={runs} />;
}
