"use client";

import type { ComponentProps } from "react";
import { BrainIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, ghostButton, mono } from "./surfaces";

export type MemoryChange = "added" | "updated" | "existing";

export interface MemoryChip {
  id: string;
  text: string;
  change: MemoryChange;
}

export function MemoryChips({
  chips,
  onForget,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "chips" | "onForget"> & {
  chips: readonly MemoryChip[];
  onForget?: (id: string) => void;
}) {
  const fresh = chips.filter((chip) => chip.change !== "existing").length;

  return (
    <div
      data-slot="memory-chips"
      className={cn("flex w-full max-w-sm flex-col gap-2", className)}

      {...props}
    >
      <div className="flex items-center gap-1.5">
        <BrainIcon className="text-muted-foreground size-3.5" />
        <span className={cn(mono, "text-muted-foreground")}>
          {fresh > 0 ? `remembered ${fresh}` : "memory"}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip.id}
            className={cn(
              "fade-in zoom-in-95 animate-in fill-mode-both group flex items-center gap-1 rounded-full py-1 pr-1 pl-2.5 text-xs duration-300",
              chip.change === "existing"
                ? cn(field, "text-muted-foreground")
                : "bg-blue-500/12 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
            )}
          >
            {chip.text}
            {onForget && (
              <button
                type="button"
                aria-label={`Forget "${chip.text}"`}
                onClick={() => onForget(chip.id)}
                className={cn(ghostButton, "size-4")}
              >
                <XIcon className="size-2.5" />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
