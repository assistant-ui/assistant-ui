/**
 * @vitest-environment jsdom
 */
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useElapsedSeconds } from "./elapsed-time";

const globalWithAct = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

const Probe = ({ active }: { active: boolean }) =>
  createElement(
    "span",
    { "data-slot": "elapsed" },
    String(useElapsedSeconds(active) ?? "none"),
  );

describe("useElapsedSeconds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ticks while active, freezes on stop, and restarts on reactivation", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const read = () =>
      container.querySelector("[data-slot=elapsed]")?.textContent;
    const render = (active: boolean) =>
      act(() => {
        root.render(createElement(Probe, { active }));
      });

    render(true);
    expect(read()).toBe("1");

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(read()).toBe("3");

    render(false);
    expect(read()).toBe("3");
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(read()).toBe("3");

    render(true);
    expect(read()).toBe("1");

    act(() => root.unmount());
  });
});
