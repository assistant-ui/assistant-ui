"use client";

import type { ComponentProps } from "react";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { cva, type VariantProps } from "class-variance-authority";
import { diffLines } from "diff";
import parseDiff from "parse-diff";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type DiffLineType = "add" | "del" | "normal";

interface ParsedLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface ParsedFile {
  oldName?: string;
  newName?: string;
  lines: ParsedLine[];
}

interface SplitLinePair {
  left: ParsedLine | null;
  right: ParsedLine | null;
}

function parsePatch(patch: string): ParsedFile[] {
  const files = parseDiff(patch);
  return files.map((file) => {
    const lines: ParsedLine[] = [];
    for (const chunk of file.chunks) {
      let oldLine = chunk.oldStart;
      let newLine = chunk.newStart;
      for (const change of chunk.changes) {
        if (change.type === "add") {
          lines.push({
            type: "add",
            content: change.content.slice(1),
            newLineNumber: newLine++,
          });
        } else if (change.type === "del") {
          lines.push({
            type: "del",
            content: change.content.slice(1),
            oldLineNumber: oldLine++,
          });
        } else {
          lines.push({
            type: "normal",
            content: change.content.slice(1),
            oldLineNumber: oldLine++,
            newLineNumber: newLine++,
          });
        }
      }
    }
    return {
      oldName: file.from,
      newName: file.to,
      lines,
    };
  });
}

function computeDiff(oldContent: string, newContent: string): ParsedLine[] {
  const changes = diffLines(oldContent, newContent);
  const lines: ParsedLine[] = [];
  let oldLine = 1;
  let newLine = 1;

  for (const change of changes) {
    const contentLines = change.value.replace(/\n$/, "").split("\n");
    for (const content of contentLines) {
      if (change.added) {
        lines.push({ type: "add", content, newLineNumber: newLine++ });
      } else if (change.removed) {
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
  return lines;
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
  "aui-diff-viewer overflow-hidden rounded-lg border bg-background font-mono text-sm",
  {
    variants: {
      variant: {
        default: "",
        ghost: "border-0 bg-transparent",
        muted: "bg-muted/50",
      },
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
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
      add: "bg-green-500/20",
      del: "bg-red-500/20",
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
      add: "text-green-700 dark:text-green-400",
      del: "text-red-700 dark:text-red-400",
      normal: "",
      empty: "",
    },
  },
  defaultVariants: {
    type: "normal",
  },
});

interface DiffViewerHeaderProps extends ComponentProps<"div"> {
  oldName?: string;
  newName?: string;
}

function DiffViewerHeader({
  oldName,
  newName,
  className,
  ...props
}: DiffViewerHeaderProps) {
  if (!oldName && !newName) return null;

  return (
    <div
      data-slot="diff-viewer-header"
      className={cn(
        "border-b bg-muted px-4 py-2 text-muted-foreground",
        className,
      )}
      {...props}
    >
      {oldName && newName && oldName !== newName ? (
        <>
          <span className="text-red-600 dark:text-red-400">{oldName}</span>
          {" → "}
          <span className="text-green-600 dark:text-green-400">{newName}</span>
        </>
      ) : (
        newName || oldName
      )}
    </div>
  );
}

interface DiffViewerLineProps extends ComponentProps<"div"> {
  line: ParsedLine;
  showLineNumbers?: boolean;
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
          className="w-12 shrink-0 select-none px-2 text-right text-muted-foreground"
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
          "w-4 shrink-0 select-none text-center",
          diffLineTextVariants({ type: line.type }),
        )}
      >
        {indicator}
      </span>
      <span
        data-slot="diff-viewer-content"
        className={cn(
          "flex-1 whitespace-pre-wrap break-all",
          diffLineTextVariants({ type: line.type }),
        )}
      >
        {line.content}
      </span>
    </div>
  );
}

interface DiffViewerSplitLineProps extends ComponentProps<"div"> {
  pair: SplitLinePair;
  showLineNumbers?: boolean;
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
          "flex w-1/2 border-r",
          diffLineVariants({ type: left?.type ?? "empty" }),
        )}
      >
        {showLineNumbers && (
          <span className="w-12 shrink-0 select-none px-2 text-right text-muted-foreground">
            {left?.oldLineNumber ?? ""}
          </span>
        )}
        <span
          className={cn(
            "w-4 shrink-0 select-none text-center",
            diffLineTextVariants({ type: left?.type ?? "empty" }),
          )}
        >
          {left ? (left.type === "del" ? "-" : " ") : ""}
        </span>
        <span
          className={cn(
            "flex-1 whitespace-pre-wrap break-all",
            diffLineTextVariants({ type: left?.type ?? "empty" }),
          )}
        >
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
          <span className="w-12 shrink-0 select-none px-2 text-right text-muted-foreground">
            {right?.newLineNumber ?? ""}
          </span>
        )}
        <span
          className={cn(
            "w-4 shrink-0 select-none text-center",
            diffLineTextVariants({ type: right?.type ?? "empty" }),
          )}
        >
          {right ? (right.type === "add" ? "+" : " ") : ""}
        </span>
        <span
          className={cn(
            "flex-1 whitespace-pre-wrap break-all",
            diffLineTextVariants({ type: right?.type ?? "empty" }),
          )}
        >
          {right?.content ?? ""}
        </span>
      </div>
    </div>
  );
}

export type DiffViewerProps = Partial<SyntaxHighlighterProps> &
  VariantProps<typeof diffViewerVariants> & {
    patch?: string;
    oldFile?: { content: string; name?: string };
    newFile?: { content: string; name?: string };
    viewMode?: "split" | "unified";
    showLineNumbers?: boolean;
    className?: string;
  };

function DiffViewer({
  code,
  patch,
  oldFile,
  newFile,
  viewMode = "unified",
  showLineNumbers = true,
  variant,
  size,
  className,
}: DiffViewerProps) {
  const diffPatch = patch ?? code;

  const parsedFiles = useMemo(() => {
    if (diffPatch) {
      return parsePatch(diffPatch);
    }
    if (oldFile && newFile) {
      return [
        {
          oldName: oldFile.name,
          newName: newFile.name,
          lines: computeDiff(oldFile.content, newFile.content),
        },
      ];
    }
    return [];
  }, [diffPatch, oldFile, newFile]);

  if (parsedFiles.length === 0) {
    return (
      <pre
        data-slot="diff-viewer"
        className={cn("rounded-lg bg-muted p-4", className)}
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
        <div key={fileIndex} data-slot="diff-viewer-file">
          <DiffViewerHeader oldName={file.oldName} newName={file.newName} />
          <div data-slot="diff-viewer-content" className="overflow-x-auto">
            {viewMode === "split"
              ? pairLinesForSplit(file.lines).map((pair, pairIndex) => (
                  <DiffViewerSplitLine
                    key={pairIndex}
                    pair={pair}
                    showLineNumbers={showLineNumbers}
                  />
                ))
              : file.lines.map((line, lineIndex) => (
                  <DiffViewerLine
                    key={lineIndex}
                    line={line}
                    showLineNumbers={showLineNumbers}
                  />
                ))}
          </div>
        </div>
      ))}
    </div>
  );
}

DiffViewer.displayName = "DiffViewer";

export {
  DiffViewer,
  DiffViewerHeader,
  DiffViewerLine,
  DiffViewerSplitLine,
  diffViewerVariants,
  diffLineVariants,
  diffLineTextVariants,
};
