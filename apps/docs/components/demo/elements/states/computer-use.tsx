"use client";

import {
  ComputerUse,
  type ComputerStep,
} from "@/components/assistant-ui/elements/computer-use";
import { defineStates } from "./types";

const STEPS: readonly ComputerStep[] = [
  { id: "1", action: "click", target: "Issues tab", x: 22, y: 18 },
  { id: "2", action: "type", target: '"draft restore"', x: 48, y: 32 },
  { id: "3", action: "click", target: "First result", x: 34, y: 58 },
  { id: "4", action: "scroll", target: "to the repro steps", x: 62, y: 78 },
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

const URL = "github.com/assistant-ui/assistant-ui/issues";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Idle",
    note: "The screen is open but the agent has not acted yet, so there is no cursor or caption.",
    Component: () => (
      <ComputerUse url={URL} steps={[]} activeIndex={0}>
        <Page />
      </ComputerUse>
    ),
  },
  {
    key: "first-step",
    label: "First step",
    note: "The first action, with no trail behind the cursor yet.",
    Component: () => (
      <ComputerUse url={URL} steps={STEPS} activeIndex={0}>
        <Page />
      </ComputerUse>
    ),
  },
  {
    key: "last-step",
    label: "Last step",
    note: "The final action, with the two previous positions fading behind the cursor.",
    Component: () => (
      <ComputerUse url={URL} steps={STEPS} activeIndex={STEPS.length - 1}>
        <Page />
      </ComputerUse>
    ),
  },
  {
    key: "long-content",
    label: "Long target",
    note: "A long URL and a long action target truncate on one line.",
    Component: () => (
      <ComputerUse
        url="console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fchat-api"
        steps={[
          {
            id: "1",
            action: "type",
            target:
              '"filter @message like /ThrottlingException/ | stats count(*) by bin(5m)"',
            x: 40,
            y: 26,
          },
        ]}
        activeIndex={0}
      >
        <Page />
      </ComputerUse>
    ),
  },
]);
