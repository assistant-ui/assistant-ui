"use client";

import { useState } from "react";
import {
  FileSearchIcon,
  PenLineIcon,
  SparklesIcon,
  TerminalIcon,
} from "lucide-react";
import {
  ToolTimeline,
  type TimelineStat,
  type TimelineStep,
} from "@/components/elements/tool-timeline";
import { useElapsed, useStoryPhases } from "./use-demo";

const STEPS: TimelineStep[] = [
  {
    verb: "Thinking",
    chip: "planning the change",
    icon: SparklesIcon,
  },
  {
    verb: "Read",
    chip: "thread.tsx",
    icon: FileSearchIcon,
  },
  {
    verb: "Ran",
    chip: "pnpm vitest",
    icon: TerminalIcon,
  },
  {
    verb: "Edited",
    chip: "composer.tsx",
    icon: PenLineIcon,
  },
];

const STATS: TimelineStat[] = [
  { file: "composer.tsx", added: 14, removed: 3 },
  { file: "use-draft.ts", added: 42 },
];

const PHASES = [1000, 1000, 1000, 1000, 2400, 0] as const;

export function ToolTimelineDemo() {
  const { phase, running, takeOver } = useStoryPhases(PHASES);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);

  const streaming = running && phase < STEPS.length;
  const elapsed = useElapsed(streaming);
  const open = running ? phase !== PHASES.length - 1 : (userOpen ?? false);
  const visibleSteps = streaming ? phase + 1 : STEPS.length;

  return (
    <ToolTimeline
      steps={STEPS}
      visibleSteps={visibleSteps}
      streaming={streaming}
      open={open}
      onOpenChange={(next) => {
        takeOver();
        setUserOpen(next);
      }}
      restingLabel="4 steps · 2 files changed"
      activeLabel={`Working for ${Math.floor(elapsed / 10)}s`}
      stats={STATS}
    />
  );
}
