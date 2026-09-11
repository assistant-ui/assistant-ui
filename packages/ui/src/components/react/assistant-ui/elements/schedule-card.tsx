"use client";

import type { ComponentProps } from "react";
import { CheckIcon, ClockIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export interface ScheduleRun {
  id: string;
  at: string;
  ok: boolean;
}

export function ScheduleCard({
  name,
  cadence,
  nextRun,
  enabled,
  history,
  onToggle,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "name"
  | "cadence"
  | "nextRun"
  | "enabled"
  | "history"
  | "onToggle"
> & {
  name: string;
  cadence: string;
  nextRun: string;
  enabled: boolean;
  history: readonly ScheduleRun[];
  onToggle?: () => void;
}) {
  return (
    <div
      data-slot="schedule-card"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-2.5">
        <span className="bg-foreground/[0.05] text-foreground/45 flex size-7 shrink-0 items-center justify-center rounded-lg">
          <ClockIcon className="size-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13.5px] font-medium">{name}</span>
          <span className={cn(mono, "text-foreground/30")}>{cadence}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`${enabled ? "Pause" : "Resume"} ${name}`}
          onClick={onToggle}
          className={cn(
            "flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200",
            enabled ? "bg-foreground/80" : "bg-foreground/15",
          )}
        >
          <span
            className={cn(
              "bg-background size-4 rounded-full transition-transform duration-200 motion-reduce:transition-none",
              enabled && "translate-x-4",
            )}
          />
        </button>
      </div>

      <div
        className={cn(
          field,
          "flex items-baseline gap-2 rounded-xl px-3 py-2",
          !enabled && "opacity-45",
        )}
      >
        <span className={cn(mono, "text-foreground/30")}>next</span>
        <span className="text-foreground/80 text-[13px]">
          {enabled ? nextRun : "paused"}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className={cn(mono, "text-foreground/30")}>recent runs</span>
        {history.map((run) => (
          <div key={run.id} className="flex items-baseline gap-2">
            {run.ok ? (
              <CheckIcon className="size-3 shrink-0 translate-y-0.5 text-emerald-500" />
            ) : (
              <XIcon className="size-3 shrink-0 translate-y-0.5 text-red-500" />
            )}
            <span className="text-foreground/60 min-w-0 flex-1 truncate text-xs">
              {run.at}
            </span>
            <span className={cn(mono, "text-foreground/25 shrink-0")}>
              {run.ok ? "ok" : "failed"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
