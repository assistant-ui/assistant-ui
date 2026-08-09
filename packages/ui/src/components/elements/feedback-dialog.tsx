"use client";

import type { ComponentProps } from "react";
import { CheckIcon, ThumbsDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, inkButton, mono, paper } from "./surfaces";

export function FeedbackDialog({
  reasons,
  selected,
  note,
  sent,
  onToggleReason,
  onNoteChange,
  onSubmit,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "reasons"
  | "selected"
  | "note"
  | "sent"
  | "onToggleReason"
  | "onNoteChange"
  | "onSubmit"
> & {
  reasons: readonly string[];
  selected: readonly string[];
  note: string;
  sent: boolean;
  onToggleReason?: (reason: string) => void;
  onNoteChange?: (note: string) => void;
  onSubmit?: () => void;
}) {
  if (sent) {
    return (
      <div
        data-slot="feedback-dialog"
        className={cn(
          paper,
          "fade-in animate-in flex w-full max-w-sm items-center gap-2.5 rounded-[20px] p-4 text-[13.5px] duration-300",
          className,
        )}

        {...props}
      >
        <CheckIcon className="size-4 shrink-0 text-emerald-500" />
        Thanks. That helps us tune the model.
      </div>
    );
  }

  return (
    <div
      data-slot="feedback-dialog"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-[20px] p-4",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-2.5">
        <span className="bg-foreground/[0.05] text-foreground/45 flex size-7 shrink-0 items-center justify-center rounded-lg">
          <ThumbsDownIcon className="size-3.5" />
        </span>
        <span className="text-[13.5px] font-medium">What went wrong?</span>
        <span className={cn(mono, "text-foreground/30 ms-auto")}>optional</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {reasons.map((reason) => {
          const active = selected.includes(reason);
          return (
            <button
              key={reason}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleReason?.(reason)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs transition-[background-color,color,scale] duration-150 active:scale-[0.96]",
                active
                  ? "bg-foreground text-background"
                  : cn(field, "text-foreground/55 hover:text-foreground/90"),
              )}
            >
              {reason}
            </button>
          );
        })}
      </div>

      <textarea
        value={note}
        onChange={(event) => onNoteChange?.(event.target.value)}
        rows={2}
        placeholder="Anything else?"
        className={cn(
          field,
          "text-foreground/80 placeholder:text-foreground/30 focus-visible:ring-foreground/20 resize-none rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-2",
        )}
      />

      <button
        type="button"
        onClick={onSubmit}
        className={cn(
          inkButton,
          "flex h-8 items-center justify-center self-end rounded-full px-3.5 text-xs font-medium",
        )}
      >
        Send feedback
      </button>
    </div>
  );
}
