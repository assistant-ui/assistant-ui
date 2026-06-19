"use generative";

import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { defineToolkit, stubTool } from "@assistant-ui/react";
import { manageNotesParameters, manageTasksParameters } from "./state";

export default defineToolkit({
  manage_tasks: {
    description:
      'Manage tasks on the task board. Actions: "add" (requires title), "toggle" (requires id), "remove" (requires id), "clear" (no extra fields).',
    parameters: manageTasksParameters,
    execute: stubTool(),
    render: ToolFallback,
  },
  manage_notes: {
    description:
      'Manage the sticky-note collection. Actions: "add" (optionally pass initial title/content/color/select; returns noteId), "select" (requires noteId), "remove" (requires noteId), "clear" (removes all notes). To edit an existing note\'s title, content, or color, use the auto-generated update_note tool with that note\'s id.',
    parameters: manageNotesParameters,
    execute: stubTool(),
    render: ToolFallback,
  },
});
