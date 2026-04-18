import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "ink-testing-library";
import {
  parsePatch,
  computeDiff,
  foldContext,
} from "../primitives/diff/diff-utils";
import { DiffContent } from "../primitives/diff/DiffContent";
import { DiffHeader } from "../primitives/diff/DiffHeader";
import {
  buildIntraLineSegments,
  buildLinePairMap,
} from "../primitives/diff/intra-line-utils";
import { DiffRoot } from "../primitives/diff/DiffRoot";
import { DiffView } from "../primitives/diff/DiffView";
import type { ParsedLine } from "../primitives/diff/types";

const renderFrame = async (node: ReactElement) => {
  const instance = render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return instance.lastFrame() ?? "";
};

const makeDelLine = (content: string, oldLineNumber: number): ParsedLine => ({
  type: "del",
  content,
  oldLineNumber,
});

const makeAddLine = (content: string, newLineNumber: number): ParsedLine => ({
  type: "add",
  content,
  newLineNumber,
});

const makeNormalLine = (
  content: string,
  oldLineNumber: number,
  newLineNumber: number,
): ParsedLine => ({
  type: "normal",
  content,
  oldLineNumber,
  newLineNumber,
});

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

describe("buildLinePairMap", () => {
  it("pairs a single adjacent replacement", () => {
    const del = makeDelLine("old value", 1);
    const add = makeAddLine("new value", 1);

    const pairMap = buildLinePairMap([del, add]);

    expect(pairMap.get(del)).toEqual({
      role: "del",
      counterpart: add,
    });
    expect(pairMap.get(add)).toEqual({
      role: "add",
      counterpart: del,
    });
  });

  it("pairs equal-length adjacent delete and add runs in order", () => {
    const del1 = makeDelLine("old alpha", 1);
    const del2 = makeDelLine("old beta", 2);
    const add1 = makeAddLine("new alpha", 1);
    const add2 = makeAddLine("new beta", 2);

    const pairMap = buildLinePairMap([del1, del2, add1, add2]);

    expect(pairMap.get(del1)?.counterpart).toBe(add1);
    expect(pairMap.get(del2)?.counterpart).toBe(add2);
    expect(pairMap.get(add1)?.counterpart).toBe(del1);
    expect(pairMap.get(add2)?.counterpart).toBe(del2);
  });

  it("pairs equal-length block rewrites of length three", () => {
    const del1 = makeDelLine("old alpha", 1);
    const del2 = makeDelLine("old beta", 2);
    const del3 = makeDelLine("old gamma", 3);
    const add1 = makeAddLine("new alpha", 1);
    const add2 = makeAddLine("new beta", 2);
    const add3 = makeAddLine("new gamma", 3);

    const pairMap = buildLinePairMap([del1, del2, del3, add1, add2, add3]);

    expect(pairMap.get(del1)?.counterpart).toBe(add1);
    expect(pairMap.get(del2)?.counterpart).toBe(add2);
    expect(pairMap.get(del3)?.counterpart).toBe(add3);
  });

  it("does not pair unequal-length adjacent runs", () => {
    const pairMap = buildLinePairMap([
      makeDelLine("old 1", 1),
      makeDelLine("old 2", 2),
      makeAddLine("new 1", 1),
      makeAddLine("new 2", 2),
      makeAddLine("new 3", 3),
    ]);

    expect(pairMap).toHaveLength(0);
  });

  it("does not pair non-adjacent delete and add lines", () => {
    const del = makeDelLine("old value", 1);
    const normal = makeNormalLine("context", 2, 2);
    const add = makeAddLine("new value", 3);

    const pairMap = buildLinePairMap([del, normal, add]);

    expect(pairMap).toHaveLength(0);
  });

  it("does not pair an unpaired add line", () => {
    const pairMap = buildLinePairMap([
      makeNormalLine("context", 1, 1),
      makeAddLine("new value", 2),
    ]);

    expect(pairMap).toHaveLength(0);
  });

  it("does not pair across file boundaries when called per file", () => {
    const firstFile = buildLinePairMap([
      makeDelLine("old value", 1),
      makeNormalLine("context", 2, 2),
    ]);
    const secondFile = buildLinePairMap([makeAddLine("new value", 1)]);

    expect(firstFile).toHaveLength(0);
    expect(secondFile).toHaveLength(0);
  });
});

describe("buildIntraLineSegments", () => {
  it("marks only changed whitespace for whitespace-only edits", () => {
    expect(buildIntraLineSegments("a b", "a  b")).toEqual({
      delSegments: [
        { text: "a", changed: false },
        { text: " ", changed: true },
        { text: "b", changed: false },
      ],
      addSegments: [
        { text: "a", changed: false },
        { text: "  ", changed: true },
        { text: "b", changed: false },
      ],
    });
  });

  it("treats identical paired content as fully unchanged", () => {
    expect(buildIntraLineSegments("same text", "same text")).toEqual({
      delSegments: [{ text: "same text", changed: false }],
      addSegments: [{ text: "same text", changed: false }],
    });
  });

  it("handles empty content without throwing", () => {
    expect(buildIntraLineSegments("", "new")).toEqual({
      delSegments: [],
      addSegments: [{ text: "new", changed: true }],
    });

    expect(buildIntraLineSegments("old", "")).toEqual({
      delSegments: [{ text: "old", changed: true }],
      addSegments: [],
    });
  });
});

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

  it("renders paired replacements with visible text preserved", async () => {
    const frame = await renderFrame(
      <DiffView
        oldFile={{ content: "const value = oldName;\n", name: "demo.ts" }}
        newFile={{ content: "const value = newName;\n", name: "demo.ts" }}
      />,
    );

    expect(frame).toContain("- const value = oldName;");
    expect(frame).toContain("+ const value = newName;");
  });

  it("falls back to line-level rendering for unpaired runs", async () => {
    const frame = await renderFrame(
      <DiffView
        patch={`diff --git a/demo.ts b/demo.ts
--- a/demo.ts
+++ b/demo.ts
@@ -1,2 +1,3 @@
-old one
-old two
+new one
+new two
+new three
`}
      />,
    );

    expect(frame).toContain("- old one");
    expect(frame).toContain("- old two");
    expect(frame).toContain("+ new one");
    expect(frame).toContain("+ new two");
    expect(frame).toContain("+ new three");
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
-old value
+new value
${normalAfter}
`;
    const frame = await renderFrame(
      <DiffView patch={patch} contextLines={2} />,
    );
    expect(frame).toContain("lines hidden");
    expect(frame).toContain("- old value");
    expect(frame).toContain("+ new value");
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
