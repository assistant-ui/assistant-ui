"use client";

import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title: string;
  detail: string;
  retrying: boolean;
  onRetry: () => void;
  className?: string;
}

export function ErrorState({
  title,
  detail,
  retrying,
  onRetry,
  className,
}: ErrorStateProps) {
  if (retrying) {
    return (
      <div
        key="retrying"
        role="status"
        className={cn(
          "fade-in animate-in flex w-full max-w-sm items-center gap-2.5 text-sm duration-300 motion-reduce:animate-none",
          className,
        )}
      >
        <RefreshCwIcon className="text-foreground/45 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
        <span className="text-foreground/55 relative inline-block">
          <span>Retrying</span>
          <span
            aria-hidden
            className="shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
          >
            Retrying
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      key="error"
      role="alert"
      className={cn(
        "fade-in animate-in flex w-full max-w-sm items-start gap-2.5 rounded-2xl bg-red-500/[0.06] px-4 py-3 text-sm duration-300 motion-reduce:animate-none dark:bg-red-500/10",
        className,
      )}
    >
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-red-500/80" />
      <div>
        <p className="font-medium text-red-600 dark:text-red-400">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-red-600/60 dark:text-red-400/60">
          {detail}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="ms-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
      >
        <RefreshCwIcon className="size-3" />
        Retry
      </button>
    </div>
  );
}
