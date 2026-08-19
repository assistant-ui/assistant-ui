"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export interface MapPin {
  id: string;
  label: string;
  detail: string;
  x: number;
  y: number;
}

export function MapAnswer({
  pins,
  activeId,
  route,
  onSelect,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "pins" | "activeId" | "route" | "onSelect"
> & {
  pins: readonly MapPin[];
  activeId: string;
  route?: boolean;
  onSelect?: (id: string) => void;
}) {
  const path = pins.map((pin) => `${pin.x},${pin.y}`).join(" ");

  return (
    <div
      data-slot="map-answer"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col overflow-hidden rounded-2xl",
        className,
      )}

      {...props}
    >
      <div className={cn(field, "relative h-40")}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
          className="absolute inset-0 size-full"
        >
          {[18, 42, 66, 88].map((y) => (
            <line
              key={`h${y}`}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              className="stroke-foreground/[0.06]"
              strokeWidth="0.6"
            />
          ))}
          {[22, 50, 74].map((x) => (
            <line
              key={`v${x}`}
              x1={x}
              x2={x}
              y1="0"
              y2="100"
              className="stroke-foreground/[0.06]"
              strokeWidth="0.6"
            />
          ))}
          {route && pins.length > 1 && (
            <polyline
              points={path}
              fill="none"
              strokeWidth="1.2"
              strokeDasharray="3 2"
              strokeLinecap="round"
              className="stroke-blue-500/60 dark:stroke-blue-400/60"
            />
          )}
        </svg>

        {pins.map((pin) => (
          <button
            key={pin.id}
            type="button"
            aria-label={pin.label}
            aria-current={pin.id === activeId || undefined}
            onClick={() => onSelect?.(pin.id)}
            className="focus-visible:ring-foreground/30 absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-1"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          >
            <span
              className={cn(
                "block rounded-full border-2 transition-all duration-200 motion-reduce:transition-none",
                pin.id === activeId
                  ? "border-background size-3.5 bg-blue-500 dark:bg-blue-400"
                  : "border-background bg-foreground/45 size-2.5",
              )}
            />
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {pins.map((pin) => (
          <button
            key={pin.id}
            type="button"
            aria-current={pin.id === activeId || undefined}
            onClick={() => onSelect?.(pin.id)}
            className={cn(
              "border-foreground/[0.06] flex items-baseline gap-2 border-t px-3.5 py-2 text-start transition-colors",
              pin.id === activeId
                ? "bg-foreground/[0.03]"
                : "hover:bg-foreground/[0.02]",
            )}
          >
            <span className="text-foreground/85 min-w-0 flex-1 truncate text-[13px]">
              {pin.label}
            </span>
            <span className={cn(mono, "text-foreground/30 shrink-0")}>
              {pin.detail}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
