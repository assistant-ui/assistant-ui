"use generative";

import { defineToolkit, stubTool } from "@assistant-ui/react";
import { manageNotesParameters, manageTasksParameters } from "./state";

export default defineToolkit({
  manage_tasks: {
    description:
      'Manage tasks on the task board. Actions: "add" (requires title), "toggle" (requires id), "remove" (requires id), "clear" (no extra fields).',
    parameters: manageTasksParameters,
    // The real executor is provided by TaskBoardToolOverrides via useAuiToolOverrides().
    execute: stubTool(),
    renderText: {
      running: ({ args }) => `Updating tasks: ${args.action}`,
      complete: "Tasks updated",
    },
  },
  manage_notes: {
    description:
      'Manage sticky notes. Actions: "add" (creates a new note, returns its id), "remove" (requires noteId), "clear" (removes all notes). After adding, use the update_note_{id} tool to set its content.',
    parameters: manageNotesParameters,
    // The real executor is provided by NotesToolOverrides via useAuiToolOverrides().
    execute: stubTool(),
    renderText: {
      running: ({ args }) => `Updating notes: ${args.action}`,
      complete: "Notes updated",
    },
  },
});
