import { useState } from "react";
import {
  ReasoningPanel,
  type ReasoningStep,
} from "@assistant-ui/ui/components/assistant-ui/elements/reasoning-panel.tsx";
import { defineSections } from "../types";
import { State, States, noop } from "./_states";

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

function InteractivePanel() {
  const [open, setOpen] = useState(true);
  return (
    <ReasoningPanel
      steps={STEPS}
      visibleSteps={STEPS.length}
      streaming={false}
      open={open}
      onOpenChange={setOpen}
      restingLabel="Thought for 5s"
    />
  );
}

export default defineSections([
  {
    id: "reasoning-panel",
    title: "Reasoning panel",
    category: "agents",
    notes: "Finished and open on all three steps; the header toggles.",
    render: () => <InteractivePanel />,
  },
  {
    id: "reasoning-panel-states",
    title: "Reasoning panel states",
    category: "agents",
    notes:
      "Streaming the second step with elapsed time, and the resting label closed.",
    render: () => (
      <States>
        <State label="streaming, 2 of 3">
          <ReasoningPanel
            steps={STEPS}
            visibleSteps={2}
            streaming
            open
            onOpenChange={noop}
            restingLabel="Thought for 5s"
            elapsed="3s"
          />
        </State>
        <State label="done, closed">
          <ReasoningPanel
            steps={STEPS}
            visibleSteps={STEPS.length}
            streaming={false}
            open={false}
            onOpenChange={noop}
            restingLabel="Thought for 5s"
          />
        </State>
      </States>
    ),
  },
]);
