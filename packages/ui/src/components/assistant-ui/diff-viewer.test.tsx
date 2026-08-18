import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DiffViewer } from "./diff-viewer";

/** An insertion offsets the old and new numbering of the later change. */
const PATCH = `--- a/example.ts
+++ b/example.ts
@@ -1,3 +1,4 @@
 const a = 1;
+const inserted = 0;
 const b = 2;
-const c = 3;
+const c = 4;
`;

afterEach(cleanup);

const cellsOf = (row: Element) =>
  Array.from(row.children).map((cell) => ({
    slot: cell.getAttribute("data-slot"),
    text: cell.textContent,
  }));

describe("DiffViewer unified rows", () => {
  it("names each cell and numbers a deletion from the old file", () => {
    const { container } = render(<DiffViewer patch={PATCH} />);
    const rows = container.querySelectorAll('[data-slot="diff-viewer-line"]');

    expect(cellsOf(rows[3]!)).toEqual([
      { slot: "diff-viewer-line-number", text: "3" },
      { slot: "diff-viewer-indicator", text: "-" },
      { slot: "diff-viewer-content", text: "const c = 3;" },
    ]);
    expect(cellsOf(rows[4]!)).toEqual([
      { slot: "diff-viewer-line-number", text: "4" },
      { slot: "diff-viewer-indicator", text: "+" },
      { slot: "diff-viewer-content", text: "const c = 4;" },
    ]);
  });

  it("drops the number cell when line numbers are hidden", () => {
    const { container } = render(
      <DiffViewer patch={PATCH} showLineNumbers={false} />,
    );
    const row = container.querySelector('[data-slot="diff-viewer-line"]')!;

    expect(cellsOf(row).map((cell) => cell.slot)).toEqual([
      "diff-viewer-indicator",
      "diff-viewer-content",
    ]);
  });
});

describe("DiffViewer split rows", () => {
  it("numbers each half from its own side and leaves the cells unnamed", () => {
    const { container } = render(<DiffViewer patch={PATCH} viewMode="split" />);
    const row = Array.from(
      container.querySelectorAll('[data-slot="diff-viewer-split-line"]'),
    ).find((candidate) =>
      candidate
        .querySelector('[data-slot="diff-viewer-split-left"]')
        ?.textContent?.includes("const c = 3;"),
    )!;
    const left = row.querySelector('[data-slot="diff-viewer-split-left"]')!;
    const right = row.querySelector('[data-slot="diff-viewer-split-right"]')!;

    expect(cellsOf(left)).toEqual([
      { slot: null, text: "3" },
      { slot: null, text: "-" },
      { slot: null, text: "const c = 3;" },
    ]);
    expect(cellsOf(right)).toEqual([
      { slot: null, text: "4" },
      { slot: null, text: "+" },
      { slot: null, text: "const c = 4;" },
    ]);
  });

  it("renders an absent half empty and a context half with a blank indicator", () => {
    const { container } = render(
      <DiffViewer
        patch={`--- a/example.ts
+++ b/example.ts
@@ -1,1 +1,2 @@
 const a = 1;
+const b = 2;
`}
        viewMode="split"
      />,
    );
    const rows = container.querySelectorAll(
      '[data-slot="diff-viewer-split-line"]',
    );

    const context = rows[0]!.querySelector(
      '[data-slot="diff-viewer-split-left"]',
    )!;
    expect(cellsOf(context).map((cell) => cell.text)).toEqual([
      "1",
      " ",
      "const a = 1;",
    ]);

    const absent = rows[1]!.querySelector(
      '[data-slot="diff-viewer-split-left"]',
    )!;
    expect(absent.getAttribute("data-type")).toBe("empty");
    expect(cellsOf(absent).map((cell) => cell.text)).toEqual(["", "", ""]);
  });
});
