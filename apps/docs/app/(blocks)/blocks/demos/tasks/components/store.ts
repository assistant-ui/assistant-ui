"use client";

import { useSyncExternalStore } from "react";

/* -------------------------------------------------------------------------- */
/* Tasks: what to do, and when. Kept in the browser's local storage.          */
/* -------------------------------------------------------------------------- */

export type Schedule = {
  repeat: "once" | "daily" | "weekdays" | "weekly";
  /** Local 24-hour time, HH:MM. */
  time: string;
  /** YYYY-MM-DD, for a task that runs once. */
  date?: string | undefined;
  /** 0 is Sunday, for a weekly task. */
  weekday?: number | undefined;
};

export type Run = {
  id: string;
  at: number;
  status: "running" | "done" | "failed";
  text: string;
  tokens: number;
};

export type Task = {
  id: string;
  title: string;
  /** What the model is asked each time the task runs. */
  prompt: string;
  schedule: Schedule;
  paused: boolean;
  createdAt: number;
  /** When the schedule last fired, so each due time fires once. */
  firedAt: number | null;
  /** Newest first. */
  runs: readonly Run[];
};

const KEY = "aui-block-tasks-v1";
const RUNS_KEPT = 20;
const none: readonly Task[] = [];

let tasks: readonly Task[] | null = null;
const listeners = new Set<() => void>();

function read(): readonly Task[] {
  if (tasks) return tasks;
  try {
    const saved = window.localStorage.getItem(KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    tasks = Array.isArray(parsed) ? (parsed as Task[]) : [];
  } catch {
    // Storage can be refused, as in a private window.
    tasks = [];
  }
  // A run cut short by a reload never finished.
  tasks = tasks.map((task) => ({
    ...task,
    runs: task.runs.map((run) =>
      run.status === "running"
        ? { ...run, status: "failed" as const, text: "The page closed first." }
        : run,
    ),
  }));
  return tasks;
}

function write(next: readonly Task[]) {
  tasks = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // The tasks still live in the page.
  }
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useTasks() {
  return useSyncExternalStore(subscribe, read, () => none);
}

export const getTasks = () => read();

const newId = () => Math.random().toString(36).slice(2, 10);

export function createTask(
  input: Pick<Task, "title" | "prompt" | "schedule">,
): Task {
  const task: Task = {
    ...input,
    id: newId(),
    paused: false,
    createdAt: Date.now(),
    firedAt: null,
    runs: [],
  };
  write([task, ...read()]);
  return task;
}

export function updateTask(
  id: string,
  change: Partial<Pick<Task, "title" | "prompt" | "schedule" | "paused">>,
): Task | null {
  let updated: Task | null = null;
  write(
    read().map((task) => {
      if (task.id !== id) return task;
      updated = {
        ...task,
        ...change,
        // A new time is measured from now, so a past one does not fire at once.
        ...(change.schedule && { firedAt: Date.now() }),
      };
      return updated;
    }),
  );
  return updated;
}

export function deleteTask(id: string) {
  const before = read();
  write(before.filter((task) => task.id !== id));
  return before.length !== read().length;
}

export function clearTasks() {
  write([]);
}

function patchRun(taskId: string, runId: string, change: Partial<Run>) {
  write(
    read().map((task) =>
      task.id === taskId
        ? {
            ...task,
            runs: task.runs.map((run) =>
              run.id === runId ? { ...run, ...change } : run,
            ),
          }
        : task,
    ),
  );
}

/** Sends the task's prompt to the model and keeps the reply as a run. */
export async function runTask(id: string) {
  const task = read().find((entry) => entry.id === id);
  if (!task || task.runs.some((run) => run.status === "running")) return;

  const run: Run = {
    id: newId(),
    at: Date.now(),
    status: "running",
    text: "",
    tokens: 0,
  };
  write(
    read().map((entry) =>
      entry.id === id
        ? {
            ...entry,
            firedAt: run.at,
            runs: [run, ...entry.runs].slice(0, RUNS_KEPT),
          }
        : entry,
    ),
  );

  try {
    const response = await fetch("/blocks/demos/tasks/api/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: task.title, prompt: task.prompt }),
    });
    if (!response.ok) throw new Error(await response.text());
    const body = (await response.json()) as { text: string; tokens: number };
    patchRun(id, run.id, {
      status: "done",
      text: body.text,
      tokens: body.tokens,
    });
  } catch (error) {
    patchRun(id, run.id, {
      status: "failed",
      text: error instanceof Error ? error.message : "The run failed.",
    });
  }
}

/* -------------------------------------------------------------------------- */
/* The schedule: when a task next runs                                        */
/* -------------------------------------------------------------------------- */

function at(day: Date, time: string) {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const moment = new Date(day);
  moment.setHours(hours, minutes, 0, 0);
  return moment;
}

/** The first time the schedule falls after `after`, or none for a one-off that has passed. */
export function nextAfter(schedule: Schedule, after: number): Date | null {
  if (schedule.repeat === "once") {
    const day = schedule.date ? new Date(`${schedule.date}T00:00`) : new Date();
    const moment = at(day, schedule.time);
    return moment.getTime() > after ? moment : null;
  }
  for (let offset = 0; offset < 8; offset += 1) {
    const day = new Date(after);
    day.setDate(day.getDate() + offset);
    const moment = at(day, schedule.time);
    if (moment.getTime() <= after) continue;
    const weekday = moment.getDay();
    if (schedule.repeat === "weekdays" && (weekday === 0 || weekday === 6))
      continue;
    if (schedule.repeat === "weekly" && weekday !== (schedule.weekday ?? 1))
      continue;
    return moment;
  }
  return null;
}

/** When the task next runs: a time that is due is in the past until it fires. */
export const nextRun = (task: Task) =>
  nextAfter(task.schedule, task.firedAt ?? task.createdAt);

/** Runs every task whose time has come. One missed run is made up for; the rest are skipped. */
export function runDue(now = Date.now()) {
  for (const task of read()) {
    if (task.paused) continue;
    const next = nextRun(task);
    if (next && next.getTime() <= now) void runTask(task.id);
  }
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export const formatTime = (moment: Date | number) => timeFormat.format(moment);
export const formatDate = (moment: Date | number) => dateFormat.format(moment);

/** The schedule in words: "Weekdays at 8:00 AM". */
export function describe(schedule: Schedule) {
  const time = formatTime(at(new Date(), schedule.time));
  if (schedule.repeat === "daily") return `Every day at ${time}`;
  if (schedule.repeat === "weekdays") return `Weekdays at ${time}`;
  if (schedule.repeat === "weekly")
    return `${WEEKDAYS[schedule.weekday ?? 1]}s at ${time}`;
  const day = schedule.date ? new Date(`${schedule.date}T00:00`) : new Date();
  return `Once, ${formatDate(day)} at ${time}`;
}

/* -------------------------------------------------------------------------- */
/* The task that is open, which the sidebar, the page and the tools share     */
/* -------------------------------------------------------------------------- */

let selected: string | null = null;

export function select(id: string | null) {
  if (selected === id) return;
  selected = id;
  for (const listener of listeners) listener();
}

export const getSelected = () => selected;

export function useSelected() {
  return useSyncExternalStore(
    subscribe,
    () => selected,
    () => null,
  );
}
