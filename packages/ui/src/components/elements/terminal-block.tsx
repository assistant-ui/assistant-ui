"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export function TerminalBlock({
  command,
  lines,
  visibleCount,
  done,
  variant = "paper",
  className,
}: {
  command: string;
  lines: readonly string[];
  visibleCount: number;
  done: boolean;
  variant?: "paper" | "ink";
  className?: string;
}) {
  const ink = variant === "ink";

  return (
    <div
      className={cn(
        ink
          ? "bg-foreground dark:bg-popover shadow-[0_12px_32px_-16px_rgba(0,0,0,0.35)] dark:shadow-none"
          : paper,
        "w-full max-w-md overflow-hidden rounded-2xl font-mono text-xs",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <span
          className={cn(
            ink
              ? "text-background/90 dark:text-foreground/90"
              : "text-foreground/90",
          )}
        >
          {command}
        </span>
        {done ? (
          <div className="flex items-center gap-1">
            <CheckIcon className="size-3 text-emerald-500" />
            <span
              className={cn(
                mono,
                ink
                  ? "text-background/40 dark:text-foreground/40"
                  : "text-foreground/40",
              )}
            >
              exit 0
            </span>
          </div>
        ) : (
          <Loader2Icon
            className={cn(
              "size-3 animate-spin motion-reduce:animate-none",
              ink
                ? "text-background/35 dark:text-foreground/35"
                : "text-foreground/35",
            )}
          />
        )}
      </div>
      <div
        className={cn(
          "flex min-h-[8.5rem] flex-col gap-1 px-4 pt-1 pb-3.5",
          ink
            ? "text-background/55 dark:text-foreground/50"
            : "text-foreground/50",
        )}
      >
        {lines.slice(0, visibleCount).map((line, i) => {
          const isLast = i === lines.length - 1;
          return (
            <div
              key={`${i}-${line}`}
              className={cn(
                "fade-in animate-in fill-mode-both duration-300",
                isLast &&
                  (ink
                    ? "text-background/90 dark:text-foreground/90"
                    : "text-foreground/90"),
              )}
            >
              {line}
            </div>
          );
        })}
        {!done && (
          <span
            aria-hidden
            className="inline-block h-3 w-1.5 animate-pulse bg-blue-500/70 motion-reduce:animate-none dark:bg-blue-400/70"
          />
        )}
      </div>
    </div>
  );
}
