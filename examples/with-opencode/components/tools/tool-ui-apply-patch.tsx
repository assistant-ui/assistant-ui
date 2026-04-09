"use client";

import { memo, useMemo, useState } from "react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { PatchDiff } from "@pierre/diffs/react";
import {
  ToolStatusIcon,
  getPatchInfo,
  isCancelledToolStatus,
  str,
} from "@/components/tools/tool-ui-shared";

// ── Patch format conversion ──────────────────────────────────────────────
// Claude Code's apply_patch uses a custom "v2" format:
//   *** Begin Patch
//   *** Update File: path/to/file.ts
//   @@ context search text @@
//    context line
//   -removed
//   +added
//   *** End Patch
//
// The @@ markers are context-search strings, NOT standard unified diff
// hunk headers. We convert to proper unified diff for @pierre/diffs.

interface PatchBlock {
  type: string;
  path: string;
  body: string;
}

function parseClaudePatchBlocks(patchText: string): PatchBlock[] {
  // Strip wrapper lines
  const cleaned = patchText
    .replace(/^\*\*\*\s*Begin Patch\s*$/gm, "")
    .replace(/^\*\*\*\s*End Patch\s*$/gm, "")
    .trim();

  const headerRegex = /^\*\*\*\s+(Update|Add|Delete)\s+File:\s+(.+)$/gm;
  const blocks: PatchBlock[] = [];
  let lastIndex = 0;
  let match;

  while ((match = headerRegex.exec(cleaned)) !== null) {
    if (blocks.length > 0) {
      blocks[blocks.length - 1]!.body = cleaned.slice(lastIndex, match.index);
    }
    blocks.push({ type: match[1]!, path: match[2]!.trim(), body: "" });
    lastIndex = match.index + match[0].length;
  }
  if (blocks.length > 0) {
    blocks[blocks.length - 1]!.body = cleaned.slice(lastIndex);
  }

  return blocks;
}

function buildHunkHeader(
  lines: string[],
  oldStart: number,
  newStart: number,
): { header: string; oldCount: number; newCount: number } {
  let oldCount = 0;
  let newCount = 0;
  for (const line of lines) {
    if (line.startsWith("+")) newCount++;
    else if (line.startsWith("-")) oldCount++;
    else {
      // context line (space prefix or empty)
      oldCount++;
      newCount++;
    }
  }
  return {
    header: `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`,
    oldCount,
    newCount,
  };
}

function claudeBlockToUnifiedDiff(block: PatchBlock): string {
  const { type, path, body } = block;
  const bodyLines = body
    .split("\n")
    .filter((l) => l.trim() !== "" || l.startsWith(" "));

  // Filter out empty trailing lines but keep intentional blank context lines
  const diffLines: string[] = [];
  for (const line of bodyLines) {
    // Skip Claude's @@ context search @@ markers (e.g. "@@ function foo() { @@")
    // These are NOT standard unified diff hunk headers (@@ -N,M +N,M @@)
    if (/^@@.*@@\s*$/.test(line)) continue;
    // Keep actual diff lines: +, -, or space-prefixed context
    if (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")) {
      diffLines.push(line);
    }
  }

  let gitHeader: string;
  let fileHeader: string;
  switch (type) {
    case "Add":
      gitHeader = `diff --git a/${path} b/${path}\nnew file mode 100644`;
      fileHeader = `--- /dev/null\n+++ b/${path}`;
      break;
    case "Delete":
      gitHeader = `diff --git a/${path} b/${path}\ndeleted file mode 100644`;
      fileHeader = `--- a/${path}\n+++ /dev/null`;
      break;
    default:
      gitHeader = `diff --git a/${path} b/${path}`;
      fileHeader = `--- a/${path}\n+++ b/${path}`;
  }

  if (diffLines.length === 0) return `${gitHeader}\n${fileHeader}`;

  // For Add files, all lines should be additions
  if (type === "Add") {
    const addLines = diffLines.map((l) => (l.startsWith("+") ? l : `+${l}`));
    const count = addLines.length;
    return `${gitHeader}\n${fileHeader}\n@@ -0,0 +1,${count} @@\n${addLines.join("\n")}`;
  }

  // For Delete files, all lines should be deletions
  if (type === "Delete") {
    const delLines = diffLines.map((l) => (l.startsWith("-") ? l : `-${l}`));
    const count = delLines.length;
    return `${gitHeader}\n${fileHeader}\n@@ -1,${count} +0,0 @@\n${delLines.join("\n")}`;
  }

  // For Update files, synthesize proper hunk headers
  const { header: hunkHeader } = buildHunkHeader(diffLines, 1, 1);
  return `${gitHeader}\n${fileHeader}\n${hunkHeader}\n${diffLines.join("\n")}`;
}

// ── Component ────────────────────────────────────────────────────────────

export const ApplyPatchDiff: ToolCallMessagePartComponent = memo(
  ({ toolName, args, status }) => {
    const [open, setOpen] = useState(false);
    const patchText = str(args?.patchText);

    const patchInfo = useMemo(() => getPatchInfo(patchText), [patchText]);

    const unifiedPatch = useMemo(() => {
      if (!patchText) return "";
      const blocks = parseClaudePatchBlocks(patchText);
      return blocks.map(claudeBlockToUnifiedDiff).join("\n");
    }, [patchText]);

    const isRunning = status?.type === "running";
    const isCancelled = isCancelledToolStatus(status);
    const hasDiff = unifiedPatch.length > 0 && !isRunning;

    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex w-full items-center gap-2 py-0.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <ToolStatusIcon
              status={status}
              completeIcon={<CheckIcon className="size-3 shrink-0" />}
            />

            <span
              className={cn(
                "flex items-center gap-1.5 truncate",
                isCancelled && "line-through opacity-50",
              )}
            >
              <span className="font-medium">{toolName}</span>
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
            </span>

            {hasDiff && (
              <>
                <span className="mt-0.5 min-w-4 flex-1 self-center border-muted-foreground/20 border-b-[0.5px] transition-colors group-hover:border-muted-foreground/50" />
                <ChevronRightIcon
                  className={cn(
                    "mt-0.5 size-3.75 shrink-0 stroke-muted-foreground/60 transition-[transform,stroke] group-hover:stroke-foreground/60",
                    open && "rotate-90",
                  )}
                />
              </>
            )}
          </button>
        </CollapsibleTrigger>

        {hasDiff && (
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down data-[state=closed]:ease-out data-[state=open]:ease-in">
            <div className="mt-1 ml-5 overflow-hidden rounded-md border">
              <PatchDiff
                patch={unifiedPatch}
                options={{
                  theme: { dark: "pierre-dark", light: "pierre-light" },
                  diffStyle: "unified",
                  overflow: "wrap",
                }}
              />
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    );
  },
);
ApplyPatchDiff.displayName = "ApplyPatchDiff";
