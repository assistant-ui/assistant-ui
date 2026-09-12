// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { useCopyToClipboard } from "./useCopyToClipboard";

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

const renderCopyHook = async () => {
  let result!: ReturnType<typeof useCopyToClipboard>;
  const Probe = () => {
    result = useCopyToClipboard({ copiedDuration: 1_000 });
    return null;
  };
  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(<Probe />));
  return {
    get result() {
      return result;
    },
    unmount: () => act(async () => root.unmount()),
  };
};

describe("useCopyToClipboard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps copied feedback for the full duration after the latest success", async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
    const hook = await renderCopyHook();

    await act(async () => {
      hook.result.copy("first");
      await Promise.resolve();
    });
    act(() => vi.advanceTimersByTime(500));
    await act(async () => {
      hook.result.copy("second");
      await Promise.resolve();
    });

    act(() => vi.advanceTimersByTime(500));
    expect(hook.result.isCopied).toBe(true);

    act(() => vi.advanceTimersByTime(500));
    expect(hook.result.isCopied).toBe(false);
    await hook.unmount();
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
    const hook = await renderCopyHook();

    hook.result.copy("first");
    hook.result.copy("second");
    await act(async () => Promise.resolve());
    resolveFirst();
    await act(async () => firstWrite);

    expect(hook.result.isCopied).toBe(true);
    await hook.unmount();
  });

  it("clears an active feedback timer when unmounted", async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
    const hook = await renderCopyHook();

    await act(async () => {
      hook.result.copy("value");
      await Promise.resolve();
    });
    expect(vi.getTimerCount()).toBe(1);

    await hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores pending writes after unmount", async () => {
    vi.useFakeTimers();
    let resolveWrite!: () => void;
    const write = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    mockClipboard(() => write);
    const hook = await renderCopyHook();

    hook.result.copy("value");
    await hook.unmount();
    resolveWrite();
    await write;

    expect(vi.getTimerCount()).toBe(0);
  });
});
