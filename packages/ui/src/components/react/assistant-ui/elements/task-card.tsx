"use client";

import { type ComponentProps, type ReactNode, useState } from "react";
import { CheckIcon, ChevronRightIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export type TaskCardState = "working" | "waiting" | "done" | "failed";

export function TaskStateIcon({
  state,
  className,
}: {
  state: TaskCardState;
  className?: string;
}) {
  if (state === "done") {
    return (
      <CheckIcon
        aria-hidden
        className={cn("size-3.5 shrink-0 text-emerald-500", className)}
      />
    );
  }
  if (state === "failed") {
    return (
      <XIcon
        aria-hidden
        className={cn("text-destructive size-3.5 shrink-0", className)}
      />
    );
  }
  if (state === "working") {
    return (
      <Loader2Icon
        aria-hidden
        className={cn(
          "text-foreground/35 size-3.5 shrink-0 animate-spin motion-reduce:animate-none",
          className,
        )}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "border-foreground/35 m-1 size-1.5 shrink-0 rounded-full border",
        className,
      )}
    />
  );
}

export function TaskCard({
  label,
  meta,
  state,
  elapsed,
  result,
  open,
  onOpenChange,
  children,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "label" | "state" | "result" | "open" | "onOpenChange"
> & {
  label: string;
  meta?: string | undefined;
  state: TaskCardState;
  elapsed?: string | undefined;
  result?: ReactNode | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  children?: ReactNode | undefined;
}) {
  const hasTranscript = children !== undefined && children !== null;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div
      data-slot="task-card"
      data-state={state}
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col overflow-hidden rounded-2xl",
        className,
      )}
      {...props}
    >
      <button
        type="button"
        aria-expanded={hasTranscript ? isOpen : undefined}
        disabled={!hasTranscript}
        onClick={toggle}
        className="hover:enabled:bg-foreground/[0.03] flex items-center gap-2.5 px-3.5 py-2.5 text-start transition-colors disabled:cursor-default"
      >
        <TaskStateIcon state={state} />
        <span className="sr-only">{state}</span>
        <span className="min-w-0 flex-1 truncate text-[13.5px]">{label}</span>
        {meta !== undefined && (
          <span className={cn(mono, "text-foreground/35 shrink-0")}>
            {meta}
          </span>
        )}
        {elapsed !== undefined && (
          <span
            className={cn(mono, "text-foreground/30 shrink-0 tabular-nums")}
          >
            {elapsed}
          </span>
        )}
        {hasTranscript && (
          <ChevronRightIcon
            aria-hidden
            className={cn(
              "text-foreground/25 size-3 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
              isOpen && "rotate-90",
            )}
          />
        )}
      </button>
      {hasTranscript && isOpen && (
        <div
          data-slot="task-card-transcript"
          className="border-border/60 flex flex-col gap-2 border-t px-3.5 py-2.5"
        >
          {children}
        </div>
      )}
      {result !== undefined && (
        <div
          data-slot="task-card-result"
          className="border-border/60 text-foreground/70 border-t px-3.5 py-2 text-xs leading-relaxed"
        >
          {result}
        </div>
      )}
    </div>
  );
}
