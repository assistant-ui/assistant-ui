"use client";

import type { ComponentProps } from "react";
import { ArrowRightIcon, SquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono } from "./surfaces";

export function StoppedRun({
  words,
  reason,
  onContinue,
  onDiscard,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "words" | "reason" | "onContinue" | "onDiscard"
> & {
  words: readonly string[];
  reason: string;
  onContinue?: () => void;
  onDiscard?: () => void;
}) {
  return (
    <div
      data-slot="stopped-run"
      className={cn("flex w-full max-w-sm flex-col gap-3", className)}

      {...props}
    >
      <p className="text-foreground/80 text-[13.5px] leading-relaxed">
        {words.join(" ")}
        <span
          aria-hidden
          className="bg-foreground/20 ms-1 inline-block h-[1em] w-[2px] translate-y-[0.15em] rounded-full"
        />
      </p>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            field,
            mono,
            "text-foreground/45 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
          )}
        >
          <SquareIcon className="size-2.5 fill-current" />
          {reason}
        </span>

        <button
          type="button"
          onClick={onContinue}
          className="text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground/95 ms-auto flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
        >
          Continue
          <ArrowRightIcon className="size-3" />
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="text-foreground/45 hover:bg-foreground/[0.06] hover:text-foreground/90 flex h-7 items-center rounded-full px-2.5 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
