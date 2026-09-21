import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

describe("useCopyToClipboard", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps copy success visible for the full duration after copying again", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result } = renderHook(() =>
      useCopyToClipboard({ copiedDuration: 1800 }),
    );

    await act(async () => {
      result.current.copyToClipboard("first");
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await act(async () => {
      result.current.copyToClipboard("second");
      await Promise.resolve();
    });

    expect(result.current.isCopied).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1799);
    });
    expect(result.current.isCopied).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.isCopied).toBe(false);
    expect(writeText).toHaveBeenNthCalledWith(1, "first");
    expect(writeText).toHaveBeenNthCalledWith(2, "second");
  });

  it("clears its timer on unmount", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result, unmount } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      result.current.copyToClipboard("value");
      await Promise.resolve();
    });
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores clipboard success after unmount", async () => {
    vi.useFakeTimers();
    let resolveCopy!: () => void;
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCopy = resolve;
        }),
    );
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result, unmount } = renderHook(() => useCopyToClipboard());

    result.current.copyToClipboard("value");
    unmount();
    resolveCopy();
    await act(async () => {
      await Promise.resolve();
    });

    expect(vi.getTimerCount()).toBe(0);
  });
});
