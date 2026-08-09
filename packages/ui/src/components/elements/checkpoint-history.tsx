"use client";

import { RotateCcwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export interface Checkpoint {
  id: string;
  label: string;
  at: string;
  files: number;
}

export function CheckpointHistory({
  checkpoints,
  currentId,
  onRestore,
  className,
}: {
  checkpoints: readonly Checkpoint[];
  currentId: string;
  onRestore?: (id: string) => void;
  className?: string;
}) {
  const currentIndex = checkpoints.findIndex(
    (checkpoint) => checkpoint.id === currentId,
  );

  return (
    <div
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-1 rounded-2xl p-3",
        className,
      )}
    >
      <span className="px-1.5 pb-1 text-[13.5px] font-medium">Checkpoints</span>

      {checkpoints.map((checkpoint, i) => {
        const ahead = currentIndex >= 0 && i > currentIndex;
        const current = checkpoint.id === currentId;

        return (
          <div
            key={checkpoint.id}
            className={cn(
              "group flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors",
              current ? "bg-foreground/[0.05]" : "hover:bg-foreground/[0.03]",
              ahead && "opacity-40",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                current
                  ? "bg-blue-500 dark:bg-blue-400"
                  : ahead
                    ? "border-foreground/25 border"
                    : "bg-foreground/25",
              )}
            />

            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px]">{checkpoint.label}</span>
              <span className={cn(mono, "text-foreground/30")}>
                {checkpoint.at} · {checkpoint.files} files
              </span>
            </span>

            {current ? (
              <span className={cn(mono, "text-foreground/35 shrink-0")}>
                current
              </span>
            ) : (
              <button
                type="button"
                aria-label={`Restore to ${checkpoint.label}`}
                onClick={() => onRestore?.(checkpoint.id)}
                className="text-foreground/45 hover:bg-foreground/[0.06] hover:text-foreground/90 flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium opacity-0 transition-[background-color,color,opacity,scale] duration-150 group-hover:opacity-100 focus-visible:opacity-100 active:scale-[0.96]"
              >
                <RotateCcwIcon className="size-2.5" />
                Restore
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
