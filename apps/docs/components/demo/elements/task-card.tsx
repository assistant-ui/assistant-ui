"use client";

import { useState } from "react";
import { TaskCard } from "@/components/assistant-ui/elements/task-card";
import {
  formatSeconds,
  useElapsed,
  useStoryPhases,
} from "@/components/demo/hooks/use-demo";

const PHASES = [4200, 3000] as const;

export function TaskCardDemo() {
  const [open, setOpen] = useState(false);
  const { phase, running } = useStoryPhases(PHASES);
  const done = phase === 1;
  const elapsed = useElapsed(running && !done);

  return (
    <TaskCard
      label="Review the runtime"
      meta="research"
      state={done ? "done" : "working"}
      elapsed={done ? undefined : formatSeconds(elapsed)}
      result={done ? "Found the relevant runtime path." : undefined}
      open={open}
      onOpenChange={setOpen}
    >
      <p>Read the runtime entry point.</p>
      <p>Checked the thread lifecycle.</p>
      <p>Prepared the findings.</p>
    </TaskCard>
  );
}
