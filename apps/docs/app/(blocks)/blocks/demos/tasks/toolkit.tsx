"use generative";

import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";
import { TaskReceipt } from "./components/task";
import {
  createTask,
  deleteTask,
  getTasks,
  nextRun,
  runTask,
  updateTask,
} from "./components/store";

const schedule = z.object({
  repeat: z
    .enum(["once", "daily", "weekdays", "weekly"])
    .describe("How often the task runs."),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .describe("Local 24-hour time, HH:MM."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("YYYY-MM-DD. Required when repeat is once."),
  weekday: z
    .number()
    .int()
    .min(0)
    .max(6)
    .optional()
    .describe("0 is Sunday. Required when repeat is weekly."),
});

const summary = (id: string) => {
  const task = getTasks().find((entry) => entry.id === id);
  if (!task) return { id, found: false as const };
  return {
    id,
    found: true as const,
    title: task.title,
    paused: task.paused,
    nextRun: nextRun(task)?.toISOString() ?? null,
  };
};

/* The tasks live in the browser, so every tool runs there. */
export default defineToolkit({
  create_task: {
    description:
      "Schedule a new task. Call it once the person has said what should happen and when.",
    parameters: z.object({
      title: z.string().max(60).describe("A short name, two to five words."),
      prompt: z
        .string()
        .max(2000)
        .describe(
          "The instruction the assistant is given each time the task runs, written so it stands on its own.",
        ),
      schedule,
    }),
    execute: async (input) => {
      "use client";
      return summary(createTask(input).id);
    },
    render: TaskReceipt,
  },
  update_task: {
    description:
      "Change a task's name, instruction or schedule, or pause and resume it. Send only what changes.",
    parameters: z.object({
      id: z.string(),
      title: z.string().max(60).optional(),
      prompt: z.string().max(2000).optional(),
      schedule: schedule.optional(),
      paused: z.boolean().optional(),
    }),
    execute: async ({ id, title, prompt, schedule: next, paused }) => {
      "use client";
      updateTask(id, {
        ...(title !== undefined && { title }),
        ...(prompt !== undefined && { prompt }),
        ...(next !== undefined && { schedule: next }),
        ...(paused !== undefined && { paused }),
      });
      return summary(id);
    },
    render: TaskReceipt,
  },
  delete_task: {
    description: "Delete a task for good. Only when the person asks for it.",
    parameters: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      "use client";
      const title = getTasks().find((entry) => entry.id === id)?.title;
      return { id, found: deleteTask(id), deleted: true as const, title };
    },
    render: TaskReceipt,
  },
  run_task: {
    description: "Run a task now, outside its schedule.",
    parameters: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      "use client";
      void runTask(id);
      return { ...summary(id), started: true as const };
    },
    render: TaskReceipt,
  },
});
