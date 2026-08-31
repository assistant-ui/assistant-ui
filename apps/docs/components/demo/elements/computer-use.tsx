"use client";

import {
  ComputerUse,
  type ComputerStep,
} from "@/components/assistant-ui/elements/computer-use";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const STEPS: readonly ComputerStep[] = [
  { id: "1", action: "click", target: "Issues tab", x: 22, y: 18 },
  { id: "2", action: "type", target: '"draft restore"', x: 48, y: 32 },
  { id: "3", action: "click", target: "First result", x: 34, y: 58 },
  { id: "4", action: "scroll", target: "to the repro steps", x: 62, y: 78 },
];

const PHASES = [1300, 1300, 1300, 0] as const;

export function ComputerUseDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <ComputerUse
      url="github.com/assistant-ui/assistant-ui/issues"
      steps={STEPS}
      activeIndex={phase}
    >
      <div className="flex flex-col gap-2 p-4">
        <span className="bg-foreground/[0.07] h-3 w-28 rounded" />
        <span className="bg-foreground/[0.05] h-2.5 w-full rounded" />
        <span className="bg-foreground/[0.05] h-2.5 w-4/5 rounded" />
        <span className="bg-foreground/[0.05] h-2.5 w-2/3 rounded" />
        <span className="bg-foreground/[0.07] mt-2 h-3 w-20 rounded" />
        <span className="bg-foreground/[0.05] h-2.5 w-3/4 rounded" />
      </div>
    </ComputerUse>
  );
}
