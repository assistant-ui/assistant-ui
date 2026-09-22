import { Activity } from "react";
import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

const stubClipboard = (writeText: (value: string) => Promise<void>) => {
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
};

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps copy success visible for the full duration after copying again", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
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

  it("does not show copied when the clipboard write fails", async () => {
    const writeText = vi
      .fn()
      .mockRejectedValue(new Error("clipboard permission denied"));
    stubClipboard(writeText);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      result.current.copyToClipboard("value");
      await Promise.resolve();
    });

    expect(result.current.isCopied).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(writeText).toHaveBeenCalledWith("value");
  });

  it("does not show copied when the clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      result.current.copyToClipboard("value");
      await Promise.resolve();
    });

    expect(result.current.isCopied).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears its timer on unmount", async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));
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
    let resolveCopy!: () => void;
    stubClipboard(
      () =>
        new Promise<void>((resolve) => {
          resolveCopy = resolve;
        }),
    );
    const { result, unmount } = renderHook(() => useCopyToClipboard());

    result.current.copyToClipboard("value");
    unmount();
    resolveCopy();
    await act(async () => {
      await Promise.resolve();
    });

    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets the confirmation when a hidden Activity cancels its timer", async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    let copy!: ReturnType<typeof useCopyToClipboard>;
    const Probe = () => {
      copy = useCopyToClipboard();
      return null;
    };
    const App = ({ mode }: { mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <Probe />
      </Activity>
    );
    const view = render(<App mode="visible" />);

    await act(async () => {
      copy.copyToClipboard("first");
      await Promise.resolve();
    });
    expect(copy.isCopied).toBe(true);

    view.rerender(<App mode="hidden" />);
    view.rerender(<App mode="visible" />);

    expect(copy.isCopied).toBe(false);
    expect(vi.getTimerCount()).toBe(0);

    await act(async () => {
      copy.copyToClipboard("second");
      await Promise.resolve();
    });
    expect(copy.isCopied).toBe(true);
  });
});
