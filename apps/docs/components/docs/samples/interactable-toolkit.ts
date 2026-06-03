"use generative";

import { defineToolkit, stubTool } from "@assistant-ui/react";
import { manageTasksParameters } from "./interactable-state";

export default defineToolkit({
  manage_tasks: {
    description:
      'Manage tasks on the task board. Actions: "add" (requires title), "toggle" (requires id), "remove" (requires id), "clear" (no extra fields).',
    parameters: manageTasksParameters,
    // The generative compiler strips this stub; TaskBoardToolOverrides provides the real executor.
    execute: stubTool(),
    renderText: {
      running: ({ args }) => `Updating tasks: ${args.action}`,
      complete: "Tasks updated",
    },
  },
});
