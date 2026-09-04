"use client";

import { useSyncExternalStore } from "react";
import { taskStore } from "./task-store";

export const TaskPanel = () => {
  const tasks = useSyncExternalStore(
    taskStore.subscribe,
    taskStore.getSnapshot,
    taskStore.getSnapshot,
  );

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-semibold">Tasks</h2>
      {tasks.length === 0 && (
        <p className="text-muted-foreground text-sm">No tasks yet.</p>
      )}
      <ul className="flex flex-col gap-1">
        {tasks.map((task) => (
          <li key={task.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={task.done}
                onChange={(e) => taskStore.setDone(task.id, e.target.checked)}
              />
              <span
                className={
                  task.done ? "text-muted-foreground line-through" : ""
                }
              >
                {task.title}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};
