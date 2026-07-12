import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";

type InputHandler = (
  input: string,
  key: { downArrow?: boolean; upArrow?: boolean },
) => void;

let inputHandler: InputHandler | undefined;

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    useFocus: () => ({ isFocused: true }),
    useInput: (handler: InputHandler, options?: { isActive?: boolean }) => {
      if (options?.isActive !== false) inputHandler = handler;
    },
  };
});

import { StageableDiffView } from "./StageableDiffView";
import type { StagedSelection } from "./diff-stage";

const MULTI_HUNK_PATCH = `diff --git a/f.txt b/f.txt
--- a/f.txt
+++ b/f.txt
@@ -1,3 +1,3 @@
 a
-b
+B
 c
@@ -10,3 +10,3 @@
 x
-y
+Y
 z
`;

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const countMatches = (frame: string, needle: string) =>
  frame.split(needle).length - 1;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  inputHandler = undefined;
});

describe("StageableDiffView", () => {
  it("stages every hunk by default", async () => {
    const { lastFrame } = render(
      <StageableDiffView patch={MULTI_HUNK_PATCH} />,
    );
    await flush();

    const frame = lastFrame() ?? "";
    expect(countMatches(frame, "[x]")).toBe(2);
    expect(frame).not.toContain("[ ]");
  });

  it("toggles the focused hunk on space and reports the staged subset", async () => {
    const onStageChange = vi.fn<(staged: StagedSelection) => void>();
    const { lastFrame } = render(
      <StageableDiffView
        patch={MULTI_HUNK_PATCH}
        onStageChange={onStageChange}
      />,
    );
    await flush();

    inputHandler?.(" ", {});
    await flush();

    expect(lastFrame()).toContain("[ ]");
    expect(onStageChange).toHaveBeenLastCalledWith({
      stagedHunks: [{ fileIndex: 0, hunkIndex: 1 }],
    });
  });

  it("moves focus with j before toggling", async () => {
    const onStageChange = vi.fn<(staged: StagedSelection) => void>();
    render(
      <StageableDiffView
        patch={MULTI_HUNK_PATCH}
        onStageChange={onStageChange}
      />,
    );
    await flush();

    inputHandler?.("j", {});
    await flush();
    inputHandler?.(" ", {});
    await flush();

    expect(onStageChange).toHaveBeenLastCalledWith({
      stagedHunks: [{ fileIndex: 0, hunkIndex: 0 }],
    });
  });

  it("stages none and all via n and a", async () => {
    const onStageChange = vi.fn<(staged: StagedSelection) => void>();
    const { lastFrame } = render(
      <StageableDiffView
        patch={MULTI_HUNK_PATCH}
        onStageChange={onStageChange}
      />,
    );
    await flush();

    inputHandler?.("n", {});
    await flush();
    expect(countMatches(lastFrame() ?? "", "[ ]")).toBe(2);
    expect(onStageChange).toHaveBeenLastCalledWith({ stagedHunks: [] });

    inputHandler?.("a", {});
    await flush();
    expect(countMatches(lastFrame() ?? "", "[x]")).toBe(2);
    expect(onStageChange).toHaveBeenLastCalledWith({
      stagedHunks: [
        { fileIndex: 0, hunkIndex: 0 },
        { fileIndex: 0, hunkIndex: 1 },
      ],
    });
  });

  it("does not capture keys when isActive is false", async () => {
    render(<StageableDiffView patch={MULTI_HUNK_PATCH} isActive={false} />);
    await flush();

    expect(inputHandler).toBeUndefined();
  });
});
