"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { taskStore, type Task } from "@/lib/task-store";

const EMPTY: readonly Task[] = [];
const getServerSnapshot = () => EMPTY;

export function TaskBoard() {
  const tasks = useSyncExternalStore(
    taskStore.subscribe,
    taskStore.getSnapshot,
    getServerSnapshot,
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Task board</h2>
        <Badge variant="secondary">
          {tasks.filter((task) => task.done).length}/{tasks.length} done
        </Badge>
      </div>
      {tasks.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          The board is empty. Ask an agent to add a task.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              {task.done ? (
                <CheckCircle2Icon className="size-4 shrink-0 text-green-600" />
              ) : (
                <CircleIcon className="text-muted-foreground size-4 shrink-0" />
              )}
              <span
                className={
                  task.done ? "text-muted-foreground line-through" : ""
                }
              >
                {task.title}
              </span>
              <span className="text-muted-foreground ml-auto font-mono text-xs">
                {task.id}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
