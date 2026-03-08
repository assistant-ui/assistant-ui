"use client";

import { useState } from "react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { DiffViewer } from "@/components/assistant-ui/diff-viewer";

const SAMPLE_PATCH = `--- a/example.ts
+++ b/example.ts
@@ -1,5 +1,7 @@
-function greet(name) {
-  console.log("Hello, " + name);
+function greet(name: string): void {
+  console.log(\`Hello, \${name}!\`);
 }

-greet("World");
+// Call the function
+greet("World");
+greet("TypeScript");`;

const SMALL_PATCH = `--- a/example.ts
+++ b/example.ts
@@ -1 +1 @@
-let x = 1;
+const x = 1;`;

export function DiffViewerSample() {
  return (
    <SampleFrame className="h-auto overflow-hidden bg-muted/40 p-4">
      <DiffViewer patch={SAMPLE_PATCH} />
    </SampleFrame>
  );
}

export function DiffViewerSplitSample() {
  return (
    <SampleFrame className="h-auto overflow-hidden bg-muted/40 p-4">
      <DiffViewer patch={SAMPLE_PATCH} viewMode="split" />
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
          <DiffViewer patch={SAMPLE_PATCH} viewMode={viewMode} />
        </div>
      </div>
    </SampleFrame>
  );
}

export function DiffViewerVariantsSample() {
  return (
    <SampleFrame className="h-auto overflow-hidden bg-muted/40 p-4">
      <div className="grid w-full max-w-3xl gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <span className="font-medium text-muted-foreground text-xs">
            default
          </span>
          <DiffViewer
            patch={SMALL_PATCH}
            variant="default"
            showLineNumbers={false}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-medium text-muted-foreground text-xs">
            ghost
          </span>
          <DiffViewer
            patch={SMALL_PATCH}
            variant="ghost"
            showLineNumbers={false}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-medium text-muted-foreground text-xs">
            muted
          </span>
          <DiffViewer
            patch={SMALL_PATCH}
            variant="muted"
            showLineNumbers={false}
          />
        </div>
      </div>
    </SampleFrame>
  );
}

export function DiffViewerSizesSample() {
  return (
    <SampleFrame className="h-auto overflow-hidden bg-muted/40 p-4">
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-medium text-muted-foreground text-xs">sm</span>
          <DiffViewer patch={SMALL_PATCH} size="sm" showLineNumbers={false} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-medium text-muted-foreground text-xs">
            default
          </span>
          <DiffViewer
            patch={SMALL_PATCH}
            size="default"
            showLineNumbers={false}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-medium text-muted-foreground text-xs">lg</span>
          <DiffViewer patch={SMALL_PATCH} size="lg" showLineNumbers={false} />
        </div>
      </div>
    </SampleFrame>
  );
}
