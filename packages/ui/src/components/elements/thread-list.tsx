"use client";

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
  className,
}: {
  threads: readonly ThreadItem[];
  activeIndex: number;
  onActiveIndexChange?: (index: number) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("flex w-full max-w-[240px] flex-col gap-0.5", className)}
    >
      <div className={cn(mono, "text-foreground/35 px-3 pb-1.5")}>Today</div>
      {threads.map((thread, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={thread.title}
            type="button"
            onClick={() => onActiveIndexChange?.(i)}
            className={cn(
              "group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-start text-[13.5px] transition-colors",
              active ? field : "hover:bg-foreground/[0.03]",
            )}
          >
            <span className="flex-1 truncate">{thread.title}</span>
            <span
              className={cn(
                mono,
                "text-foreground/35 flex items-center gap-1.5 tabular-nums group-hover:hidden",
              )}
            >
              {thread.unread && !active && (
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-blue-500 dark:bg-blue-400"
                />
              )}
              {thread.time}
            </span>
            <span className="hidden items-center gap-0.5 group-hover:flex">
              <span className="text-foreground/45 hover:bg-foreground/[0.06] hover:text-foreground/90 rounded-full p-1">
                <PencilIcon className="size-3" />
              </span>
              <span className="text-foreground/45 hover:bg-foreground/[0.06] hover:text-foreground/90 rounded-full p-1">
                <Trash2Icon className="size-3" />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
