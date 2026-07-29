"use client";

import { ExternalLink } from "lucide-react";
import { DiffViewer } from "@/components/assistant-ui/diff-viewer";
import { Button } from "@/components/ui/button";
import type { LearnFileRecord } from "@/lib/xulux/learn/file-reference";
import { cn } from "@/lib/utils";
import { XuluxSourceCode } from "../canvas/XuluxFileBrowser";

export type LearnFileDisplayMode = "source" | "diff";
export type LearnDiffViewMode = "unified" | "split";

export function LearnFileView({
  record,
  displayMode,
  diffViewMode = "unified",
  variant,
  onDisplayModeChange,
  onDiffViewModeChange,
  onOpenInFiles,
}: {
  record: LearnFileRecord;
  displayMode: LearnFileDisplayMode;
  diffViewMode?: LearnDiffViewMode;
  variant: "inline" | "full";
  onDisplayModeChange?: (mode: LearnFileDisplayMode) => void;
  onDiffViewModeChange?: (mode: LearnDiffViewMode) => void;
  onOpenInFiles?: () => void;
}) {
  const hasSource = record.currentContent !== undefined;
  const hasDiff = record.status !== "unchanged";
  const resolvedDisplayMode =
    displayMode === "source" && hasSource
      ? "source"
      : hasDiff
        ? "diff"
        : "source";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="bg-background flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs">
          {record.path}
        </span>
        {record.status !== "unchanged" ? (
          <span className="flex shrink-0 gap-1.5 text-xs">
            <span className="text-green-600">+{record.additions}</span>
            <span className="text-red-600">−{record.deletions}</span>
          </span>
        ) : null}
        {variant === "full" && hasSource && hasDiff ? (
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="sm"
              variant={resolvedDisplayMode === "source" ? "secondary" : "ghost"}
              className="h-7"
              onClick={() => onDisplayModeChange?.("source")}
            >
              Source
            </Button>
            <Button
              type="button"
              size="sm"
              variant={resolvedDisplayMode === "diff" ? "secondary" : "ghost"}
              className="h-7"
              onClick={() => onDisplayModeChange?.("diff")}
            >
              Changes
            </Button>
          </div>
        ) : null}
        {variant === "full" && resolvedDisplayMode === "diff" ? (
          <div className="flex shrink-0 gap-1">
            {(["unified", "split"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={diffViewMode === mode ? "secondary" : "ghost"}
                className="h-7 capitalize"
                onClick={() => onDiffViewModeChange?.(mode)}
              >
                {mode}
              </Button>
            ))}
          </div>
        ) : null}
        {variant === "inline" && onOpenInFiles ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 shrink-0 gap-1.5"
            onClick={onOpenInFiles}
          >
            Open in Files
            <ExternalLink className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto",
          variant === "inline" && "max-h-[min(420px,45vh)]",
        )}
      >
        {resolvedDisplayMode === "diff" ? (
          <DiffViewer
            oldFile={{
              name: record.path,
              content: record.previousContent ?? "",
            }}
            newFile={{
              name: record.path,
              content: record.currentContent ?? "",
            }}
            viewMode={variant === "inline" ? "unified" : diffViewMode}
            className="rounded-none border-0"
          />
        ) : record.currentContent !== undefined ? (
          <XuluxSourceCode path={record.path} content={record.currentContent} />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-sm">
            This file is not available in the selected stage.
          </div>
        )}
      </div>
    </div>
  );
}
