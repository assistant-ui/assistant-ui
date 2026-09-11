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
  const message = variants[index] ?? variants[0] ?? "";
  const hasNavigation = variants.length > 1;

  const goPrevious = () => {
    if (!hasNavigation) return;
    onIndexChange(index === 0 ? variants.length - 1 : index - 1);
  };
  const goNext = () => {
    if (!hasNavigation) return;
    onIndexChange(index === variants.length - 1 ? 0 : index + 1);
  };

  return (
    <div
      data-slot="message-branches"
      className={cn("flex max-w-sm flex-col gap-2", className)}

      {...props}
    >
      <p
        key={index}
        className="fade-in slide-in-from-bottom-1 animate-in text-foreground/90 min-h-[4.25rem] text-sm leading-relaxed duration-300 motion-reduce:animate-none"
      >
        {message}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Show previous response"
          disabled={!hasNavigation}
          onClick={goPrevious}
          className={cn(ghostButton, "size-6")}
        >
          <ChevronLeftIcon className="size-3.5" />
        </button>
        <span className={cn(mono, "text-foreground/35 tabular-nums")}>
          {variants.length === 0
            ? "0 / 0"
            : `${index + 1} / ${variants.length}`}
        </span>
        <button
          type="button"
          aria-label="Show next response"
          disabled={!hasNavigation}
          onClick={goNext}
          className={cn(ghostButton, "size-6")}
        >
          <ChevronRightIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
