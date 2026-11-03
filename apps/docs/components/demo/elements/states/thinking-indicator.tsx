"use client";

import { ThinkingIndicator } from "@/components/assistant-ui/elements/thinking-indicator";
import { defineStates } from "./types";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "elapsed",
    label: "With timer",
    note: "The status line carries how long the agent has been working.",
    Component: () => <ThinkingIndicator label="Thinking" elapsed="0:14" />,
  },
  {
    key: "tool-step",
    label: "Tool step",
    note: "The label names the file the agent is reading right now.",
    Component: () => (
      <ThinkingIndicator label="Reading thread.tsx" elapsed="0:03" />
    ),
  },
  {
    key: "long-content",
    label: "Long label",
    note: "A label wider than the line truncates and keeps the timer visible.",
    Component: () => (
      <div className="w-64">
        <ThinkingIndicator
          label="Reading packages/react/src/legacy-runtime/runtime-cores/remote-thread-list/RemoteThreadListThreadListRuntimeCore.tsx"
          elapsed="2:41"
        />
      </div>
    ),
  },
]);
