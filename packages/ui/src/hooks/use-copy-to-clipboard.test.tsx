import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

describe("useCopyToClipboard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps copied feedback for the full duration after the latest copy", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
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
});
