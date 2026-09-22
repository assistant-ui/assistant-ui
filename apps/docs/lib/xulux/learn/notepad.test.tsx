// @vitest-environment jsdom

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Notepad } from "./courses/build-generative-ui-assistant/stages/S5/project/components/tools/notepad";

const createProps = () => ({
  state: { title: "Title", content: "Content" },
  setState: vi.fn(),
  version: undefined,
  id: "notepad",
  streaming: false,
});

const isCopied = (container: HTMLElement) =>
  container.querySelector("svg.lucide-check") !== null;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Notepad", () => {
  it("shows a successful copy and restarts its confirmation timer", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const view = render(<Notepad {...createProps()} />);
    const copyButton = view.getByRole("button", { name: "Copy note" });

    await act(async () => {
      fireEvent.click(copyButton);
      await Promise.resolve();
    });
    expect(isCopied(view.container)).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      fireEvent.click(copyButton);
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1199);
    });
    expect(isCopied(view.container)).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(isCopied(view.container)).toBe(false);
    expect(writeText).toHaveBeenCalledTimes(2);
  });

  it("does not show confirmation for unavailable or rejected clipboard writes", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const view = render(<Notepad {...createProps()} />);
    const copyButton = view.getByRole("button", { name: "Copy note" });

    await act(async () => {
      fireEvent.click(copyButton);
      await Promise.resolve();
    });
    expect(isCopied(view.container)).toBe(false);

    vi.stubGlobal("navigator", {});
    fireEvent.click(copyButton);
    expect(isCopied(view.container)).toBe(false);
  });

  it("clears its timer and ignores a pending copy when unmounted", async () => {
    let resolveCopy!: () => void;
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: {
        writeText: () =>
          new Promise<void>((resolve) => (resolveCopy = resolve)),
      },
    });
    const view = render(<Notepad {...createProps()} />);

    fireEvent.click(view.getByRole("button", { name: "Copy note" }));
    view.unmount();
    resolveCopy();
    await act(async () => {
      await Promise.resolve();
    });

    expect(vi.getTimerCount()).toBe(0);
  });
});
