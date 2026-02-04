/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import {
  ChainOfThoughtConcurrentStreamingSample,
  ChainOfThoughtParallelTraceStreamingSample,
} from "./chain-of-thought";

const globalWithAct = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

describe("ChainOfThoughtConcurrentStreamingSample", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("cleans up streaming intervals on unmount", () => {
    vi.useFakeTimers();

    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<ChainOfThoughtConcurrentStreamingSample />);
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(vi.getTimerCount()).toBeGreaterThan(0);

    act(() => {
      root.unmount();
    });

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("ChainOfThoughtParallelTraceStreamingSample", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("streams to completion without resetting", () => {
    vi.useFakeTimers();

    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<ChainOfThoughtParallelTraceStreamingSample />);
    });

    const startButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Start",
    );

    act(() => {
      startButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    act(() => {
      vi.advanceTimersByTime(20000);
    });

    const label = container.querySelector(
      "[data-slot=chain-of-thought-trigger-label]",
    );

    expect(label?.textContent).toContain("Researched");
    expect(label?.textContent).not.toContain("Coordinating");

    act(() => {
      root.unmount();
    });
  });
});
