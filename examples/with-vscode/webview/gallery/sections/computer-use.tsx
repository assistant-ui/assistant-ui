import {
  ComputerUse,
  type ComputerStep,
} from "@assistant-ui/ui/components/assistant-ui/elements/computer-use.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const STEPS: readonly ComputerStep[] = [
  { id: "1", action: "click", target: "Issues tab", x: 22, y: 18 },
  { id: "2", action: "type", target: '"draft restore"', x: 48, y: 32 },
  { id: "3", action: "click", target: "First result", x: 34, y: 58 },
  {
    id: "4",
    action: "scroll",
    target: "to the reproduction steps at the bottom of a very long issue",
    x: 62,
    y: 78,
  },
];

function Page() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <span className="bg-foreground/[0.07] h-3 w-28 rounded" />
      <span className="bg-foreground/[0.05] h-2.5 w-full rounded" />
      <span className="bg-foreground/[0.05] h-2.5 w-4/5 rounded" />
      <span className="bg-foreground/[0.05] h-2.5 w-2/3 rounded" />
      <span className="bg-foreground/[0.07] mt-2 h-3 w-20 rounded" />
      <span className="bg-foreground/[0.05] h-2.5 w-3/4 rounded" />
    </div>
  );
}

const URL = "github.com/assistant-ui/assistant-ui/issues?q=is%3Aopen+draft";

export default defineSections([
  {
    id: "computer-use",
    title: "Computer use",
    category: "agents",
    notes:
      "The first action, and the last one with the pointer trail behind it.",
    render: () => (
      <States>
        <State label="step 1 of 4">
          <ComputerUse url={URL} steps={STEPS} activeIndex={0}>
            <Page />
          </ComputerUse>
        </State>
        <State label="step 4 of 4">
          <ComputerUse url={URL} steps={STEPS} activeIndex={3}>
            <Page />
          </ComputerUse>
        </State>
      </States>
    ),
  },
]);
