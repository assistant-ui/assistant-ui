"use client";

import type { ComponentProps } from "react";
import { ShieldIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export function GuardrailNotice({
  title,
  explanation,
  policy,
  alternatives,
  onPick,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "title" | "explanation" | "policy" | "alternatives" | "onPick"
> & {
  title: string;
  explanation: string;
  policy: string;
  alternatives: readonly string[];
  onPick?: (alternative: string) => void;
}) {
  return (
    <div
      data-slot="guardrail-notice"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-[20px] p-4",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-400">
          <ShieldIcon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
          {title}
        </span>
        <span className={cn(mono, "text-foreground/30 shrink-0")}>
          {policy}
        </span>
      </div>

      <p className="text-foreground/60 text-xs leading-relaxed">
        {explanation}
      </p>

      {alternatives.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className={cn(mono, "text-foreground/30")}>try instead</span>
          {alternatives.map((alternative) => (
            <button
              key={alternative}
              type="button"
              onClick={() => onPick?.(alternative)}
              className="hover:bg-foreground/[0.04] text-foreground/70 hover:text-foreground/95 -mx-1.5 rounded-lg px-1.5 py-1 text-start text-[13px] transition-colors"
            >
              {alternative}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
