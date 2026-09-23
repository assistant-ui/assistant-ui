import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { createRenderCounter } from "@assistant-ui/x-performance";
import { DiffView } from "./DiffView";

const { recordHighlight } = vi.hoisted(() => ({ recordHighlight: vi.fn() }));
vi.mock("./intra-line-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./intra-line-utils")>();
  return {
    ...actual,
    buildIntraLineSegments: (
      ...args: Parameters<typeof actual.buildIntraLineSegments>
    ) => {
      recordHighlight();
      return actual.buildIntraLineSegments(...args);
    },
  };
});

const counter = createRenderCounter();

const makePatch = (pairs: number) =>
  [
    "diff --git a/demo.txt b/demo.txt",
    "--- a/demo.txt",
    "+++ b/demo.txt",
    `@@ -1,${pairs * 2} +1,${pairs * 2} @@`,
    ...Array.from(
      { length: pairs },
      (_, i) => `-old ${i}\n+new ${i}\n context ${i}`,
    ),
    "",
  ].join("\n");

describe("DiffView highlighting work", () => {
  beforeEach(() => {
    counter.reset();
    recordHighlight.mockImplementation(() => counter.useRender("word-diff"));
  });

  afterEach(() => cleanup());

  it("highlights one visible replacement pair in a 1,000-pair preview", async () => {
    const instance = render(<DiffView patch={makePatch(1000)} maxLines={2} />);
    await vi.waitFor(() =>
      expect(instance.lastFrame()).toContain("2998 more lines"),
    );
    expect(instance.lastFrame()).toContain("old 0");
    expect(instance.lastFrame()).toContain("new 0");
    expect(instance.lastFrame()).not.toContain("old 999");
    expect(counter.renders("word-diff")).toBe(1);
  });

  it("reuses both sides of each pair as the preview expands and shrinks", async () => {
    const patch = makePatch(3);
    const instance = render(<DiffView patch={patch} maxLines={1} />);
    await vi.waitFor(() =>
      expect(instance.lastFrame()).toContain("8 more lines"),
    );
    expect(counter.renders("word-diff")).toBe(1);

    for (const [maxLines, calls] of [
      [2, 1],
      [5, 2],
      [8, 3],
      [2, 3],
      [8, 3],
    ] as const) {
      instance.rerender(<DiffView patch={patch} maxLines={maxLines} />);
      await vi.waitFor(() =>
        expect(instance.lastFrame()).toContain(`${9 - maxLines} more lines`),
      );
      expect(counter.renders("word-diff")).toBe(calls);
    }
  });

  it("does not highlight a preview with no visible lines", async () => {
    const instance = render(<DiffView patch={makePatch(3)} maxLines={0} />);
    await vi.waitFor(() =>
      expect(instance.lastFrame()).toContain("9 more lines"),
    );
    expect(counter.renders("word-diff")).toBe(0);
  });

  it("does not recalculate segments for unchanged input when display props change", async () => {
    const patch = makePatch(3);
    const instance = render(
      <DiffView patch={patch} maxLines={2} showLineNumbers={false} />,
    );
    await vi.waitFor(() =>
      expect(instance.lastFrame()).toContain("7 more lines"),
    );
    const firstFrame = instance.lastFrame();
    instance.rerender(<DiffView patch={patch} maxLines={2} showLineNumbers />);
    await vi.waitFor(() => expect(instance.lastFrame()).not.toBe(firstFrame));
    expect(counter.renders("word-diff")).toBe(1);
  });

  it("discards old segments when the patch changes", async () => {
    const patch = makePatch(3);
    const instance = render(<DiffView patch={patch} maxLines={2} />);
    await vi.waitFor(() => expect(instance.lastFrame()).toContain("old 0"));
    expect(counter.renders("word-diff")).toBe(1);
    instance.rerender(
      <DiffView patch={patch.replace("old 0", "previous 0")} maxLines={2} />,
    );
    await vi.waitFor(() =>
      expect(instance.lastFrame()).toContain("previous 0"),
    );
    expect(counter.renders("word-diff")).toBe(2);
  });

  it("preserves highlighting for an unlimited old/new file diff", async () => {
    const instance = render(
      <DiffView
        oldFile={{ name: "demo", content: "old 0\nold 1\n" }}
        newFile={{ name: "demo", content: "new 0\nnew 1\n" }}
      />,
    );
    await vi.waitFor(() => expect(instance.lastFrame()).toContain("new 1"));
    expect(instance.lastFrame()).toContain("old 0");
    expect(instance.lastFrame()).toContain("old 1");
    expect(instance.lastFrame()).toContain("new 0");
    expect(counter.renders("word-diff")).toBe(2);
  });

  it("keeps unequal replacement runs unpaired", async () => {
    const instance = render(
      <DiffView
        oldFile={{ content: "old\n" }}
        newFile={{ content: "new 1\nnew 2\n" }}
      />,
    );
    await vi.waitFor(() => expect(instance.lastFrame()).toContain("new 2"));
    expect(instance.lastFrame()).toContain("old");
    expect(counter.renders("word-diff")).toBe(0);
  });
});
