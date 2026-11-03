"use client";

import { inkButton } from "@/components/assistant-ui/elements/surfaces";
import { TaskCard } from "@/components/assistant-ui/elements/task-card";
import { cn } from "@/lib/utils";
import { defineStates } from "./types";

const noop = () => {};

const transcript = [
  "Read the runtime entry point.",
  "Checked the thread lifecycle.",
  "Prepared the findings.",
];

const base = {
  label: "Review the runtime",
  meta: "research",
  onOpenChange: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "running",
    label: "Working",
    note: "The task is in flight with no result yet.",
    Component: () => (
      <TaskCard {...base} state="working" elapsed="0:18" open={false}>
        {transcript.slice(0, 2).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </TaskCard>
    ),
  },
  {
    key: "requires-action",
    label: "Waiting",
    note: "The task paused until the user answers.",
    Component: () => (
      <TaskCard
        {...base}
        label="Deploy the docs preview"
        meta="deploy"
        state="waiting"
        elapsed="1:04"
        actions={
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              Needs approval to push to the preview branch.
            </span>
            <button
              type="button"
              onClick={noop}
              className={cn(
                inkButton,
                "flex h-7 shrink-0 items-center rounded-full px-3 font-medium",
              )}
            >
              Approve
            </button>
          </div>
        }
      />
    ),
  },
  {
    key: "success",
    label: "Done",
    note: "A finished task opened to show its transcript and result.",
    Component: () => (
      <TaskCard
        {...base}
        state="done"
        elapsed="0:42"
        result="Found the relevant runtime path in packages/react/src/runtime."
        open
      >
        {transcript.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </TaskCard>
    ),
  },
  {
    key: "error",
    label: "Failed",
    note: "The task stopped with an error as its result.",
    Component: () => (
      <TaskCard
        {...base}
        label="Run the e2e suite"
        meta="ci"
        state="failed"
        elapsed="3:12"
        result="Playwright timed out waiting for http://localhost:3000 after 120 seconds."
      />
    ),
  },
  {
    key: "cancelled",
    label: "Cancelled",
    note: "The user stopped the task before it finished.",
    Component: () => (
      <TaskCard
        {...base}
        label="Bump dependencies"
        meta="maintenance"
        state="cancelled"
        elapsed="0:09"
        result="Stopped by you."
      />
    ),
  },
  {
    key: "long-content",
    label: "Long label",
    note: "A long label and meta truncate in the header.",
    Component: () => (
      <TaskCard
        {...base}
        label="Audit every runtime adapter for missing thread list methods and document the gaps"
        meta="research-and-docs"
        state="working"
        elapsed="12:47"
      />
    ),
  },
]);
