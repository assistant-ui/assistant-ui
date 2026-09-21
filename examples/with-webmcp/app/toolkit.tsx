"use generative";

import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";
import { taskStore } from "./task-store";

export default defineToolkit({
  add_task: {
    description: "Add a task to the user's task list.",
    parameters: z.object({
      title: z.string().describe("The task title"),
    }),
    execute: async ({ title }) => {
      "use client";
      return taskStore.add(title);
    },
    renderText: {
      running: "Adding task…",
      complete: ({ result }) => `Added task "${result.title}"`,
    },
  },
  list_tasks: {
    description: "List the tasks on the user's task list.",
    parameters: z.object({}),
    execute: async () => {
      "use client";
      return taskStore.getSnapshot();
    },
    renderText: {
      running: "Reading tasks…",
      complete: ({ result }) => `Found ${result.length} tasks`,
    },
  },
  clear_completed_tasks: {
    // A frontend tool renders inside the collapsed tool group, which would put
    // the approval prompt behind a disclosure the user has no reason to open.
    display: "standalone",
    description:
      "Remove every completed task from the user's task list. The UI asks the user to confirm before anything is removed, so call this directly instead of asking first.",
    parameters: z.object({}),
    execute: async (_args, { human }) => {
      "use client";
      const approved = (await human({})) === true;
      if (!approved) return { cleared: 0, message: "The user declined." };
      return { cleared: taskStore.clearCompleted() };
    },
    render: ({ result, interrupt, resume }) => {
      if (result) {
        return (
          <p className="text-muted-foreground text-sm">
            {result.cleared > 0
              ? `Cleared ${result.cleared} completed task(s).`
              : (result.message ?? "No completed tasks to clear.")}
          </p>
        );
      }
      if (interrupt) {
        return (
          <div className="border-border bg-muted/50 flex items-center gap-3 rounded-lg border p-3 text-sm">
            <span>Clear all completed tasks?</span>
            <button
              type="button"
              onClick={() => resume(true)}
              className="bg-primary text-primary-foreground rounded-md px-3 py-1"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => resume(false)}
              className="border-border rounded-md border px-3 py-1"
            >
              Decline
            </button>
          </div>
        );
      }
      return (
        <p className="text-muted-foreground text-sm">
          Clearing completed tasks…
        </p>
      );
    },
  },
});
