"use client";

import type { ComponentProps } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono } from "./surfaces";

export interface ThreadItem {
  title: string;
  time: string;
  unread?: boolean;
}

export function ThreadList({
  threads,
  activeIndex,
  onActiveIndexChange,
  onRename,
  onDelete,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "threads"
  | "activeIndex"
  | "onActiveIndexChange"
  | "onRename"
  | "onDelete"
> & {
  threads: readonly ThreadItem[];
  activeIndex: number;
  onActiveIndexChange?: (index: number) => void;
  onRename?: (index: number) => void;
  onDelete?: (index: number) => void;
}) {
  return (
    <div
      data-slot="thread-list"
      className={cn("flex w-full max-w-[240px] flex-col gap-0.5", className)}

      {...props}
    >
      <div className={cn(mono, "text-foreground/35 px-3 pb-1.5")}>Today</div>
      {threads.map((thread, i) => {
        const active = i === activeIndex;
        const hasActions = onRename !== undefined || onDelete !== undefined;
        const rowClassName = cn(
          "group relative flex w-full items-center rounded-xl text-[13.5px] transition-colors",
          active
            ? field
            : onActiveIndexChange
              ? "hover:bg-foreground/[0.03]"
              : undefined,
        );
        const contentClassName =
          "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-3 py-2 text-start";
        const content = (
          <>
            <span className="flex-1 truncate">{thread.title}</span>
            <span
              className={cn(
                mono,
                "text-foreground/35 flex items-center gap-1.5 tabular-nums",
                hasActions &&
                  (onActiveIndexChange
                    ? "group-focus-within:hidden group-hover:hidden"
                    : "hidden"),
              )}
            >
              {thread.unread && !active && (
                <>
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-blue-500 dark:bg-blue-400"
                  />
                  <span className="sr-only">unread</span>
                </>
              )}
              {thread.time}
            </span>
          </>
        );

        return (
          <div key={thread.title} className={rowClassName}>
            {onActiveIndexChange ? (
              <button
                type="button"
                aria-current={active || undefined}
                onClick={() => onActiveIndexChange(i)}
                className={contentClassName}
              >
                {content}
              </button>
            ) : (
              <div
                aria-current={active || undefined}
                className={contentClassName}
              >
                {content}
              </div>
            )}
            {hasActions && (
              <div
                className={cn(
                  "absolute end-2 items-center gap-0.5",
                  onActiveIndexChange
                    ? "hidden group-focus-within:flex group-hover:flex"
                    : "flex",
                )}
              >
                {onRename && (
                  <button
                    type="button"
                    aria-label={`Rename ${thread.title}`}
                    onClick={() => onRename(i)}
                    className="text-foreground/45 hover:bg-foreground/[0.06] hover:text-foreground/90 rounded-full p-1"
                  >
                    <PencilIcon className="size-3" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    aria-label={`Delete ${thread.title}`}
                    onClick={() => onDelete(i)}
                    className="text-foreground/45 hover:bg-foreground/[0.06] hover:text-foreground/90 rounded-full p-1"
                  >
                    <Trash2Icon className="size-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
