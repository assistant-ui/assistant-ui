import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { parsePatch, computeDiff, foldContext } from "./diff-utils";
import { DiffView } from "./DiffView";

const renderFrame = async (node: ReactElement) => {
  const instance = render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return instance.lastFrame() ?? "";
};

afterEach(() => {
  cleanup();
});

const SAMPLE_PATCH = `diff --git a/hello.txt b/hello.txt
index 1234567..abcdefg 100644
--- a/hello.txt
+++ b/hello.txt
@@ -1,3 +1,4 @@
 line 1
-line 2
+line 2 modified
+line 2.5 added
 line 3
`;

describe("parsePatch", () => {
  it("parses a unified diff string", () => {
    const files = parsePatch(SAMPLE_PATCH);
    expect(files).toHaveLength(1);
    const file = files[0]!;
    expect(file.oldName).toBe("hello.txt");
    expect(file.newName).toBe("hello.txt");
    expect(file.additions).toBe(2);
    expect(file.deletions).toBe(1);

    const types = file.lines.map((l) => l.type);
    expect(types).toContain("add");
    expect(types).toContain("del");
    expect(types).toContain("normal");
  });
});

describe("computeDiff", () => {
  it("diffs two strings", () => {
    const result = computeDiff("alpha\nbeta\n", "alpha\ngamma\n");
    expect(result.additions).toBeGreaterThan(0);
    expect(result.deletions).toBeGreaterThan(0);
    const types = result.lines.map((l) => l.type);
    expect(types).toContain("add");
    expect(types).toContain("del");
    expect(types).toContain("normal");
  });
});

describe("foldContext", () => {
  it("folds unchanged regions beyond contextLines", () => {
    const lines = [
      ...Array.from({ length: 10 }, (_, i) => ({
        type: "normal" as const,
        content: `line ${i}`,
        oldLineNumber: i + 1,
        newLineNumber: i + 1,
      })),
      { type: "add" as const, content: "new line", newLineNumber: 11 },
      ...Array.from({ length: 10 }, (_, i) => ({
        type: "normal" as const,
        content: `line ${i + 11}`,
        oldLineNumber: i + 11,
        newLineNumber: i + 12,
      })),
    ];

    const result = foldContext(lines, 2);
    const folds = result.filter((l) => l.type === "fold");
    expect(folds.length).toBeGreaterThan(0);
    const totalHidden = folds.reduce(
      (sum, f) => sum + (f.type === "fold" ? f.hiddenCount : 0),
      0,
    );
    expect(totalHidden).toBe(16);
  });
});

describe("DiffView", () => {
  it("renders a basic patch", async () => {
    const frame = await renderFrame(<DiffView patch={SAMPLE_PATCH} />);
    expect(frame).toContain("hello.txt");
    expect(frame).toContain("+");
    expect(frame).toContain("-");
  });

  it("renders from oldFile/newFile", async () => {
    const frame = await renderFrame(
      <DiffView
        oldFile={{ content: "hello\nworld\n", name: "test.txt" }}
        newFile={{ content: "hello\nearth\n", name: "test.txt" }}
      />,
    );
    expect(frame).toContain("test.txt");
    expect(frame).toContain("+");
    expect(frame).toContain("-");
  });

  it("hides line numbers when showLineNumbers=false", async () => {
    const withNumbers = await renderFrame(<DiffView patch={SAMPLE_PATCH} />);
    const withoutNumbers = await renderFrame(
      <DiffView patch={SAMPLE_PATCH} showLineNumbers={false} />,
    );
    expect(withNumbers.length).toBeGreaterThan(withoutNumbers.length);
  });

  it("truncates with maxLines", async () => {
    const manyLines = Array.from({ length: 50 }, (_, i) => `+line${i}`).join(
      "\n",
    );
    const patch = `diff --git a/big.txt b/big.txt
--- a/big.txt
+++ b/big.txt
@@ -0,0 +1,50 @@
${manyLines}
`;
    const frame = await renderFrame(<DiffView patch={patch} maxLines={5} />);
    expect(frame).toContain("more lines");
  });

  it("folds context lines", async () => {
    const normalBefore = Array.from({ length: 10 }, (_, i) => ` line${i}`).join(
      "\n",
    );
    const normalAfter = Array.from({ length: 10 }, (_, i) => ` after${i}`).join(
      "\n",
    );
    const patch = `diff --git a/ctx.txt b/ctx.txt
--- a/ctx.txt
+++ b/ctx.txt
@@ -1,21 +1,22 @@
${normalBefore}
+inserted
${normalAfter}
`;
    const frame = await renderFrame(
      <DiffView patch={patch} contextLines={2} />,
    );
    expect(frame).toContain("lines hidden");
  });

  it("renders multi-file patches", async () => {
    const patch = `diff --git a/a.txt b/a.txt
--- a/a.txt
+++ b/a.txt
@@ -1 +1 @@
-old a
+new a
diff --git a/b.txt b/b.txt
--- a/b.txt
+++ b/b.txt
@@ -1 +1 @@
-old b
+new b
`;
    const frame = await renderFrame(<DiffView patch={patch} />);
    expect(frame).toContain("a.txt");
    expect(frame).toContain("b.txt");
  });
});
