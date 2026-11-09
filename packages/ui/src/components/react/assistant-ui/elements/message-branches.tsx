"use client";

import type { ComponentProps } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ghostButton, mono } from "./surfaces";

export interface MessageBranchesProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  variants: readonly string[];
  index: number;
  onIndexChange: (index: number) => void;
}

export function MessageBranches({
  variants,
  index,
  onIndexChange,
  className,
  ...props
}: MessageBranchesProps) {
  const current = variants[index] === undefined ? 0 : index;
  const message = variants[current];
  if (message === undefined) return null;

  return (
    <div
      data-slot="message-branches"
      className={cn("flex max-w-sm flex-col gap-2", className)}
      {...props}
    >
      <p
        key={current}
        className="fade-in slide-in-from-bottom-1 animate-in text-foreground/90 min-h-[4.25rem] text-sm leading-relaxed duration-300 motion-reduce:animate-none"
      >
        {message}
      </p>
      {variants.length > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Show previous response"
            disabled={current === 0}
            onClick={() => onIndexChange(current - 1)}
            className={cn(ghostButton, "size-6")}
          >
            <ChevronLeftIcon className="size-3.5" />
          </button>
          <span className={cn(mono, "text-muted-foreground tabular-nums")}>
            {current + 1} / {variants.length}
          </span>
          <button
            type="button"
            aria-label="Show next response"
            disabled={current === variants.length - 1}
            onClick={() => onIndexChange(current + 1)}
            className={cn(ghostButton, "size-6")}
          >
            <ChevronRightIcon className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
