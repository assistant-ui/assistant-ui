// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./useCopyToClipboard";

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
    let result!: ReturnType<typeof useCopyToClipboard>;
    const Probe = () => {
      result = useCopyToClipboard({ copiedDuration: 1_000 });
      return null;
    };
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<Probe />));

    await act(async () => {
      result.copy("first");
      await Promise.resolve();
    });
    act(() => vi.advanceTimersByTime(500));
    await act(async () => {
      result.copy("second");
      await Promise.resolve();
    });

    act(() => vi.advanceTimersByTime(500));
    expect(result.isCopied).toBe(true);

    act(() => vi.advanceTimersByTime(500));
    expect(result.isCopied).toBe(false);

    await act(async () => root.unmount());
  });
});
