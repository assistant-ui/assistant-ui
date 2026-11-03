"use client";

import { AgentStatus } from "@/components/assistant-ui/elements/agent-status";
import { defineStates } from "./types";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "running",
    label: "Working",
    note: "The agent is busy and shows how long it has been at it.",
    Component: () => (
      <AgentStatus
        state="working"
        label="Refactoring composer"
        elapsed="0:24"
      />
    ),
  },
  {
    key: "requires-action",
    label: "Waiting",
    note: "The agent is blocked until the user approves a step.",
    Component: () => (
      <AgentStatus
        state="waiting"
        label="Waiting for approval"
        elapsed="1:02"
      />
    ),
  },
  {
    key: "success",
    label: "Done",
    note: "The run finished and the timer is hidden.",
    Component: () => (
      <AgentStatus state="done" label="Finished, 2 files changed" />
    ),
  },
  {
    key: "error",
    label: "Failed",
    note: "The run ended with an error and offers a retry.",
    Component: () => (
      <AgentStatus state="failed" label="Tests failed, 3 errors" />
    ),
  },
  {
    key: "long-content",
    label: "Long label",
    note: "A long status truncates inside the pill.",
    Component: () => (
      <AgentStatus
        state="working"
        label="Regenerating the API reference for every package in the monorepo"
        elapsed="14:08"
      />
    ),
  },
]);
