/** @vitest-environment jsdom */
import { renderHook } from "@testing-library/react";
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
      message: {
        getCopyText: () => "Hello",
        setIsCopied,
      },
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
  useAuiState: ((selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state)) as typeof import("@assistant-ui/store").useAuiState,
}));

import { useActionBarCopy } from "./useActionBarCopy";

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("useActionBarCopy", () => {
  it("does not report copy success without a clipboard handler", async () => {
    const { result } = renderHook(() => useActionBarCopy());

    result.current.copy();
    await Promise.resolve();

    expect(result.current.disabled).toBe(true);
    expect(mocks.setIsCopied).not.toHaveBeenCalled();
  });

  it("reports copy success after the clipboard handler resolves", async () => {
    const copyToClipboard = vi.fn();
    const { result } = renderHook(() => useActionBarCopy({ copyToClipboard }));

    result.current.copy();
    await Promise.resolve();

    expect(copyToClipboard).toHaveBeenCalledWith("Hello");
    expect(mocks.setIsCopied).toHaveBeenCalledWith(true);
  });

  it("does not report copy success when the clipboard handler rejects", async () => {
    const copyToClipboard = vi.fn().mockRejectedValue(new Error("denied"));
    const { result } = renderHook(() => useActionBarCopy({ copyToClipboard }));

    result.current.copy();
    await Promise.resolve();

    expect(mocks.setIsCopied).not.toHaveBeenCalled();
  });

  it("keeps copy success visible for the full duration after copying again", async () => {
    vi.useFakeTimers();
    const copyToClipboard = vi.fn();
    const { result } = renderHook(() =>
      useActionBarCopy({
        copiedDuration: 3000,
        copyToClipboard,
      }),
    );

    result.current.copy();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);

    result.current.copy();
    await Promise.resolve();
    mocks.setIsCopied.mockClear();

    await vi.advanceTimersByTimeAsync(2000);
    expect(mocks.setIsCopied).not.toHaveBeenCalledWith(false);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.setIsCopied).toHaveBeenCalledWith(false);
  });

  it("clears the copy feedback timer when unmounted", async () => {
    vi.useFakeTimers();
    const copyToClipboard = vi.fn();
    const { result, unmount } = renderHook(() =>
      useActionBarCopy({ copyToClipboard }),
    );

    result.current.copy();
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
