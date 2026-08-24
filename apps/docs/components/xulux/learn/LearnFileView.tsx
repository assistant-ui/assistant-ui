"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { ChevronDown, ExternalLink, FileText } from "lucide-react";
import { DiffViewer } from "@/components/assistant-ui/diff-viewer";
import { Button } from "@/components/ui/button";
import type {
  LearnFileRecord,
  XuluxFileReference,
} from "@/lib/xulux/learn/file-reference";
import { cn } from "@/lib/utils";
import { XuluxSourceCode } from "../canvas/XuluxFileBrowser";
import { useOptionalLearnMode } from "./LearnModeContext";
import { useOptionalLearnStageSource } from "./LearnStageSourceContext";

export type LearnFileDisplayMode = "source" | "diff";
export type LearnDiffViewMode = "unified" | "split";

export function LearnFileView({
  record,
  displayMode,
  diffViewMode = "unified",
  variant,
  showHeader = true,
  onDisplayModeChange,
  onDiffViewModeChange,
  onOpenInFiles,
}: {
  record: LearnFileRecord;
  displayMode: LearnFileDisplayMode;
  diffViewMode?: LearnDiffViewMode;
  variant: "inline" | "full";
  showHeader?: boolean;
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
      {showHeader ? (
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
                variant={
                  resolvedDisplayMode === "source" ? "secondary" : "ghost"
                }
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
      ) : null}
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

export function LearnInlineFileReference({
  reference,
  className,
}: {
  reference: XuluxFileReference;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const source = useOptionalLearnStageSource();
  const learnMode = useOptionalLearnMode();
  const record =
    source?.status === "ready" ? source.records.get(reference.path) : undefined;

  if (!record || !learnMode) {
    return (
      <code
        className={cn(
          "border-border/50 bg-muted/50 rounded-md border px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
      >
        {reference.path}
      </code>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <button
            type="button"
            className={cn(
              "border-border/60 bg-muted/50 hover:bg-muted inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 align-baseline font-mono text-[0.85em] transition-colors",
              open && "bg-muted",
              className,
            )}
          />
        }
      >
        <FileText className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{reference.path}</span>
        {record.status !== "unchanged" ? (
          <span className="flex shrink-0 gap-1">
            <span className="text-green-600">+{record.additions}</span>
            <span className="text-red-600">−{record.deletions}</span>
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "size-3 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-[2147483647]"
        >
          <Popover.Popup
            aria-label={`Changes in ${record.path}`}
            className="border-border bg-popover text-popover-foreground flex h-[min(420px,55vh)] min-h-0 w-[min(42rem,calc(100vw-2rem))] overflow-hidden rounded-xl border shadow-lg"
          >
            <LearnFileView
              record={record}
              displayMode={record.status === "unchanged" ? "source" : "diff"}
              variant="inline"
              onOpenInFiles={() => {
                setOpen(false);
                learnMode.openFile(
                  record.path,
                  record.status === "unchanged" ? "source" : "diff",
                );
              }}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
