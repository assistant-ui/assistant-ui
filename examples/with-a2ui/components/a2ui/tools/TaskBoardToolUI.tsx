"use client";

import { useEffect, useRef } from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { useA2ui } from "@assistant-ui/react-a2ui";
import { dismissOtherSurfaces } from "./surface-utils";

type TaskItem = {
  id: string;
  text: string;
  status: "todo" | "in-progress" | "done";
};
type TaskResult = { title: string; tasks: TaskItem[] };

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

export const TaskBoardToolUI = makeAssistantToolUI<
  { title: string; tasks: string[] },
  TaskResult
>({
  toolName: "create_task_board",
  render: ({ result }) => {
    const { processMessage } = useA2ui();
    const created = useRef(false);

    useEffect(() => {
      if (!result || created.current) return;
      created.current = true;

      dismissOtherSurfaces(processMessage, "tasks");
      processMessage({ type: "createSurface", surfaceId: "tasks" });
      processMessage({
        type: "updateComponents",
        surfaceId: "tasks",
        components: [
          {
            type: "Card",
            id: "tasks-card",
            props: {
              title: result.title,
              subtitle: `${result.tasks.length} tasks`,
            },
          },
          ...result.tasks.map((t) => ({
            type: "Row",
            id: t.id,
            props: {
              label: t.text,
              detail: STATUS_LABELS[t.status] ?? t.status,
              price: "",
              highlight: t.status === "in-progress",
            },
          })),
          { type: "Divider", id: "tasks-divider" },
          {
            type: "Text",
            id: "tasks-note",
            props: { value: "Click a task to update its status" },
          },
        ],
      });
    }, [result, processMessage]);

    if (!result)
      return (
        <p className="text-muted-foreground text-sm">Creating task board...</p>
      );
    return (
      <p className="text-muted-foreground text-sm">
        Created task board "{result.title}" with {result.tasks.length} tasks.
        Manage them in the sidebar.
      </p>
    );
  },
});
