"use client";

import { memo, useMemo } from "react";
import { CheckIcon, LoaderIcon, XCircleIcon } from "lucide-react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";

// ── Shared helpers ──────────────────────────────────────────────────────

const basename = (filepath: string): string => {
  const parts = filepath.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? filepath;
};

const shortenPath = (filepath: string, depth = 2): string => {
  const parts = filepath.split("/").filter(Boolean);
  if (parts.length <= depth) return filepath;
  return parts.slice(-depth).join("/");
};

const truncate = (s: string, max = 80): string =>
  s.length > max ? `${s.slice(0, max - 3)}...` : s;

const str = (v: unknown): string => (typeof v === "string" ? v : "");

const unique = <T,>(items: readonly T[]) => [...new Set(items)];

// ── StatusIcon ──────────────────────────────────────────────────────────

const StatusIcon = ({
  statusType,
  isCancelled,
}: {
  statusType: string;
  isCancelled: boolean;
}) => {
  if (statusType === "running")
    return <LoaderIcon className="size-3 shrink-0 animate-spin" />;
  if (statusType === "incomplete")
    return (
      <XCircleIcon
        className={`size-3 shrink-0 ${isCancelled ? "" : "text-destructive"}`}
      />
    );
  return <CheckIcon className="size-3 shrink-0" />;
};

// ── Shared inline shell ─────────────────────────────────────────────────

const ToolCallShell = ({
  toolName,
  status,
  children,
}: {
  toolName: string;
  status?: { type: string; reason?: string };
  children?: React.ReactNode;
}) => {
  const statusType = status?.type ?? "complete";
  const isCancelled =
    status?.type === "incomplete" &&
    (status as { reason?: string }).reason === "cancelled";

  return (
    <div className="flex items-center gap-2 py-0.5 text-muted-foreground text-sm">
      <StatusIcon statusType={statusType} isCancelled={isCancelled} />
      <span
        className={`flex items-center gap-1.5 truncate ${isCancelled ? "line-through opacity-50" : ""}`}
      >
        <span className="font-medium">{toolName}</span>
        {children}
      </span>
    </div>
  );
};

// ── Per-tool inline components ──────────────────────────────────────────

/** Read — show shortened path (last 2 segments) */
export const ReadInline: ToolCallMessagePartComponent = memo(
  ({ toolName, args, status }) => (
    <ToolCallShell toolName={toolName} status={status}>
      <span className="opacity-60">
        {truncate(
          shortenPath(
            str(args?.file_path ?? args?.filePath ?? args?.path ?? args?.file),
          ),
        )}
      </span>
    </ToolCallShell>
  ),
);
ReadInline.displayName = "ReadInline";

/** Edit — show basename of the file */
export const EditInline: ToolCallMessagePartComponent = memo(
  ({ toolName, args, status }) => (
    <ToolCallShell toolName={toolName} status={status}>
      <span className="opacity-60">{basename(str(args?.file_path))}</span>
    </ToolCallShell>
  ),
);
EditInline.displayName = "EditInline";

/** Write — show basename of the file */
export const WriteInline: ToolCallMessagePartComponent = memo(
  ({ toolName, args, status }) => (
    <ToolCallShell toolName={toolName} status={status}>
      <span className="opacity-60">{basename(str(args?.file_path))}</span>
    </ToolCallShell>
  ),
);
WriteInline.displayName = "WriteInline";

/** Bash — show truncated command */
export const BashInline: ToolCallMessagePartComponent = memo(
  ({ toolName, args, status }) => (
    <ToolCallShell toolName={toolName} status={status}>
      <span className="opacity-60">{truncate(str(args?.command))}</span>
    </ToolCallShell>
  ),
);
BashInline.displayName = "BashInline";

/** Grep — show the search pattern */
export const GrepInline: ToolCallMessagePartComponent = memo(
  ({ toolName, args, status }) => (
    <ToolCallShell toolName={toolName} status={status}>
      <span className="opacity-60">{truncate(str(args?.pattern))}</span>
    </ToolCallShell>
  ),
);
GrepInline.displayName = "GrepInline";

/** Glob — show the glob pattern */
export const GlobInline: ToolCallMessagePartComponent = memo(
  ({ toolName, args, status }) => (
    <ToolCallShell toolName={toolName} status={status}>
      <span className="opacity-60">{truncate(str(args?.pattern))}</span>
    </ToolCallShell>
  ),
);
GlobInline.displayName = "GlobInline";

/** WebSearch — show the query */
export const WebSearchInline: ToolCallMessagePartComponent = memo(
  ({ toolName, args, status }) => (
    <ToolCallShell toolName={toolName} status={status}>
      <span className="opacity-60">{truncate(str(args?.query))}</span>
    </ToolCallShell>
  ),
);
WebSearchInline.displayName = "WebSearchInline";

/** WebFetch — show the URL */
export const WebFetchInline: ToolCallMessagePartComponent = memo(
  ({ toolName, args, status }) => (
    <ToolCallShell toolName={toolName} status={status}>
      <span className="opacity-60">{truncate(str(args?.url))}</span>
    </ToolCallShell>
  ),
);
WebFetchInline.displayName = "WebFetchInline";

/** apply_patch — show file(s) + added/removed line counts */
export const ApplyPatchInline: ToolCallMessagePartComponent = memo(
  ({ toolName, args, status }) => {
    const statusType = status?.type ?? "complete";
    const isRunning = statusType === "running";
    const patchText = str(args?.patchText);

    const patchInfo = useMemo(() => {
      if (!patchText) return { files: [] as string[], added: 0, removed: 0 };

      const files = unique(
        [
          ...patchText.matchAll(
            /^\*\*\*\s+(?:Update|Add|Delete)\s+File:\s+(.+)$/gm,
          ),
        ]
          .map((m) => basename(m[1]!.trim()))
          .filter(Boolean),
      );

      let added = 0;
      let removed = 0;
      for (const line of patchText.split("\n")) {
        if (/^\+/.test(line)) added++;
        else if (/^-/.test(line)) removed++;
      }

      return { files, added, removed };
    }, [patchText]);

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

// ── Fallback — truly generic, for unknown/MCP tools ─────────────────────

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
