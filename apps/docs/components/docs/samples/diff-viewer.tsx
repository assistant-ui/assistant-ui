"use client";

import { useState } from "react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

type DiffLineType = "add" | "del" | "normal";

interface DiffLine {
  type: DiffLineType;
  content: string;
  old?: number;
  new?: number;
}

const DIFF_LINES: DiffLine[] = [
  { type: "del", content: "function greet(name) {", old: 1 },
  { type: "del", content: '  console.log("Hello, " + name);', old: 2 },
  { type: "add", content: "function greet(name: string): void {", new: 1 },
  { type: "add", content: "  console.log(`Hello, ${" + "name}!`);", new: 2 },
  { type: "normal", content: "}", old: 3, new: 3 },
  { type: "normal", content: "", old: 4, new: 4 },
  { type: "del", content: 'greet("World");', old: 5 },
  { type: "add", content: "// Call the function", new: 5 },
  { type: "add", content: 'greet("World");', new: 6 },
  { type: "add", content: 'greet("TypeScript");', new: 7 },
];

function UnifiedDiffView({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="w-full overflow-hidden rounded-lg border bg-background font-mono text-sm">
      <div className="border-b bg-muted px-4 py-2 text-muted-foreground">
        example.ts
      </div>
      <div className="overflow-x-auto">
        {lines.map((line, i) => {
          const indicator =
            line.type === "add" ? "+" : line.type === "del" ? "-" : " ";
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

          return (
            <div key={i} className={`flex ${bgClass}`}>
              <span className="w-12 shrink-0 select-none px-2 text-right text-muted-foreground">
                {line.type === "del"
                  ? line.old
                  : line.type === "add"
                    ? line.new
                    : line.old}
              </span>
              <span
                className={`w-4 shrink-0 select-none text-center ${textClass}`}
              >
                {indicator}
              </span>
              <span className={`flex-1 whitespace-pre ${textClass}`}>
                {line.content}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SplitPair {
  left: DiffLine | null;
  right: DiffLine | null;
}

function pairLines(lines: DiffLine[]): SplitPair[] {
  const pairs: SplitPair[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (line.type === "normal") {
      pairs.push({ left: line, right: line });
      i++;
    } else if (line.type === "del") {
      const deletions: DiffLine[] = [];
      while (i < lines.length && lines[i]!.type === "del") {
        deletions.push(lines[i]!);
        i++;
      }
      const additions: DiffLine[] = [];
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
    } else if (line.type === "add") {
      pairs.push({ left: null, right: line });
      i++;
    }
  }
  return pairs;
}

function SplitDiffView({ lines }: { lines: DiffLine[] }) {
  const pairs = pairLines(lines);

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-background font-mono text-sm">
      <div className="border-b bg-muted px-4 py-2 text-muted-foreground">
        example.ts
      </div>
      <div className="overflow-x-auto">
        {pairs.map((pair, i) => {
          const { left, right } = pair;
          const leftBg = left?.type === "del" ? "bg-red-500/20" : "";
          const rightBg = right?.type === "add" ? "bg-green-500/20" : "";
          const leftText =
            left?.type === "del" ? "text-red-700 dark:text-red-400" : "";
          const rightText =
            right?.type === "add" ? "text-green-700 dark:text-green-400" : "";

          return (
            <div key={i} className="flex">
              <div className={`flex w-1/2 border-r ${leftBg}`}>
                <span className="w-10 shrink-0 select-none px-2 text-right text-muted-foreground">
                  {left?.old ?? ""}
                </span>
                <span
                  className={`w-4 shrink-0 select-none text-center ${leftText}`}
                >
                  {left ? (left.type === "del" ? "-" : " ") : ""}
                </span>
                <span className={`flex-1 whitespace-pre ${leftText}`}>
                  {left?.content ?? ""}
                </span>
              </div>
              <div className={`flex w-1/2 ${rightBg}`}>
                <span className="w-10 shrink-0 select-none px-2 text-right text-muted-foreground">
                  {right?.new ?? ""}
                </span>
                <span
                  className={`w-4 shrink-0 select-none text-center ${rightText}`}
                >
                  {right ? (right.type === "add" ? "+" : " ") : ""}
                </span>
                <span className={`flex-1 whitespace-pre ${rightText}`}>
                  {right?.content ?? ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DiffViewerSample() {
  return (
    <SampleFrame className="h-auto overflow-hidden bg-muted/40 p-4">
      <UnifiedDiffView lines={DIFF_LINES} />
    </SampleFrame>
  );
}

export function DiffViewerSplitSample() {
  return (
    <SampleFrame className="h-auto overflow-hidden bg-muted/40 p-4">
      <SplitDiffView lines={DIFF_LINES} />
    </SampleFrame>
  );
}

export function DiffViewerViewModesSample() {
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");

  return (
    <SampleFrame className="h-auto overflow-hidden bg-muted/40">
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("unified")}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              viewMode === "unified"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            Unified
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              viewMode === "split"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            Split
          </button>
        </div>
        <div className="w-full max-w-3xl">
          {viewMode === "unified" ? (
            <UnifiedDiffView lines={DIFF_LINES} />
          ) : (
            <SplitDiffView lines={DIFF_LINES} />
          )}
        </div>
      </div>
    </SampleFrame>
  );
}
