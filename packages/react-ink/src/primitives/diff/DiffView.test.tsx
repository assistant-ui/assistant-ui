import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { parsePatch, computeDiff, foldContext } from "./diff-utils";
import { DiffContent } from "./DiffContent";
import { DiffHeader } from "./DiffHeader";
import { DiffRoot } from "./DiffRoot";
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

  it("strips CRLF line endings from parsed patch lines", () => {
    const patch = `diff --git a/x.txt b/x.txt
--- a/x.txt
+++ b/x.txt
@@ -1,2 +1,2 @@
 a\r
-b\r
+c\r
`;

    expect(parsePatch(patch)).toEqual([
      {
        oldName: "x.txt",
        newName: "x.txt",
        additions: 1,
        deletions: 1,
        lines: [
          {
            type: "normal",
            content: "a",
            oldLineNumber: 1,
            newLineNumber: 1,
          },
          {
            type: "del",
            content: "b",
            oldLineNumber: 2,
          },
          {
            type: "add",
            content: "c",
            newLineNumber: 2,
          },
        ],
      },
    ]);
  });

  it("ignores no-newline markers in unified diff patches", () => {
    const patch = `diff --git a/a.txt b/a.txt
--- a/a.txt
+++ b/a.txt
@@ -1 +1 @@
-old
\\ No newline at end of file
+new
\\ No newline at end of file
`;

    expect(parsePatch(patch)).toEqual([
      {
        oldName: "a.txt",
        newName: "a.txt",
        additions: 1,
        deletions: 1,
        lines: [
          {
            type: "del",
            content: "old",
            oldLineNumber: 1,
          },
          {
            type: "add",
            content: "new",
            newLineNumber: 1,
          },
        ],
      },
    ]);
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

  it("preserves blank-line additions and deletions", () => {
    expect(computeDiff("a\n", "a\n\n")).toEqual({
      additions: 1,
      deletions: 0,
      lines: [
        {
          type: "normal",
          content: "a",
          oldLineNumber: 1,
          newLineNumber: 1,
        },
        {
          type: "add",
          content: "",
          newLineNumber: 2,
        },
      ],
    });

    expect(computeDiff("a\n\n", "a\n")).toEqual({
      additions: 0,
      deletions: 1,
      lines: [
        {
          type: "normal",
          content: "a",
          oldLineNumber: 1,
          newLineNumber: 1,
        },
        {
          type: "del",
          content: "",
          oldLineNumber: 2,
        },
      ],
    });
  });

  it("strips CRLF line endings from computed diffs", () => {
    expect(computeDiff("a\r\nb\r\n", "a\r\nc\r\n")).toEqual({
      additions: 1,
      deletions: 1,
      lines: [
        {
          type: "normal",
          content: "a",
          oldLineNumber: 1,
          newLineNumber: 1,
        },
        {
          type: "del",
          content: "b",
          oldLineNumber: 2,
        },
        {
          type: "add",
          content: "c",
          newLineNumber: 2,
        },
      ],
    });
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
  it("supports composing primitives from prepared files", async () => {
    const frame = await renderFrame(
      <DiffRoot
        files={[
          {
            oldName: "before.txt",
            newName: "after.txt",
            additions: 1,
            deletions: 1,
            lines: [
              {
                type: "del",
                content: "before",
                oldLineNumber: 1,
              },
              {
                type: "add",
                content: "after",
                newLineNumber: 1,
              },
            ],
          },
        ]}
      >
        <DiffHeader />
        <DiffContent />
      </DiffRoot>,
    );

    expect(frame).toContain("before.txt");
    expect(frame).toContain("after.txt");
    expect(frame).toContain("+1");
    expect(frame).toContain("-1");
  });

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
