"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export interface SubagentItem {
  name: string;
  model: string;
}

export function SubagentList({
  agents,
  completedCount,
  progress,
  showSummary,
  summaryAgent,
  className,
}: {
  agents: readonly SubagentItem[];
  completedCount: number;
  progress: readonly number[];
  showSummary: boolean;
  summaryAgent: SubagentItem;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[14.5rem] w-full max-w-xs flex-col gap-2",
        className,
      )}
    >
      {agents.map((agent, index) => {
        const done = index < completedCount;
        const width = progress[index] ?? 0;

        return (
          <div
            key={agent.name}
            className={cn(
              paper,
              "flex flex-col gap-2 rounded-2xl px-3.5 py-2.5",
            )}
          >
            <div className="flex items-center gap-2">
              {done ? (
                <CheckIcon className="fade-in zoom-in-90 animate-in size-3.5 shrink-0 text-emerald-500 duration-200" />
              ) : (
                <Loader2Icon className="text-foreground/35 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
              )}
              <span className="flex-1 truncate text-[13.5px]">
                {agent.name}
              </span>
              <span className={cn(mono, "text-foreground/35")}>
                {agent.model}
              </span>
            </div>
            <span className="bg-foreground/[0.06] h-[3px] w-full overflow-hidden rounded-full">
              <span
                className={cn(
                  "block h-full rounded-full transition-[width] duration-700",
                  done ? "bg-emerald-500/70" : "bg-foreground/60",
                )}
                style={{ width: `${width}%` }}
              />
            </span>
          </div>
        );
      })}
      {showSummary && (
        <div
          className={cn(
            paper,
            "fade-in slide-in-from-bottom-2 animate-in flex flex-col gap-2 rounded-2xl px-3.5 py-2.5 duration-300",
          )}
        >
          <div className="flex items-center gap-2">
            <Loader2Icon className="text-foreground/35 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
            <span className="flex-1 truncate text-[13.5px]">
              {summaryAgent.name}
            </span>
            <span className={cn(mono, "text-foreground/35")}>
              {summaryAgent.model}
            </span>
          </div>
          <span className="bg-foreground/[0.06] h-[3px] w-full overflow-hidden rounded-full">
            <span
              className="bg-foreground/60 block h-full rounded-full transition-[width] duration-700"
              style={{ width: "42%" }}
            />
          </span>
        </div>
      )}
    </div>
  );
}
