"use client";

import { CheckIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export interface ComparisonOption {
  id: string;
  name: string;
  headline: string;
  traits: readonly (string | false)[];
}

export function ComparisonCard({
  traitLabels,
  options,
  recommendedId,
  reason,
  className,
}: {
  traitLabels: readonly string[];
  options: readonly ComparisonOption[];
  recommendedId: string;
  reason: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        paper,
        "flex w-full max-w-md flex-col gap-3 rounded-2xl p-4",
        className,
      )}
    >
      <div className="flex gap-2">
        {options.map((option) => {
          const recommended = option.id === recommendedId;
          return (
            <div
              key={option.id}
              className={cn(
                "flex min-w-0 flex-1 flex-col gap-2 rounded-xl p-3 transition-colors",
                recommended ? "bg-blue-500/[0.07] dark:bg-blue-400/10" : field,
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className="flex items-baseline gap-1.5">
                  <span className="truncate text-[13px] font-medium">
                    {option.name}
                  </span>
                  {recommended && (
                    <span
                      className={cn(
                        mono,
                        "shrink-0 text-blue-600 dark:text-blue-400",
                      )}
                    >
                      pick
                    </span>
                  )}
                </span>
                <span className="text-foreground/45 truncate text-xs">
                  {option.headline}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                {traitLabels.map((label, i) => {
                  const trait = option.traits[i];
                  const absent = !trait;
                  return (
                    <span
                      key={`${i}-${label}`}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {absent ? (
                        <MinusIcon className="text-foreground/20 size-3 shrink-0" />
                      ) : (
                        <CheckIcon className="size-3 shrink-0 text-emerald-500" />
                      )}
                      <span
                        className={cn(
                          "min-w-0 truncate",
                          absent ? "text-foreground/30" : "text-foreground/65",
                        )}
                      >
                        {absent ? label : trait}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-foreground/55 text-xs leading-relaxed">{reason}</p>
    </div>
  );
}
