// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useTaskElapsed } from "./task";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

it("catches up on mount and ticks once per second", async () => {
  const container = document.body.appendChild(document.createElement("div"));
  const root = createRoot(container);
  const Probe = () =>
    createElement(
      "output",
      null,
      String(useTaskElapsed({ startedAt: 5_000 }, true)),
    );

  vi.useFakeTimers();
  try {
    vi.setSystemTime(10_000);
    await act(async () => {
      root.render(createElement(Probe));
    });
    expect(container.textContent).toBe("5000");

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(container.textContent).toBe("6000");
  } finally {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  }
});
