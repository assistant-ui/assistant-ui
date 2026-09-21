import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodeBlock } from "./code-block";

const clickCopy = async () => {
  await act(async () => {
    screen.getByLabelText("Copy code").click();
    await Promise.resolve();
  });
};

const isCopied = () => {
  const svg = screen.getByLabelText("Copy code").querySelector("svg");
  return (svg?.getAttribute("class") ?? "").includes("check");
};

const stubClipboard = (writeText: () => Promise<void>) => {
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
};

beforeEach(() => {
  vi.useFakeTimers();
  stubClipboard(() => Promise.resolve());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("CodeBlock copy confirmation", () => {
  it("restarts the confirmation window when copied again inside it", async () => {
    render(<CodeBlock copyText="hello" />);

    await clickCopy();
    expect(isCopied()).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    await clickCopy();
    expect(isCopied()).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(isCopied()).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(isCopied()).toBe(false);
  });

  it("cancels its pending reset timer on unmount", async () => {
    const view = render(<CodeBlock copyText="hello" />);

    await clickCopy();
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports a write that settles after unmount without arming a timer", async () => {
    let settle!: () => void;
    stubClipboard(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        }),
    );
    const onCopied = vi.fn();
    const view = render(<CodeBlock copyText="hello" onCopied={onCopied} />);

    await act(async () => {
      screen.getByLabelText("Copy code").click();
    });
    view.unmount();

    await act(async () => {
      settle();
      await Promise.resolve();
    });

    // The copy reached the clipboard, so the host is still told; only the
    // confirmation timer is skipped.
    expect(onCopied).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
