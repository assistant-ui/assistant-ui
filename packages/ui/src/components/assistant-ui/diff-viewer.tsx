"use client";

import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { diffLines } from "diff";
import parseDiff from "parse-diff";
import { FC, useMemo } from "react";
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
        lines.push({
          type: "add",
          content,
          newLineNumber: newLine++,
        });
      } else if (change.removed) {
        lines.push({
          type: "del",
          content,
          oldLineNumber: oldLine++,
        });
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

interface DiffLineComponentProps {
  line: ParsedLine;
  showLineNumbers: boolean;
  viewMode: "split" | "unified";
}

const DiffLineComponent: FC<DiffLineComponentProps> = ({
  line,
  showLineNumbers,
  viewMode,
}) => {
  const indicator = line.type === "add" ? "+" : line.type === "del" ? "-" : " ";

  const bgClass =
    line.type === "add"
      ? "bg-green-500/20"
      : line.type === "del"
        ? "bg-red-500/20"
        : "";

  const textClass =
    line.type === "add"
      ? "text-green-700 dark:text-green-400"
      : line.type === "del"
        ? "text-red-700 dark:text-red-400"
        : "";

  if (viewMode === "split") {
    return (
      <div className={cn("flex", bgClass)} data-type={line.type}>
        {showLineNumbers && (
          <>
            <span className="w-12 shrink-0 select-none px-2 text-right text-muted-foreground">
              {line.oldLineNumber ?? ""}
            </span>
            <span className="w-12 shrink-0 select-none px-2 text-right text-muted-foreground">
              {line.newLineNumber ?? ""}
            </span>
          </>
        )}
        <span className={cn("w-4 shrink-0 select-none text-center", textClass)}>
          {indicator}
        </span>
        <span className={cn("flex-1 whitespace-pre-wrap break-all", textClass)}>
          {line.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex", bgClass)} data-type={line.type}>
      {showLineNumbers && (
        <span className="w-12 shrink-0 select-none px-2 text-right text-muted-foreground">
          {line.type === "del"
            ? line.oldLineNumber
            : line.type === "add"
              ? line.newLineNumber
              : line.oldLineNumber}
        </span>
      )}
      <span className={cn("w-4 shrink-0 select-none text-center", textClass)}>
        {indicator}
      </span>
      <span className={cn("flex-1 whitespace-pre-wrap break-all", textClass)}>
        {line.content}
      </span>
    </div>
  );
};

export type DiffViewerProps = Partial<SyntaxHighlighterProps> & {
  patch?: string;
  oldFile?: { content: string; name?: string };
  newFile?: { content: string; name?: string };
  viewMode?: "split" | "unified";
  showLineNumbers?: boolean;
  className?: string;
};

/**
 * DiffViewer component for rendering diffs
 * Use it by passing to `componentsByLanguage` for diff in `markdown-text.tsx`
 *
 * @example
 * const MarkdownTextImpl = () => {
 *   return (
 *     <MarkdownTextPrimitive
 *       remarkPlugins={[remarkGfm]}
 *       className="aui-md"
 *       components={defaultComponents}
 *       componentsByLanguage={{
 *         diff: {
 *           SyntaxHighlighter: ({ code }) => <DiffViewer patch={code} />
 *         },
 *       }}
 *     />
 *   );
 * };
 *
 * @example
 * // Standalone usage with patch
 * <DiffViewer patch={diffString} viewMode="split" />
 *
 * @example
 * // File comparison
 * <DiffViewer
 *   oldFile={{ content: "old content", name: "file.txt" }}
 *   newFile={{ content: "new content", name: "file.txt" }}
 * />
 */
export const DiffViewer: FC<DiffViewerProps> = ({
  code,
  patch,
  oldFile,
  newFile,
  viewMode = "unified",
  showLineNumbers = true,
  className,
}) => {
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
      <pre className={cn("rounded-lg bg-muted p-4", className)}>
        No diff content provided
      </pre>
    );
  }

  return (
    <div
      className={cn(
        "aui-diff-viewer overflow-hidden rounded-lg border bg-background font-mono text-sm",
        className,
      )}
    >
      {parsedFiles.map((file, fileIndex) => (
        <div key={fileIndex}>
          {(file.oldName || file.newName) && (
            <div className="border-b bg-muted px-4 py-2 text-muted-foreground">
              {file.oldName && file.newName && file.oldName !== file.newName ? (
                <>
                  <span className="text-red-600 dark:text-red-400">
                    {file.oldName}
                  </span>
                  {" → "}
                  <span className="text-green-600 dark:text-green-400">
                    {file.newName}
                  </span>
                </>
              ) : (
                file.newName || file.oldName
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            {file.lines.map((line, lineIndex) => (
              <DiffLineComponent
                key={lineIndex}
                line={line}
                showLineNumbers={showLineNumbers}
                viewMode={viewMode}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

DiffViewer.displayName = "DiffViewer";
