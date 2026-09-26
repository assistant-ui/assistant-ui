"use client";

import type { ComponentProps } from "react";
import {
  CheckIcon,
  CircleAlertIcon,
  CircleSlashIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ghostButton, mono, paper } from "./surfaces";
import { announced, clamp, pct, progressOf, take } from "../utils/range";

export interface JobStage {
  name: string;
  weight: number;
  description?: string | undefined;
}

type JobOutcomeStatus = "success" | "partial" | "failed" | "cancelled";

function formatElapsed(elapsedMs: number) {
  const seconds = Math.max(
    0,
    Math.round(Number.isFinite(elapsedMs) ? elapsedMs / 1_000 : 0),
  );
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return {
    dateTime: `PT${seconds}S`,
    label:
      minutes === 0
        ? `${seconds}s`
        : remainder === 0
          ? `${minutes}m`
          : `${minutes}m ${remainder}s`,
  };
}

export function JobProgress({
  title,
  stages,
  stageIndex,
  stageProgress,
  eta,
  onCancel,
  outcome,
  elapsedMs,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "title"
  | "stages"
  | "stageIndex"
  | "stageProgress"
  | "eta"
  | "onCancel"
  | "outcome"
  | "elapsedMs"
> & {
  title: string;
  stages: readonly JobStage[];
  stageIndex: number;
  stageProgress: number;
  eta: string;
  onCancel?: (() => void) | undefined;
  outcome?:
    | {
        status: JobOutcomeStatus;
        summary?: string | undefined;
      }
    | undefined;
  elapsedMs?: number | undefined;
}) {
  const stage = progressOf(stageIndex, stages.length);
  const progress = clamp(stageProgress, 0, 1);
  const totalWeight = stages.reduce((sum, item) => sum + item.weight, 0) || 1;
  const completed = take(stages, stage).reduce(
    (sum, item) => sum + item.weight,
    0,
  );
  const current = stages[stage];
  const overall = pct(
    completed + (current ? current.weight * progress : 0),
    totalWeight,
  );
  const finished = stage >= stages.length;
  const running = !finished && outcome === undefined;
  const state = outcome?.status ?? (finished ? "done" : "running");
  const elapsed =
    !running && elapsedMs !== undefined ? formatElapsed(elapsedMs) : undefined;
  const statusWord =
    outcome?.status === "success" ? "done" : (outcome?.status ?? "done");
  const announcement = outcome
    ? `Job ${outcome.status === "success" ? "done" : outcome.status === "partial" ? "partly done" : outcome.status}`
    : current
      ? `Current stage: ${current.name}`
      : finished
        ? "Job done"
        : "Job running";
  const outcomeBar =
    outcome?.status === "success"
      ? "bg-emerald-500"
      : outcome?.status === "partial"
        ? "bg-amber-500 dark:bg-amber-400"
        : outcome?.status === "failed"
          ? "bg-red-600 dark:bg-red-400"
          : outcome?.status === "cancelled"
            ? "bg-foreground/20"
            : undefined;

  return (
    <div
      data-slot="job-progress"
      data-state={state}
      aria-busy={running || undefined}
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-2.5">
        {outcome?.status === "partial" ? (
          <CircleAlertIcon className="size-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
        ) : outcome?.status === "failed" ? (
          <XIcon className="size-3.5 shrink-0 text-red-600 dark:text-red-400" />
        ) : outcome?.status === "cancelled" ? (
          <CircleSlashIcon className="text-foreground/35 size-3.5 shrink-0" />
        ) : !running ? (
          <CheckIcon className="size-3.5 shrink-0 text-emerald-500" />
        ) : (
          <Loader2Icon className="text-foreground/35 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
        )}
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
          {title}
        </span>
        <span className={cn(mono, "text-foreground/35 shrink-0 tabular-nums")}>
          {elapsed ? (
            <time dateTime={elapsed.dateTime}>{elapsed.label}</time>
          ) : !running ? (
            statusWord
          ) : (
            eta
          )}
        </span>
        {running && onCancel ? (
          <button
            type="button"
            aria-label="Cancel the job"
            onClick={onCancel}
            className={cn(ghostButton, "size-6 shrink-0")}
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>

      <span
        role="progressbar"
        aria-label={`${title} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={announced(outcome ? 100 : overall)}
        className="bg-foreground/[0.06] h-1 w-full overflow-hidden rounded-full"
      >
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
            outcomeBar ??
              (finished ? "bg-emerald-500" : "bg-blue-500 dark:bg-blue-400"),
          )}
          style={{ width: `${outcome ? 100 : overall}%` }}
        />
      </span>

      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {stages.map((item, i) => (
            <span
              key={item.name}
              className={cn(
                mono,
                i < stage
                  ? "text-foreground/35"
                  : i === stage
                    ? "text-foreground/90"
                    : "text-foreground/20",
              )}
            >
              {item.name}
            </span>
          ))}
        </div>
        {current?.description ? (
          <p className="text-foreground/45 text-xs leading-4 break-words">
            {current.description}
          </p>
        ) : null}
      </div>
      {outcome?.summary ? (
        <p className="text-foreground/60 text-[13px] leading-snug break-words">
          {outcome.summary}
        </p>
      ) : null}
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </div>
  );
}
