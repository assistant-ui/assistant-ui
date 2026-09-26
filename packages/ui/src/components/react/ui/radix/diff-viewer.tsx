"use client";

import { type ComponentProps, useId, useMemo, useState } from "react";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { cva, type VariantProps } from "class-variance-authority";
import { diffLines } from "diff";
import { CheckIcon, CopyIcon } from "lucide-react";
import parseDiff from "parse-diff";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

type DiffLineType = "add" | "del" | "normal";

interface ParsedLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number | undefined;
  newLineNumber?: number | undefined;
}

interface ParsedHunk {
  header: string;
  lines: ParsedLine[];
}

interface ParsedFile {
  oldName?: string | undefined;
  newName?: string | undefined;
  lines: ParsedLine[];
  hunks: ParsedHunk[];
  additions: number;
  deletions: number;
}

interface SplitLinePair {
  left: ParsedLine | null;
  right: ParsedLine | null;
}

function parsePatch(patch: string): ParsedFile[] {
  const files = parseDiff(patch);
  return files.map((file) => {
    const hunks = file.chunks.map((chunk) => {
      const lines: ParsedLine[] = [];
      for (const change of chunk.changes) {
        if (change.type === "add") {
          lines.push({
            type: "add",
            content: change.content.slice(1),
            newLineNumber: change.ln,
          });
        } else if (change.type === "del") {
          lines.push({
            type: "del",
            content: change.content.slice(1),
            oldLineNumber: change.ln,
          });
        } else {
          lines.push({
            type: "normal",
            content: change.content.slice(1),
            oldLineNumber: change.ln1,
            newLineNumber: change.ln2,
          });
        }
      }
      return { header: chunk.content, lines };
    });

    const lines = hunks.flatMap((hunk) => hunk.lines);
    let additions = 0;
    let deletions = 0;
    for (const line of lines) {
      if (line.type === "add") additions++;
      if (line.type === "del") deletions++;
    }
    return {
      oldName: file.from,
      newName: file.to,
      lines,
      hunks,
      additions,
      deletions,
    };
  });
}

function computeDiff(
  oldContent: string,
  newContent: string,
): {
  lines: ParsedLine[];
  hunks: ParsedHunk[];
  additions: number;
  deletions: number;
} {
  const changes = diffLines(oldContent, newContent);
  const lines: ParsedLine[] = [];
  let oldLine = 1;
  let newLine = 1;
  let additions = 0;
  let deletions = 0;

  for (const change of changes) {
    const contentLines = change.value.replace(/\n$/, "").split("\n");
    for (const content of contentLines) {
      if (change.added) {
        additions++;
        lines.push({ type: "add", content, newLineNumber: newLine++ });
      } else if (change.removed) {
        deletions++;
        lines.push({ type: "del", content, oldLineNumber: oldLine++ });
      } else {
        lines.push({
          type: "normal",
          content,
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
      }
    }
  }
  const oldLines = lines.filter((line) => line.type !== "add").length;
  const newLines = lines.filter((line) => line.type !== "del").length;
  const oldStart = oldLines === 0 ? 0 : 1;
  const newStart = newLines === 0 ? 0 : 1;

  return {
    lines,
    hunks: [
      {
        header: `@@ -${oldStart},${oldLines} +${newStart},${newLines} @@`,
        lines,
      },
    ],
    additions,
    deletions,
  };
}

function formatDiffLine(line: ParsedLine): string {
  const indicator = line.type === "add" ? "+" : line.type === "del" ? "-" : " ";
  return `${indicator}${line.content}`;
}

function formatDiffFileName(name: string | undefined, prefix: "a" | "b") {
  return name === "/dev/null" ? name : `${prefix}/${name ?? "file"}`;
}

function formatUnifiedDiff(file: ParsedFile): string {
  return [
    `--- ${formatDiffFileName(file.oldName, "a")}`,
    `+++ ${formatDiffFileName(file.newName, "b")}`,
    ...file.hunks.flatMap((hunk) => [
      hunk.header,
      ...hunk.lines.map(formatDiffLine),
    ]),
  ].join("\n");
}

function pairLinesForSplit(lines: ParsedLine[]): SplitLinePair[] {
  const pairs: SplitLinePair[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (line.type === "normal") {
      pairs.push({ left: line, right: line });
      i++;
    } else if (line.type === "del") {
      const deletions: ParsedLine[] = [];
      while (i < lines.length && lines[i]!.type === "del") {
        deletions.push(lines[i]!);
        i++;
      }
      const additions: ParsedLine[] = [];
      while (i < lines.length && lines[i]!.type === "add") {
        additions.push(lines[i]!);
        i++;
      }
      const maxLen = Math.max(deletions.length, additions.length);
      for (let j = 0; j < maxLen; j++) {
        pairs.push({
          left: deletions[j] ?? null,
          right: additions[j] ?? null,
        });
      }
    } else {
      pairs.push({ left: null, right: line });
      i++;
    }
  }
  return pairs;
}

const diffViewerVariants = cva(
  "aui-diff-viewer overflow-hidden font-mono leading-relaxed [font-variant-ligatures:none]",
  {
    variants: {
      variant: {
        default:
          "border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] border",
        ghost: "bg-transparent",
        muted:
          "border-foreground/10 bg-foreground/[0.06] dark:bg-foreground/[0.08] border",
      },
      size: {
        sm: "text-[11px]",
        default: "text-[12.5px]",
        lg: "text-[13.5px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const diffLineVariants = cva("flex", {
  variants: {
    type: {
      add: "bg-[var(--diff-add-bg,var(--_diff-add-bg))] shadow-[inset_2px_0_0_var(--diff-add-rule,var(--color-green-500))] [--_diff-add-bg:color-mix(in_oklab,var(--color-green-500)_8%,transparent)] dark:[--_diff-add-bg:color-mix(in_oklab,var(--color-green-500)_15%,transparent)]",
      del: "bg-[var(--diff-del-bg,var(--_diff-del-bg))] shadow-[inset_2px_0_0_var(--diff-del-rule,var(--color-red-500))] [--_diff-del-bg:color-mix(in_oklab,var(--color-red-500)_8%,transparent)] dark:[--_diff-del-bg:color-mix(in_oklab,var(--color-red-500)_15%,transparent)]",
      normal: "",
      empty: "",
    },
  },
  defaultVariants: {
    type: "normal",
  },
});

const diffLineTextVariants = cva("", {
  variants: {
    type: {
      add: "text-[var(--diff-add-text,var(--color-green-600))] dark:text-[var(--diff-add-text-dark,var(--color-green-400))]",
      del: "text-[var(--diff-del-text,var(--color-red-600))] dark:text-[var(--diff-del-text-dark,var(--color-red-400))]",
      normal: "",
      empty: "",
    },
  },
  defaultVariants: {
    type: "normal",
  },
});

function getFileExtension(filename?: string | undefined): string {
  const ext = filename?.split(".").pop()?.toLowerCase();
  if (!ext) return "";
  return ext.toUpperCase();
}

function DiffViewerFileBadge({ filename }: { filename?: string | undefined }) {
  const ext = getFileExtension(filename);
  if (!ext) return null;

  return (
    <span
      data-slot="diff-viewer-file-badge"
      className="border-foreground/15 text-muted-foreground/70 inline-flex h-4 shrink-0 items-center border px-1 text-[9px] leading-none font-medium tracking-wide"
    >
      {ext}
    </span>
  );
}

function DiffViewerStats({
  additions,
  deletions,
}: {
  additions: number;
  deletions: number;
}) {
  return (
    <span
      data-slot="diff-viewer-stats"
      className="flex shrink-0 gap-1.5 text-[11px] tabular-nums"
    >
      <span className="text-green-600 dark:text-green-400">+{additions}</span>
      <span className="text-red-600 dark:text-red-400">−{deletions}</span>
    </span>
  );
}

function DiffViewerFile({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="diff-viewer-file" className={cn(className)} {...props} />
  );
}

function DiffViewerContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="diff-viewer-content"
      className={cn("overflow-x-auto", className)}
      {...props}
    />
  );
}

interface DiffViewerHeaderProps extends ComponentProps<"div"> {
  oldName?: string | undefined;
  newName?: string | undefined;
  additions?: number | undefined;
  deletions?: number | undefined;
  showIcon?: boolean | undefined;
  showStats?: boolean | undefined;
  copyText?: string | undefined;
  copyable?: boolean | undefined;
}

function DiffViewerHeader({
  oldName,
  newName,
  additions = 0,
  deletions = 0,
  showIcon = false,
  showStats = true,
  copyText,
  copyable = true,
  className,
  ...props
}: DiffViewerHeaderProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 1500,
  });

  if (!oldName && !newName) return null;

  const displayName = newName || oldName;

  return (
    <div
      data-slot="diff-viewer-header"
      className={cn(
        "border-foreground/10 text-muted-foreground flex h-9 items-center gap-2 border-b ps-3.5 pe-3 text-[11px] font-medium tracking-wide",
        className,
      )}
      {...props}
    >
      {showIcon && <DiffViewerFileBadge filename={displayName} />}
      <span className="min-w-0 flex-1 truncate">
        {oldName && newName && oldName !== newName ? (
          <>
            <span className="text-muted-foreground/60">{oldName}</span>
            <span className="text-muted-foreground/50">{" → "}</span>
            <span className="text-foreground/80">{newName}</span>
          </>
        ) : (
          displayName
        )}
      </span>
      {showStats && (additions > 0 || deletions > 0) && (
        <DiffViewerStats additions={additions} deletions={deletions} />
      )}
      {copyable && copyText && (
        <button
          type="button"
          aria-label={`Copy diff of ${displayName}`}
          onClick={() => copyToClipboard(copyText)}
          className="text-muted-foreground hover:text-foreground grid size-6 shrink-0 place-items-center rounded-sm transition-colors motion-reduce:transition-none"
        >
          {isCopied ? (
            <CheckIcon className="size-3.5" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

interface DiffViewerLineProps extends ComponentProps<"div"> {
  line: ParsedLine;
  showLineNumbers?: boolean | undefined;
}

function DiffViewerLine({
  line,
  showLineNumbers = true,
  className,
  ...props
}: DiffViewerLineProps) {
  const indicator = line.type === "add" ? "+" : line.type === "del" ? "-" : " ";

  return (
    <div
      data-slot="diff-viewer-line"
      data-type={line.type}
      className={cn(diffLineVariants({ type: line.type }), className)}
      {...props}
    >
      {showLineNumbers && (
        <span
          data-slot="diff-viewer-line-number"
          className="text-muted-foreground/40 w-10 shrink-0 px-2 text-end tabular-nums select-none"
        >
          {line.type === "del"
            ? line.oldLineNumber
            : line.type === "add"
              ? line.newLineNumber
              : line.oldLineNumber}
        </span>
      )}
      <span
        data-slot="diff-viewer-indicator"
        className={cn(
          "w-4 shrink-0 text-center select-none",
          diffLineTextVariants({ type: line.type }),
        )}
      >
        {indicator}
      </span>
      <span
        data-slot="diff-viewer-content"
        className="flex-1 pe-3.5 break-all whitespace-pre-wrap"
      >
        {line.content}
      </span>
    </div>
  );
}

interface DiffViewerSplitLineProps extends ComponentProps<"div"> {
  pair: SplitLinePair;
  showLineNumbers?: boolean | undefined;
}

function DiffViewerSplitLine({
  pair,
  showLineNumbers = true,
  className,
  ...props
}: DiffViewerSplitLineProps) {
  const { left, right } = pair;

  return (
    <div
      data-slot="diff-viewer-split-line"
      className={cn("flex", className)}
      {...props}
    >
      <div
        data-slot="diff-viewer-split-left"
        data-type={left?.type ?? "empty"}
        className={cn(
          "border-foreground/10 flex w-1/2 border-e",
          diffLineVariants({ type: left?.type ?? "empty" }),
        )}
      >
        {showLineNumbers && (
          <span className="text-muted-foreground/40 w-10 shrink-0 px-2 text-end tabular-nums select-none">
            {left?.oldLineNumber ?? ""}
          </span>
        )}
        <span
          className={cn(
            "w-4 shrink-0 text-center select-none",
            diffLineTextVariants({ type: left?.type ?? "empty" }),
          )}
        >
          {left ? (left.type === "del" ? "-" : " ") : ""}
        </span>
        <span className="flex-1 pe-3.5 break-all whitespace-pre-wrap">
          {left?.content ?? ""}
        </span>
      </div>
      <div
        data-slot="diff-viewer-split-right"
        data-type={right?.type ?? "empty"}
        className={cn(
          "flex w-1/2",
          diffLineVariants({ type: right?.type ?? "empty" }),
        )}
      >
        {showLineNumbers && (
          <span className="text-muted-foreground/40 w-10 shrink-0 px-2 text-end tabular-nums select-none">
            {right?.newLineNumber ?? ""}
          </span>
        )}
        <span
          className={cn(
            "w-4 shrink-0 text-center select-none",
            diffLineTextVariants({ type: right?.type ?? "empty" }),
          )}
        >
          {right ? (right.type === "add" ? "+" : " ") : ""}
        </span>
        <span className="flex-1 pe-3.5 break-all whitespace-pre-wrap">
          {right?.content ?? ""}
        </span>
      </div>
    </div>
  );
}

interface DiffViewerFileContentProps {
  file: ParsedFile;
  splitLinePairs: SplitLinePair[];
  viewMode: "split" | "unified";
  showLineNumbers: boolean;
  showIcon: boolean;
  showStats: boolean;
  copyable: boolean;
  maxCollapsedLines: number | undefined;
}

function DiffViewerFileContent({
  file,
  splitLinePairs,
  viewMode,
  showLineNumbers,
  showIcon,
  showStats,
  copyable,
  maxCollapsedLines,
}: DiffViewerFileContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();
  const renderedLineCount =
    viewMode === "split" ? splitLinePairs.length : file.lines.length;
  const isCollapsible =
    maxCollapsedLines !== undefined &&
    maxCollapsedLines >= 0 &&
    renderedLineCount > maxCollapsedLines;
  const isCollapsed = isCollapsible && !isExpanded;
  const visibleLineCount = isCollapsed ? maxCollapsedLines : renderedLineCount;

  return (
    <DiffViewerFile className="border-foreground/10 [contain-intrinsic-size:auto_240px] [content-visibility:auto] not-first:border-t">
      <DiffViewerHeader
        oldName={file.oldName}
        newName={file.newName}
        additions={file.additions}
        deletions={file.deletions}
        showIcon={showIcon}
        showStats={showStats}
        copyText={formatUnifiedDiff(file)}
        copyable={copyable}
      />
      <DiffViewerContent id={contentId} className="py-2">
        {viewMode === "split"
          ? splitLinePairs
              .slice(0, visibleLineCount)
              .map((pair, pairIndex) => (
                <DiffViewerSplitLine
                  key={pairIndex}
                  pair={pair}
                  showLineNumbers={showLineNumbers}
                />
              ))
          : file.lines
              .slice(0, visibleLineCount)
              .map((line, lineIndex) => (
                <DiffViewerLine
                  key={lineIndex}
                  line={line}
                  showLineNumbers={showLineNumbers}
                />
              ))}
      </DiffViewerContent>
      {isCollapsible && (
        <div className="border-foreground/10 flex border-t px-3.5 py-1.5">
          <button
            type="button"
            aria-expanded={!isCollapsed}
            aria-controls={contentId}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors motion-reduce:transition-none"
          >
            {isCollapsed ? `Show all ${renderedLineCount} lines` : "Show less"}
          </button>
        </div>
      )}
    </DiffViewerFile>
  );
}

export type DiffViewerProps = Partial<SyntaxHighlighterProps> &
  VariantProps<typeof diffViewerVariants> & {
    patch?: string | undefined;
    oldFile?: { content: string; name?: string | undefined } | undefined;
    newFile?: { content: string; name?: string | undefined } | undefined;
    viewMode?: "split" | "unified" | undefined;
    showLineNumbers?: boolean | undefined;
    showIcon?: boolean | undefined;
    showStats?: boolean | undefined;
    copyable?: boolean | undefined;
    maxCollapsedLines?: number | undefined;
    className?: string | undefined;
  };

function DiffViewer({
  code,
  patch,
  oldFile,
  newFile,
  viewMode = "unified",
  showLineNumbers = true,
  showIcon = false,
  showStats = true,
  copyable = true,
  maxCollapsedLines,
  variant,
  size,
  className,
}: DiffViewerProps) {
  const diffPatch = patch ?? code;
  const oldContent = oldFile?.content;
  const oldName = oldFile?.name;
  const newContent = newFile?.content;
  const newName = newFile?.name;

  const parsedFiles = useMemo<ParsedFile[]>(() => {
    if (diffPatch) {
      return parsePatch(diffPatch);
    }
    if (oldContent !== undefined && newContent !== undefined) {
      const { lines, hunks, additions, deletions } = computeDiff(
        oldContent,
        newContent,
      );
      return [
        {
          oldName,
          newName,
          lines,
          hunks,
          additions,
          deletions,
        },
      ];
    }
    return [];
  }, [diffPatch, oldContent, oldName, newContent, newName]);

  const splitLinePairs = useMemo<SplitLinePair[][]>(() => {
    if (viewMode !== "split") return [];
    return parsedFiles.map((file) => pairLinesForSplit(file.lines));
  }, [parsedFiles, viewMode]);

  if (parsedFiles.length === 0) {
    return (
      <pre
        data-slot="diff-viewer"
        className={cn(
          "border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] text-muted-foreground border px-3.5 py-3 font-mono text-xs",
          className,
        )}
      >
        No diff content provided
      </pre>
    );
  }

  return (
    <div
      data-slot="diff-viewer"
      data-view-mode={viewMode}
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      className={cn(diffViewerVariants({ variant, size }), className)}
    >
      {parsedFiles.map((file, fileIndex) => (
        <DiffViewerFileContent
          key={fileIndex}
          file={file}
          splitLinePairs={splitLinePairs[fileIndex] ?? []}
          viewMode={viewMode}
          showLineNumbers={showLineNumbers}
          showIcon={showIcon}
          showStats={showStats}
          copyable={copyable}
          maxCollapsedLines={maxCollapsedLines}
        />
      ))}
    </div>
  );
}

DiffViewer.displayName = "DiffViewer";

export type { ParsedLine, ParsedFile, SplitLinePair };

export {
  DiffViewer,
  DiffViewerFile,
  DiffViewerHeader,
  DiffViewerContent,
  DiffViewerLine,
  DiffViewerSplitLine,
  DiffViewerFileBadge,
  DiffViewerStats,
  diffViewerVariants,
  diffLineVariants,
  diffLineTextVariants,
  parsePatch,
  computeDiff,
};
