"use client";

import type { ComponentProps } from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { codeScroll, codeSurface, inkButton, mono, paper } from "./surfaces";
import type { DiffLine } from "./code-diff";

export type HunkDecision = "pending" | "kept" | "discarded";

export interface DiffHunk {
  id: string;
  range: string;
  decision: HunkDecision;
  lines: readonly DiffLine[];
}

const GUTTER = { context: "", added: "+", removed: "−" } as const;

export function ReviewableDiff({
  filename,
  hunks,
  onKeep,
  onDiscard,
  onApply,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "filename" | "hunks" | "onKeep" | "onDiscard" | "onApply"
> & {
  filename: string;
  hunks: readonly DiffHunk[];
  onKeep?: (id: string) => void;
  onDiscard?: (id: string) => void;
  onApply?: () => void;
}) {
  const kept = hunks.filter((hunk) => hunk.decision === "kept").length;
  const pending = hunks.filter((hunk) => hunk.decision === "pending").length;

  return (
    <div
      data-slot="reviewable-diff"
      className={cn(
        paper,
        "flex w-full max-w-md flex-col overflow-hidden rounded-2xl",
        className,
      )}

      {...props}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="font-mono text-xs">{filename}</span>
        <span className={cn(mono, "text-foreground/35 tabular-nums")}>
          {kept} of {hunks.length} kept
        </span>
      </div>

      <div className="flex flex-col">
        {hunks.map((hunk) => (
          <div
            key={hunk.id}
            className={cn(
              "border-foreground/[0.06] border-t transition-opacity duration-300",
              hunk.decision === "discarded" && "opacity-40",
            )}
          >
            <div className="flex items-center gap-2 px-4 py-1.5">
              <span className={cn(mono, "text-foreground/30")}>
                {hunk.range}
              </span>
              <span className="ms-auto flex items-center gap-1">
                {hunk.decision === "pending" ? (
                  <>
                    <button
                      type="button"
                      aria-label={`Discard hunk ${hunk.range}`}
                      onClick={() => onDiscard?.(hunk.id)}
                      className="text-foreground/45 hover:bg-foreground/[0.06] hover:text-foreground/90 flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
                    >
                      <XIcon className="size-3" />
                      Discard
                    </button>
                    <button
                      type="button"
                      aria-label={`Keep hunk ${hunk.range}`}
                      onClick={() => onKeep?.(hunk.id)}
                      className="flex h-6 items-center gap-1 rounded-full bg-emerald-500/12 px-2 text-[11px] font-medium text-emerald-700 transition-[background-color,scale] duration-150 hover:bg-emerald-500/20 active:scale-[0.96] dark:text-emerald-300"
                    >
                      <CheckIcon className="size-3" />
                      Keep
                    </button>
                  </>
                ) : (
                  <span
                    className={cn(
                      mono,
                      "fade-in animate-in duration-300",
                      hunk.decision === "kept"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground/35",
                    )}
                  >
                    {hunk.decision}
                  </span>
                )}
              </span>
            </div>
            <div className={cn(codeScroll, "pb-1.5 font-mono text-xs")}>
              <div className={codeSurface}>
                {hunk.lines.map((line, i) => (
                  <div
                    key={`${hunk.id}-${i}`}
                    className={cn(
                      "flex px-4 py-0.5 leading-relaxed whitespace-pre",
                      line.kind === "context" && "text-foreground/40",
                      line.kind === "added" &&
                        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                      line.kind === "removed" &&
                        "bg-red-500/10 text-red-700 dark:text-red-300",
                    )}
                  >
                    <span className="w-4 shrink-0 select-none">
                      {GUTTER[line.kind]}
                    </span>
                    <span>{line.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-foreground/[0.06] flex items-center justify-between border-t px-4 py-2.5">
        <span className={cn(mono, "text-foreground/35")}>
          {pending > 0 ? `${pending} left to review` : "All reviewed"}
        </span>
        <button
          type="button"
          disabled={pending > 0}
          onClick={onApply}
          className={cn(
            inkButton,
            "flex h-7 items-center rounded-full px-3 text-xs font-medium disabled:pointer-events-none disabled:opacity-30",
          )}
        >
          Apply {kept}
        </button>
      </div>
    </div>
  );
}
