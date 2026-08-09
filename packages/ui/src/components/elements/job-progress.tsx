"use client";

import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ghostButton, mono, paper } from "./surfaces";

export interface JobStage {
  name: string;
  weight: number;
}

export function JobProgress({
  title,
  stages,
  stageIndex,
  stageProgress,
  eta,
  onCancel,
  className,
}: {
  title: string;
  stages: readonly JobStage[];
  stageIndex: number;
  stageProgress: number;
  eta: string;
  onCancel?: () => void;
  className?: string;
}) {
  const totalWeight = stages.reduce((sum, stage) => sum + stage.weight, 0) || 1;
  const completed = stages
    .slice(0, stageIndex)
    .reduce((sum, stage) => sum + stage.weight, 0);
  const current = stages[stageIndex];
  const overall =
    ((completed + (current ? current.weight * stageProgress : 0)) /
      totalWeight) *
    100;
  const finished = stageIndex >= stages.length;

  return (
    <div
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        {finished ? (
          <CheckIcon className="size-3.5 shrink-0 text-emerald-500" />
        ) : (
          <Loader2Icon className="text-foreground/35 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
        )}
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
          {title}
        </span>
        <span className={cn(mono, "text-foreground/35 shrink-0 tabular-nums")}>
          {finished ? "done" : eta}
        </span>
        {!finished && (
          <button
            type="button"
            aria-label="Cancel the job"
            onClick={onCancel}
            className={cn(ghostButton, "size-6 shrink-0")}
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>

      <span className="bg-foreground/[0.06] h-1 w-full overflow-hidden rounded-full">
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
            finished ? "bg-emerald-500" : "bg-blue-500 dark:bg-blue-400",
          )}
          style={{ width: `${Math.min(100, overall)}%` }}
        />
      </span>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {stages.map((stage, i) => (
          <span
            key={stage.name}
            className={cn(
              mono,
              i < stageIndex
                ? "text-foreground/35"
                : i === stageIndex
                  ? "text-foreground/90"
                  : "text-foreground/20",
            )}
          >
            {stage.name}
          </span>
        ))}
      </div>
    </div>
  );
}
