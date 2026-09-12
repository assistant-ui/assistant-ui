import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

const mockClipboard = (writeText: (value: string) => Promise<void>) => {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn(writeText) },
  });
  onTestFinished(() => {
    if (descriptor) {
      Object.defineProperty(navigator, "clipboard", descriptor);
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });
};

describe("useCopyToClipboard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps copied feedback for the full duration after the latest success", async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
    const { result } = renderHook(() =>
      useCopyToClipboard({ copiedDuration: 1_000 }),
    );

    await act(async () => {
      result.current.copyToClipboard("first");
      await Promise.resolve();
    });
    act(() => vi.advanceTimersByTime(500));
    await act(async () => {
      result.current.copyToClipboard("second");
      await Promise.resolve();
    });

    act(() => vi.advanceTimersByTime(500));
    expect(result.current.isCopied).toBe(true);

    act(() => vi.advanceTimersByTime(500));
    expect(result.current.isCopied).toBe(false);
  });

  it("keeps an earlier successful write when a newer write rejects", async () => {
    vi.useFakeTimers();
    let resolveFirst!: () => void;
    const firstWrite = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    mockClipboard(
      vi
        .fn()
        .mockReturnValueOnce(firstWrite)
        .mockRejectedValueOnce(new Error("denied")),
    );
    const { result } = renderHook(() => useCopyToClipboard());

    result.current.copyToClipboard("first");
    result.current.copyToClipboard("second");
    await act(async () => Promise.resolve());
    expect(result.current.isCopied).toBe(false);

    await act(async () => {
      resolveFirst();
      await firstWrite;
    });
    expect(result.current.isCopied).toBe(true);
  });

  it("ignores an older write that succeeds after a newer success", async () => {
    vi.useFakeTimers();
    let resolveFirst!: () => void;
    const firstWrite = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    mockClipboard(
      vi.fn().mockReturnValueOnce(firstWrite).mockResolvedValueOnce(undefined),
    );
    const { result } = renderHook(() =>
      useCopyToClipboard({ copiedDuration: 1_000 }),
    );

    result.current.copyToClipboard("first");
    await act(async () => {
      result.current.copyToClipboard("second");
      await Promise.resolve();
    });
    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.isCopied).toBe(false);

    await act(async () => {
      resolveFirst();
      await firstWrite;
    });
    expect(result.current.isCopied).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears active feedback timers when unmounted", async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
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
    let resolveWrite!: () => void;
    const write = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    mockClipboard(() => write);
    const { result, unmount } = renderHook(() => useCopyToClipboard());

    result.current.copyToClipboard("value");
    unmount();
    resolveWrite();
    await write;

    expect(vi.getTimerCount()).toBe(0);
  });
});
