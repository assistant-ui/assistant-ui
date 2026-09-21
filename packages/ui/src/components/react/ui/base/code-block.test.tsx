/** @vitest-environment jsdom */
import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodeBlock } from "./code-block";

const clickCopy = async () => {
  await act(async () => {
    screen.getByLabelText("Copy code").click();
    await Promise.resolve();
  });
};

/** The button swaps CopyIcon for CheckIcon while the confirmation shows. */
const isCopied = () => {
  const svg = screen.getByLabelText("Copy code").querySelector("svg");
  return (svg?.getAttribute("class") ?? "").includes("check");
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CodeBlock copy confirmation", () => {
  it("restarts the confirmation window when copied again inside it", async () => {
    render(<CodeBlock copyText="hello" />);

    await clickCopy();
    expect(isCopied()).toBe(true);

    // Second copy well inside the first window: the first timer must not
    // flip the confirmation off while the second one is still showing.
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

  it("does not fire its reset timer after unmount", async () => {
    const view = render(<CodeBlock copyText="hello" />);

    await clickCopy();
    view.unmount();

    expect(() =>
      act(() => {
        vi.advanceTimersByTime(2000);
      }),
    ).not.toThrow();
  });
});
