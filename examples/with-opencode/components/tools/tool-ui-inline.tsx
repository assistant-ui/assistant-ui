"use client";

import { memo, useMemo } from "react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import {
  ToolStatusIcon,
  basename,
  getPatchInfo,
  isCancelledToolStatus,
  str,
  truncate,
  type ToolCallStatusLike,
} from "@/components/tools/tool-ui-shared";

// ── Helpers ────────────────────────────────────────────────────────────

const shortenPath = (filepath: string, depth = 2): string => {
  const parts = filepath.split("/").filter(Boolean);
  if (parts.length <= depth) return filepath;
  return parts.slice(-depth).join("/");
};

// ── ToolCallShell ──────────────────────────────────────────────────────

const ToolCallShell = ({
  toolName,
  status,
  children,
}: {
  toolName: string;
  status?: ToolCallStatusLike;
  children?: React.ReactNode;
}) => {
  const isCancelled = isCancelledToolStatus(status);

  return (
    <div className="flex items-center gap-2 py-0.5 text-muted-foreground text-sm">
      <ToolStatusIcon status={status} />
      <span
        className={cn(
          "flex items-center gap-1.5 truncate",
          isCancelled && "line-through opacity-50",
        )}
      >
        <span className="font-medium">{toolName}</span>
        {children}
      </span>
    </div>
  );
};

// ── Factory for simple inline tools ────────────────────────────────────

const inlineTool = (
  argKeys: string | string[],
  format: (v: string) => string = truncate,
): ToolCallMessagePartComponent => {
  const keys = Array.isArray(argKeys) ? argKeys : [argKeys];
  const Component: ToolCallMessagePartComponent = memo(
    ({ toolName, args, status }) => {
      const value = keys.reduce<string>(
        (acc, key) => acc || str((args as Record<string, unknown>)?.[key]),
        "",
      );
      return (
        <ToolCallShell toolName={toolName} status={status}>
          {value && <span className="opacity-60">{format(value)}</span>}
        </ToolCallShell>
      );
    },
  );
  return Component;
};

// ── Per-tool inline components ─────────────────────────────────────────

export const ReadInline = inlineTool(
  ["file_path", "filePath", "path", "file"],
  (v) => truncate(shortenPath(v)),
);
ReadInline.displayName = "ReadInline";

export const EditInline = inlineTool("file_path", basename);
EditInline.displayName = "EditInline";

export const WriteInline = inlineTool("file_path", basename);
WriteInline.displayName = "WriteInline";

export const GrepInline = inlineTool("pattern");
GrepInline.displayName = "GrepInline";

export const GlobInline = inlineTool("pattern");
GlobInline.displayName = "GlobInline";

export const WebSearchInline = inlineTool("query");
WebSearchInline.displayName = "WebSearchInline";

export const WebFetchInline = inlineTool("url");
WebFetchInline.displayName = "WebFetchInline";

// Kept as a compact reference implementation even though the example
// currently uses the richer diff viewer from tool-ui-apply-patch.tsx.
export const ApplyPatchInline: ToolCallMessagePartComponent = memo(
  ({ toolName, args, status }) => {
    const patchText = str(args?.patchText);
    const patchInfo = useMemo(() => getPatchInfo(patchText), [patchText]);
    const isRunning = status?.type === "running";

    return (
      <ToolCallShell toolName={toolName} status={status}>
        {patchInfo.files.length > 0 && (
          <span className="opacity-60">
            {patchInfo.files.length === 1
              ? patchInfo.files[0]
              : `${patchInfo.files.length} files`}
          </span>
        )}
        {(patchInfo.added > 0 || patchInfo.removed > 0) && !isRunning && (
          <span className="ml-0.5 flex items-center gap-1 font-mono text-xs">
            {patchInfo.added > 0 && (
              <span className="text-green-500">+{patchInfo.added}</span>
            )}
            {patchInfo.removed > 0 && (
              <span className="text-red-500">-{patchInfo.removed}</span>
            )}
          </span>
        )}
      </ToolCallShell>
    );
  },
);
ApplyPatchInline.displayName = "ApplyPatchInline";

// ── Fallback — generic, for unknown/MCP tools ─────────────────────────

const SUMMARY_KEYS = [
  "file_path",
  "path",
  "pattern",
  "command",
  "query",
  "glob",
  "url",
] as const;

const ToolCallFallbackImpl: ToolCallMessagePartComponent = ({
  toolName,
  args,
  status,
}) => {
  const summary = useMemo(() => {
    if (!args || typeof args !== "object") return "";
    for (const key of SUMMARY_KEYS) {
      const v = (args as Record<string, unknown>)[key];
      if (typeof v === "string" && v) return truncate(v);
    }
    return "";
  }, [args]);

  return (
    <ToolCallShell toolName={toolName} status={status}>
      {summary && <span className="opacity-60">{summary}</span>}
    </ToolCallShell>
  );
};

export const ToolCallFallback = memo(ToolCallFallbackImpl);
ToolCallFallback.displayName = "ToolCallFallback";
