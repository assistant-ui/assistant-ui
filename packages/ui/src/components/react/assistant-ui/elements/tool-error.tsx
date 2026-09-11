"use client";

import type { ComponentProps } from "react";
import { AlertCircleIcon, Loader2Icon, RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export function ToolError({
  name,
  target,
  message,
  attempt,
  maxAttempts,
  retrying,
  onRetry,
  onSkip,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "name"
  | "target"
  | "message"
  | "attempt"
  | "maxAttempts"
  | "retrying"
  | "onRetry"
  | "onSkip"
> & {
  name: string;
  target: string;
  message: string;
  attempt: number;
  maxAttempts: number;
  retrying: boolean;
  onRetry?: () => void;
  onSkip?: () => void;
}) {
  return (
    <div
      data-slot="tool-error"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-3.5",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-2.5">
        <AlertCircleIcon className="size-3.5 shrink-0 text-red-500" />
        <span className={cn(mono, "text-foreground/55 shrink-0")}>{name}</span>
        <span className="text-foreground/80 min-w-0 flex-1 truncate text-[13px]">
          {target}
        </span>
        <span className={cn(mono, "text-foreground/30 shrink-0 tabular-nums")}>
          {attempt}/{maxAttempts}
        </span>
      </div>

      <div
        className={cn(
          field,
          "rounded-xl px-3 py-2 font-mono text-[11px] leading-relaxed text-red-700 dark:text-red-300",
        )}
      >
        {message}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onSkip}
          disabled={!onSkip}
          className="text-foreground/45 hover:bg-foreground/[0.06] hover:text-foreground/90 h-7 rounded-full px-2.5 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-30"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground/95 flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none"
        >
          {retrying ? (
            <Loader2Icon className="size-3 animate-spin motion-reduce:animate-none" />
          ) : (
            <RotateCwIcon className="size-3" />
          )}
          {retrying ? "Retrying" : "Retry"}
        </button>
      </div>
    </div>
  );
}
