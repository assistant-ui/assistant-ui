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
} from "@assistant-ui/ui/components/assistant-ui/elements/tool-timeline.tsx";
import { defineSections } from "../types";
import { State, States, noop } from "./_states";

const STEPS: TimelineStep[] = [
  { verb: "Thinking", chip: "planning the change", icon: SparklesIcon },
  { verb: "Read", chip: "thread.tsx", icon: FileSearchIcon },
  { verb: "Ran", chip: "pnpm vitest", icon: TerminalIcon },
  { verb: "Edited", chip: "composer.tsx", icon: PenLineIcon },
];

const STATS: TimelineStat[] = [
  { file: "composer.tsx", added: 14, removed: 3 },
  { file: "use-draft.ts", added: 42 },
  { file: "legacy-draft-store.ts", removed: 58 },
];

const TIMELINE = {
  steps: STEPS,
  restingLabel: "4 steps · 3 files changed",
  activeLabel: "Working for 12s",
  stats: STATS,
};

function InteractiveTimeline() {
  const [open, setOpen] = useState(true);
  return (
    <ToolTimeline
      {...TIMELINE}
      visibleSteps={STEPS.length}
      streaming={false}
      open={open}
      onOpenChange={setOpen}
    />
  );
}

export default defineSections([
  {
    id: "tool-timeline",
    title: "Tool timeline",
    category: "agents",
    notes: "A finished run, open, with its file stats; the header toggles.",
    render: () => <InteractiveTimeline />,
  },
  {
    id: "tool-timeline-states",
    title: "Tool timeline states",
    category: "agents",
    notes: "Streaming the second step, and the resting summary closed.",
    render: () => (
      <States>
        <State label="streaming, 2 of 4">
          <ToolTimeline
            {...TIMELINE}
            visibleSteps={2}
            streaming
            open
            onOpenChange={noop}
          />
        </State>
        <State label="done, closed">
          <ToolTimeline
            {...TIMELINE}
            visibleSteps={STEPS.length}
            streaming={false}
            open={false}
            onOpenChange={noop}
          />
        </State>
      </States>
    ),
  },
]);
