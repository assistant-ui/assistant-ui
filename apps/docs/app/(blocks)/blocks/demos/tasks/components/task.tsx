"use client";

import type { ReactNode } from "react";
import {
  Calendar03Icon,
  Delete01Icon,
  PauseIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import {
  deleteTask,
  describe,
  formatDate,
  formatTime,
  nextRun,
  runTask,
  select,
  updateTask,
  useTasks,
  type Run,
  type Task,
} from "./store";
import {
  Icon,
  Tip,
  field,
  focusRing,
  iconButton,
  inkButton,
  rItem,
  rSurface,
} from "./ui";

/* -------------------------------------------------------------------------- */
/* A task up close: when it runs, what it asks, and what each run produced    */
/* -------------------------------------------------------------------------- */

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "Today at 8:00 AM", "Tomorrow at 8:00 AM", "Fri, Nov 27 at 8:00 AM". */
export function formatWhen(moment: Date) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const day =
    sameDay(moment, today) || moment < today
      ? "Today"
      : sameDay(moment, tomorrow)
        ? "Tomorrow"
        : formatDate(moment);
  return `${day} at ${formatTime(moment)}`;
}

/** The line under a task's name: its next run, or why it has none. */
export function status(task: Task) {
  if (task.paused) return "Paused";
  const next = nextRun(task);
  return next ? `Next ${formatWhen(next)}` : "Done";
}

export function TaskDetail({ task }: { task: Task }) {
  const running = task.runs.some((run) => run.status === "running");

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 pt-2">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight wrap-break-word">
            {task.title}
          </h1>
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2">
            <Icon icon={Calendar03Icon} className="size-4" />
            {describe(task.schedule)}
            <span aria-hidden>·</span>
            {status(task)}
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => void runTask(task.id)}
          className={cn(inkButton, "h-8 shrink-0 px-3.5")}
        >
          Run now
        </button>
        <Tip label={task.paused ? "Resume" : "Pause"}>
          <button
            type="button"
            onClick={() => updateTask(task.id, { paused: !task.paused })}
            className={cn(iconButton, "size-8")}
          >
            <Icon icon={task.paused ? PlayIcon : PauseIcon} />
          </button>
        </Tip>
        <Tip label="Delete">
          <button
            type="button"
            onClick={() => {
              deleteTask(task.id);
              select(null);
            }}
            className={cn(iconButton, "size-8")}
          >
            <Icon icon={Delete01Icon} />
          </button>
        </Tip>
      </div>

      <p
        className={cn(
          field,
          rSurface,
          "px-4 py-3 leading-[1.375rem] whitespace-pre-wrap",
        )}
      >
        {task.prompt}
      </p>

      <div className="flex flex-col gap-2">
        <h2 className="text-muted-foreground">Runs</h2>
        {task.runs.length === 0 ? (
          <p className="text-muted-foreground">
            No runs yet. It runs at its time while this page is open.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {task.runs.map((run) => (
              <RunItem key={run.id} run={run} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

const LINK = /\(?\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\)?/g;

/* A run is plain text, but a source the model cites arrives as a Markdown link, which is drawn as one. */
function withLinks(text: string) {
  const pieces: ReactNode[] = [];
  let from = 0;
  for (const match of text.matchAll(LINK)) {
    pieces.push(text.slice(from, match.index));
    pieces.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground underline underline-offset-2"
      >
        {match[1]}
      </a>,
    );
    from = match.index + match[0].length;
  }
  pieces.push(text.slice(from));
  return pieces;
}

function RunItem({ run }: { run: Run }) {
  return (
    <li
      className={cn(
        rSurface,
        "border-border/60 flex flex-col gap-1.5 border px-4 py-3",
      )}
    >
      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        {formatWhen(new Date(run.at))}
        {run.status === "failed" && (
          <span className="text-destructive">Failed</span>
        )}
      </p>
      {run.status === "running" ? (
        <p
          role="status"
          className="text-muted-foreground animate-pulse motion-reduce:animate-none"
        >
          Running
        </p>
      ) : (
        <p
          className={cn(
            "leading-[1.375rem] wrap-break-word whitespace-pre-wrap",
            run.status === "failed" && "text-destructive",
          )}
        >
          {withLinks(run.text)}
        </p>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* What a tool call leaves in the chat: the task as it now stands             */
/* -------------------------------------------------------------------------- */

type Receipt = {
  id?: string;
  found?: boolean;
  title?: string | undefined;
  deleted?: boolean;
  started?: boolean;
};

const VERBS: Record<string, string> = {
  create_task: "Scheduled",
  update_task: "Updated",
  delete_task: "Deleted",
  run_task: "Running",
};

export function TaskReceipt({
  toolName,
  result,
}: {
  toolName: string;
  result?: unknown;
}) {
  const tasks = useTasks();
  const receipt = (result ?? null) as Receipt | null;
  const task = tasks.find((entry) => entry.id === receipt?.id);
  const row = cn(
    rItem,
    "border-border/60 flex min-h-10 w-full max-w-md items-center gap-2.5 border px-3 py-1.5 text-start",
  );

  if (!receipt)
    return (
      <p
        role="status"
        className="text-muted-foreground animate-pulse motion-reduce:animate-none"
      >
        Setting it up
      </p>
    );

  if (!task)
    return (
      <p className={cn(row, "text-muted-foreground")}>
        <Icon icon={Calendar03Icon} className="size-4 shrink-0" />
        {receipt.deleted && receipt.found
          ? `Deleted ${receipt.title ?? "the task"}`
          : "That task no longer exists"}
      </p>
    );

  return (
    <button
      type="button"
      onClick={() => select(task.id)}
      className={cn(
        row,
        "hover:bg-accent transition-colors motion-reduce:transition-none",
        focusRing,
      )}
    >
      <Icon icon={Calendar03Icon} className="size-4 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col leading-5">
        <span className="truncate font-medium">
          {VERBS[toolName] ?? "Task"} {task.title}
        </span>
        <span className="text-muted-foreground truncate text-xs">
          {describe(task.schedule)} · {status(task)}
        </span>
      </span>
      <span className="text-muted-foreground shrink-0 text-xs">Open</span>
    </button>
  );
}
