"use client";

import { useState } from "react";
import {
  ReasoningPanel,
  type ReasoningStep,
} from "@/components/elements/reasoning-panel";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const STEPS: ReasoningStep[] = [
  {
    title: "Reading the request",
    body: "The user wants drafts restored per thread, so the composer state has to move out of component state.",
  },
  {
    title: "Locating the seam",
    body: "Draft state already flows through the runtime; persisting it per thread id avoids a parallel store.",
  },
  {
    title: "Settling on an approach",
    body: "Keep a map keyed by thread id, hydrate on switch, and clear the entry once a message is sent.",
  },
];

const PHASES = [1700, 1900, 1800, 1600, 0] as const;

export function ReasoningPanelDemo() {
  const { phase, running, takeOver } = useStoryPhases(PHASES);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);

  const streaming = running && phase < STEPS.length;
  const open = running ? phase < STEPS.length + 1 : (userOpen ?? false);
  const visibleSteps = streaming ? phase + 1 : STEPS.length;

  return (
    <ReasoningPanel
      steps={STEPS}
      visibleSteps={visibleSteps}
      streaming={streaming}
      open={open}
      onOpenChange={(next) => {
        takeOver();
        setUserOpen(next);
      }}
      restingLabel="Thought for 5s"
    />
  );
}
