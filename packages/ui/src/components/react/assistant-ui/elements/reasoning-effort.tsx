"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { field, mono } from "./surfaces";
import { announced, pct } from "../utils/range";

const fmt = (n: number) => n.toLocaleString("en-US");

export interface EffortLevel {
  key: string;
  label: string;
  budget: number;
}

export function ReasoningEffort({
  levels,
  selectedKey,
  spent,
  onSelect,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "levels" | "selectedKey" | "spent" | "onSelect"
> & {
  levels: readonly EffortLevel[];
  selectedKey: string;
  spent: number;
  onSelect?: (key: string) => void;
}) {
  const selected = levels.find((level) => level.key === selectedKey);
  const budget = selected?.budget ?? 0;
  const used = pct(spent, budget);

  return (
    <div
      data-slot="reasoning-effort"
      className={cn("flex w-full max-w-sm flex-col gap-2.5", className)}

      {...props}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[13.5px] font-medium">Thinking</span>
        <span className={cn(mono, "text-foreground/35 tabular-nums")}>
          {fmt(spent)} / {fmt(budget)}
        </span>
      </div>

      <div className={cn(field, "flex gap-0.5 rounded-full p-0.5")}>
        {levels.map((level) => {
          const active = level.key === selectedKey;
          return (
            <button
              key={level.key}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect?.(level.key)}
              className={cn(
                "flex-1 rounded-full py-1 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.97]",
                active
                  ? "bg-background text-foreground/90"
                  : "text-foreground/45 hover:text-foreground/70",
              )}
            >
              {level.label}
            </button>
          );
        })}
      </div>

      <span
        role="progressbar"
        aria-label="Thinking budget used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={announced(used)}
        aria-valuetext={`${fmt(spent)} of ${fmt(budget)}`}
        className="bg-foreground/[0.06] h-[3px] w-full overflow-hidden rounded-full"
      >
        <span
          className="block h-full rounded-full bg-blue-500 transition-[width] duration-500 motion-reduce:transition-none dark:bg-blue-400"
          style={{ width: `${used}%` }}
        />
      </span>
    </div>
  );
}
