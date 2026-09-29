"use client";

import type { ComponentProps } from "react";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono } from "./surfaces";
import { announced, pct, progressOf } from "../utils/range";

export type AgentPlanStep = {
  id?: string | undefined;
  label: string;
  description?: string | undefined;
};

export function AgentPlan({
  steps,
  activeIndex,
  title = "Plan",
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "steps" | "activeIndex"> & {
  steps: readonly (string | AgentPlanStep)[];
  activeIndex: number;
  title?: string | undefined;
}) {
  const total = steps.length;
  const completed = progressOf(activeIndex, total);
  const allDone = completed >= total;
  const progress = pct(completed, total);

  return (
    <div
      data-slot="agent-plan"
      className={cn("flex w-full max-w-sm flex-col gap-3", className)}

      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] font-medium">{title}</span>
        <span className={cn(mono, "text-foreground/35 tabular-nums")}>
          {completed} of {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${title} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={announced(progress)}
        aria-valuetext={`${completed} of ${total} steps`}
        className="bg-foreground/[0.06] h-[3px] w-full overflow-hidden rounded-full"
      >
        <span
          aria-hidden
          className="bg-foreground/80 block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ul className="flex flex-col gap-2.5">
        {steps.map((step, i) => {
          const item = typeof step === "string" ? { label: step } : step;
          const done = allDone || i < completed;
          const active = !allDone && i === completed;
          const status = done ? "done" : active ? "in progress" : "not started";
          return (
            <li
              key={typeof step === "string" ? i : (step.id ?? i)}
              className={cn(
                "flex gap-2.5 text-[13.5px]",
                active && item.description ? "items-start" : "items-center",
              )}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {done ? (
                  <CheckIcon
                    aria-hidden
                    className="text-foreground/35 size-3.5"
                  />
                ) : active ? (
                  <Loader2Icon
                    aria-hidden
                    className="text-foreground/90 size-3.5 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="bg-foreground/15 size-1.5 rounded-full"
                  />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    done && "text-foreground/40",
                    active && "text-foreground/90",
                    !done && !active && "text-foreground/35",
                  )}
                >
                  {item.label}
                </span>
                <span className="sr-only">{` ${status}`}</span>
                {active && item.description ? (
                  <span className="text-foreground/45 mt-0.5 block text-xs">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
