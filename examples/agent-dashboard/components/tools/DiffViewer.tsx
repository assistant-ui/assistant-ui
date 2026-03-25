"use client";

import { useMemo, useState } from "react";
import { diffLines } from "diff";
import { Edit3, ChevronDown, ChevronRight, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  filename?: string;
  className?: string;
}

interface DiffLine {
  type: "unchanged" | "added" | "removed";
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const diff: DiffLine[] = [];
  const changes = diffLines(oldContent, newContent);
  let oldLineNumber = 1;
  let newLineNumber = 1;

  for (const change of changes) {
    const lines = change.value.split("\n");
    if (lines[lines.length - 1] === "") {
      lines.pop();
    }

    const type: DiffLine["type"] = change.added
      ? "added"
      : change.removed
        ? "removed"
        : "unchanged";

    for (const line of lines) {
      diff.push({
        type,
        content: line,
        oldLineNumber: type === "added" ? null : oldLineNumber++,
        newLineNumber: type === "removed" ? null : newLineNumber++,
      });
    }
  }

  return diff;
}

export function DiffViewer({
  oldContent,
  newContent,
  filename,
  className,
}: DiffViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);

  const diff = useMemo(
    () => computeDiff(oldContent, newContent),
    [oldContent, newContent],
  );
  const addedCount = diff.filter((l) => l.type === "added").length;
  const removedCount = diff.filter((l) => l.type === "removed").length;

  const displayDiff = showOnlyChanges
    ? diff.filter((l) => l.type !== "unchanged")
    : diff;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 font-mono text-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-zinc-700 border-b bg-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-zinc-400" />
          {filename && <span className="text-zinc-300">{filename}</span>}
          <span className="flex items-center gap-1 rounded bg-green-500/20 px-1.5 py-0.5 text-green-400 text-xs">
            <Plus className="h-3 w-3" />
            {addedCount}
          </span>
          <span className="flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-red-400 text-xs">
            <Minus className="h-3 w-3" />
            {removedCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOnlyChanges(!showOnlyChanges)}
            className={cn(
              "rounded px-2 py-1 text-xs transition-colors",
              showOnlyChanges
                ? "bg-zinc-700 text-zinc-200"
                : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            Changes only
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Diff Content */}
      {isExpanded && (
        <div className="overflow-x-auto">
          {displayDiff.map((line, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                line.type === "added" && "bg-green-500/10",
                line.type === "removed" && "bg-red-500/10",
              )}
            >
              <span className="w-8 shrink-0 select-none px-1 text-right text-zinc-600">
                {line.oldLineNumber ?? ""}
              </span>
              <span className="w-8 shrink-0 select-none px-1 text-right text-zinc-600">
                {line.newLineNumber ?? ""}
              </span>
              <span
                className={cn(
                  "w-6 shrink-0 select-none text-center",
                  line.type === "added" && "text-green-400",
                  line.type === "removed" && "text-red-400",
                )}
              >
                {line.type === "added" && "+"}
                {line.type === "removed" && "-"}
              </span>
              <span
                className={cn(
                  "flex-1 whitespace-pre px-2",
                  line.type === "added" && "text-green-300",
                  line.type === "removed" && "text-red-300",
                  line.type === "unchanged" && "text-zinc-300",
                )}
              >
                {line.content}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
