import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps confirmation visible for the full duration after a repeated copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result } = renderHook(() =>
      useCopyToClipboard({ copiedDuration: 2000 }),
    );

    await act(async () => {
      result.current.copyToClipboard("first");
      await Promise.resolve();
    });
    act(() => vi.advanceTimersByTime(1999));
    expect(result.current.isCopied).toBe(true);

    await act(async () => {
      result.current.copyToClipboard("second");
      await Promise.resolve();
    });
    act(() => vi.advanceTimersByTime(1999));
    expect(result.current.isCopied).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.isCopied).toBe(false);
    expect(writeText).toHaveBeenNthCalledWith(1, "first");
    expect(writeText).toHaveBeenNthCalledWith(2, "second");
  });

  it("does not create a timer when an asynchronous write resolves after unmount", async () => {
    let resolveWrite!: () => void;
    const writeText = vi.fn(
      () => new Promise<void>((resolve) => (resolveWrite = resolve)),
    );
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result, unmount } = renderHook(() => useCopyToClipboard());

    act(() => result.current.copyToClipboard("hello"));
    unmount();
    await act(async () => {
      resolveWrite();
      await Promise.resolve();
    });

    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores an earlier write that resolves after a newer copy", async () => {
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const writeText = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<void>((resolve) => (resolveFirst = resolve)),
      )
      .mockImplementationOnce(
        () => new Promise<void>((resolve) => (resolveSecond = resolve)),
      );
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result } = renderHook(() => useCopyToClipboard());

    act(() => {
      result.current.copyToClipboard("first");
      result.current.copyToClipboard("second");
    });
    await act(async () => {
      resolveFirst();
      await Promise.resolve();
    });
    expect(result.current.isCopied).toBe(false);

    await act(async () => {
      resolveSecond();
      await Promise.resolve();
    });
    expect(result.current.isCopied).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("does not show confirmation when the write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      result.current.copyToClipboard("hello");
      await Promise.resolve();
    });

    expect(result.current.isCopied).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
