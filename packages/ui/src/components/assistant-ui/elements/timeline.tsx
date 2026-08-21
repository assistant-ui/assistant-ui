"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";
import { take } from "../utils/range";

export type TimelineWhen = "past" | "now" | "future";

export interface TimelineEvent {
  id: string;
  when: TimelineWhen;
  time: string;
  title: string;
  detail?: string;
}

export function Timeline({
  events,
  visibleCount,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "events" | "visibleCount"> & {
  events: readonly TimelineEvent[];
  visibleCount: number;
}) {
  return (
    <div
      data-slot="timeline"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col rounded-2xl p-4",
        className,
      )}

      {...props}
    >
      {take(events, visibleCount).map((event, i, shown) => (
        <div
          key={event.id}
          className="fade-in slide-in-from-left-1 animate-in fill-mode-both grid grid-cols-[3.5rem_1rem_minmax(0,1fr)] gap-x-2 duration-300"
        >
          <span
            className={cn(
              mono,
              "pt-[3px] text-end tabular-nums",
              event.when === "future"
                ? "text-foreground/25"
                : "text-foreground/40",
            )}
          >
            {event.time}
          </span>

          <span className="flex flex-col items-center">
            <span
              className={cn(
                "mt-1 size-2 shrink-0 rounded-full",
                event.when === "now" &&
                  "bg-blue-500 ring-4 ring-blue-500/15 dark:bg-blue-400",
                event.when === "past" && "bg-foreground/30",
                event.when === "future" &&
                  "border-foreground/20 border bg-transparent",
              )}
            />
            {i < shown.length - 1 && (
              <span
                className={cn(
                  "w-px flex-1",
                  event.when === "future"
                    ? "bg-foreground/[0.08]"
                    : "bg-foreground/15",
                )}
              />
            )}
          </span>

          <div
            className={cn(
              "flex flex-col gap-0.5",
              i < shown.length - 1 && "pb-3",
            )}
          >
            <span
              className={cn(
                "text-[13px] break-words",
                event.when === "future"
                  ? "text-foreground/40"
                  : "text-foreground/90",
                event.when === "now" && "font-medium",
              )}
            >
              {event.title}
            </span>
            {event.detail && (
              <span className="text-foreground/45 text-xs leading-relaxed break-words">
                {event.detail}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
