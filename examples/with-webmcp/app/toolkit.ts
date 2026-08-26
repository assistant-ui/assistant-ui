import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";
import { taskStore, type Task } from "@/lib/task-store";

export default defineToolkit({
  list_tasks: {
    type: "frontend",
    description:
      "List the tasks currently on the board, including each task's id, title, and completion state.",
    parameters: z.object({}),
    execute: (): { tasks: readonly Task[] } => ({
      tasks: taskStore.getSnapshot(),
    }),
    renderText: {
      running: "Reading the task board…",
      complete: ({ result }) =>
        result ? `Read ${result.tasks.length} tasks from the board` : null,
    },
  },
  add_task: {
    type: "frontend",
    description: "Add a new task to the board.",
    parameters: z.object({
      title: z.string().describe("Title of the task to add"),
    }),
    execute: ({ title }: { title: string }): Task => taskStore.addTask(title),
    renderText: {
      running: "Adding a task…",
      complete: ({ result }) =>
        result ? `Added task "${result.title}"` : null,
    },
  },
  set_task_done: {
    type: "frontend",
    description:
      "Mark a task as done or not done. Use the task id from list_tasks.",
    parameters: z.object({
      id: z.string().describe("Id of the task to update"),
      done: z.boolean().describe("Whether the task is completed"),
    }),
    execute: ({ id, done }: { id: string; done: boolean }): Task => {
      const task = taskStore.setTaskDone(id, done);
      if (!task) throw new Error(`No task with id "${id}"`);
      return task;
    },
    renderText: {
      running: "Updating a task…",
      complete: ({ result }) =>
        result
          ? `Marked "${result.title}" as ${result.done ? "done" : "not done"}`
          : null,
    },
  },
  remove_task: {
    type: "frontend",
    description:
      "Remove a task from the board. Use the task id from list_tasks.",
    parameters: z.object({
      id: z.string().describe("Id of the task to remove"),
    }),
    execute: ({ id }: { id: string }): Task => {
      const task = taskStore.removeTask(id);
      if (!task) throw new Error(`No task with id "${id}"`);
      return task;
    },
    renderText: {
      running: "Removing a task…",
      complete: ({ result }) =>
        result ? `Removed task "${result.title}"` : null,
    },
  },
});
