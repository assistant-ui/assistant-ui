import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const setIsCopied = vi.fn();

  return {
    setIsCopied,
    state: {
      message: {
        role: "assistant",
        status: { type: "complete", reason: "stop" },
        parts: [{ type: "text", text: "Hello" }],
        isCopied: false,
      },
      composer: {
        isEditing: false,
        text: "",
      },
    },
    aui: {
      message: () => ({
        getCopyText: () => "Hello",
        setIsCopied,
      }),
    },
  };
});

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useCallback: ((callback: unknown) =>
    callback) as typeof import("react").useCallback,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
  useAuiState: ((selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state)) as typeof import("@assistant-ui/store").useAuiState,
}));

import { useActionBarCopy } from "./useActionBarCopy";

afterEach(() => {
  vi.clearAllMocks();
});

describe("useActionBarCopy", () => {
  it("does not report copy success without a clipboard handler", async () => {
    const { copy, disabled } = useActionBarCopy();

    copy();
    await Promise.resolve();

    expect(disabled).toBe(true);
    expect(mocks.setIsCopied).not.toHaveBeenCalled();
  });

  it("reports copy success after the clipboard handler resolves", async () => {
    const copyToClipboard = vi.fn();
    const { copy } = useActionBarCopy({ copyToClipboard });

    copy();
    await Promise.resolve();

    expect(copyToClipboard).toHaveBeenCalledWith("Hello");
    expect(mocks.setIsCopied).toHaveBeenCalledWith(true);
  });

  it("does not report copy success when the clipboard handler rejects", async () => {
    const copyToClipboard = vi.fn().mockRejectedValue(new Error("denied"));
    const { copy } = useActionBarCopy({ copyToClipboard });

    copy();
    await Promise.resolve();

    expect(mocks.setIsCopied).not.toHaveBeenCalled();
  });
});
