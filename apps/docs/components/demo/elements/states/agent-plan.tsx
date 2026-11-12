"use client";

import { AgentPlan } from "@/components/assistant-ui/elements/agent-plan";
import { defineStates } from "./types";

const STEPS = [
  {
    id: "read",
    label: "Read existing composer state",
    description: "Trace the current data flow before changing it.",
  },
  {
    id: "design",
    label: "Design the draft store",
    description: "Keep pending changes local until they are ready.",
  },
  { id: "wire", label: "Wire runtime persistence" },
  { id: "test", label: "Add regression tests" },
  { id: "docs", label: "Update the docs" },
] as const;

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "in-progress",
    label: "In progress",
    note: "Two steps are done and the third is running with its detail shown.",
    Component: () => (
      <AgentPlan
        title="Composer draft"
        steps={[
          ...STEPS.slice(0, 2),
          {
            id: "wire",
            label: "Wire runtime persistence",
            description: "Save drafts to runtime.drafts on every change.",
          },
          ...STEPS.slice(3),
        ]}
        activeIndex={2}
      />
    ),
  },
  {
    key: "success",
    label: "Done",
    note: "Every step is complete.",
    Component: () => (
      <AgentPlan title="Composer draft" steps={STEPS} activeIndex={5} />
    ),
  },
  {
    key: "empty",
    label: "Empty",
    note: "A plan with no steps yet.",
    Component: () => (
      <AgentPlan title="Composer draft" steps={[]} activeIndex={0} />
    ),
  },
  {
    key: "long-content",
    label: "Long steps",
    note: "Long step labels and a long description wrap inside the same width.",
    Component: () => (
      <AgentPlan
        title="Migrate the thread list to the remote adapter"
        steps={[
          "Inventory every call site that reads from the local thread list store",
          {
            id: "adapter",
            label:
              "Implement the remote thread list adapter with optimistic renames and archive",
            description:
              "Mirror the local adapter's API so call sites keep working, then swap the store behind a feature flag for staged rollout.",
          },
          "Backfill existing threads into the remote store",
          "Remove the local store once the flag is on everywhere",
        ]}
        activeIndex={1}
      />
    ),
  },
]);
