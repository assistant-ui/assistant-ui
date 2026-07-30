/** @vitest-environment jsdom */
import { cleanup, renderHook } from "@testing-library/react";
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
    currentAui: {
      message: {
        getCopyText: () => "Hello",
        setIsCopied,
      },
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.currentAui,
  useAuiState: ((selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state)) as typeof import("@assistant-ui/store").useAuiState,
}));

import { useActionBarCopy } from "./useActionBarCopy";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  mocks.currentAui = mocks.aui;
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

  it("resets copy feedback when unmounted", async () => {
    vi.useFakeTimers();
    const copyToClipboard = vi.fn();
    const { result, unmount } = renderHook(() =>
      useActionBarCopy({ copyToClipboard }),
    );

    result.current.copy();
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(1);

    mocks.setIsCopied.mockClear();
    unmount();

    expect(vi.getTimerCount()).toBe(0);
    expect(mocks.setIsCopied).toHaveBeenCalledWith(false);
  });

  it("ignores clipboard success after unmount", async () => {
    vi.useFakeTimers();
    let resolveCopy: (() => void) | undefined;
    const copyToClipboard = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCopy = resolve;
        }),
    );
    const { result, unmount } = renderHook(() =>
      useActionBarCopy({ copyToClipboard }),
    );

    result.current.copy();
    unmount();
    resolveCopy?.();
    await Promise.resolve();

    expect(mocks.setIsCopied).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets feedback for the previous message scope", async () => {
    vi.useFakeTimers();
    const copyToClipboard = vi.fn();
    const nextSetIsCopied = vi.fn();
    const { result, rerender } = renderHook(() =>
      useActionBarCopy({ copyToClipboard }),
    );

    result.current.copy();
    await Promise.resolve();
    mocks.setIsCopied.mockClear();

    mocks.currentAui = {
      message: {
        getCopyText: () => "Next message",
        setIsCopied: nextSetIsCopied,
      },
    };
    rerender();

    expect(mocks.setIsCopied).toHaveBeenCalledWith(false);
    expect(nextSetIsCopied).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
