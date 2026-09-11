"use client";

import type { ComponentProps } from "react";
import { MaximizeIcon, MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ghostButton, mono, paper } from "./surfaces";

export function Diagram({
  title,
  zoom,
  children,
  onZoomIn,
  onZoomOut,
  onReset,
  onExpand,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "title"
  | "zoom"
  | "children"
  | "onZoomIn"
  | "onZoomOut"
  | "onReset"
  | "onExpand"
> & {
  title: string;
  zoom: number;
  children: React.ReactNode;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  onExpand?: () => void;
}) {
  return (
    <div
      data-slot="diagram"
      className={cn(
        paper,
        "flex w-full max-w-md flex-col overflow-hidden rounded-2xl",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-1 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {title}
        </span>
        <span className={cn(mono, "text-foreground/30 shrink-0 tabular-nums")}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={onZoomOut}
          className={cn(ghostButton, "size-7 shrink-0")}
        >
          <MinusIcon className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={onZoomIn}
          className={cn(ghostButton, "size-7 shrink-0")}
        >
          <PlusIcon className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Reset the view"
          onClick={onReset}
          className={cn(ghostButton, "size-7 shrink-0")}
        >
          <RotateCcwIcon className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Open full screen"
          onClick={onExpand}
          disabled={!onExpand}
          className={cn(
            ghostButton,
            "size-7 shrink-0 disabled:pointer-events-none disabled:opacity-30",
          )}
        >
          <MaximizeIcon className="size-3.5" />
        </button>
      </div>

      <div className="border-foreground/[0.07] flex min-h-[10rem] items-center justify-center overflow-hidden border-t p-4">
        <div
          className="origin-center transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{ transform: `scale(${zoom})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
