"use client";

import { SampleFrame } from "@/components/docs/samples/sample-frame";

function DiffViewerStatic() {
  const lines = [
    { type: "del", content: "function greet(name) {", old: 1 },
    { type: "del", content: '  console.log("Hello, " + name);', old: 2 },
    { type: "add", content: "function greet(name: string): void {", new: 1 },
    { type: "add", content: "  console.log(`Hello, $" + "{name}!`);", new: 2 },
    { type: "normal", content: "}", old: 3, new: 3 },
    { type: "normal", content: "", old: 4, new: 4 },
    { type: "del", content: 'greet("World");', old: 5 },
    { type: "add", content: "// Call the function", new: 5 },
    { type: "add", content: 'greet("World");', new: 6 },
    { type: "add", content: 'greet("TypeScript");', new: 7 },
  ] as const;

  return (
    <div className="overflow-hidden rounded-lg border bg-background font-mono text-sm">
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

export function DiffViewerSample() {
  return (
    <SampleFrame className="h-80 overflow-hidden bg-muted/40 p-4">
      <DiffViewerStatic />
    </SampleFrame>
  );
}
