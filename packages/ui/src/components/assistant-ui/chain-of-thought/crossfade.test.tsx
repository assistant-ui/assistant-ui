/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Crossfade } from "./crossfade";

const globalWithAct = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

type ProbeProps = {
  value: string;
  exitDuration?: number;
  enterDuration?: number;
  enterDelay?: number;
};

const renderProbe = () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const render = (props: ProbeProps) =>
    act(() => {
      root.render(
        <Crossfade
          value={props.value}
          exitDuration={props.exitDuration ?? 200}
          enterDuration={props.enterDuration ?? 300}
          enterDelay={props.enterDelay ?? 0}
        >
          {(v: string) => <span data-slot="cf">{v}</span>}
        </Crossfade>,
      );
    });
  const exitCount = () =>
    container.querySelectorAll(".aui-chain-of-thought-crossfade-exit").length;
  return { container, render, exitCount, root };
};

describe("Crossfade", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows an exit layer during a transition and removes it after it settles", () => {
    const { render, exitCount, container, root } = renderProbe();

    render({ value: "A" });
    expect(exitCount()).toBe(0);
    expect(container.textContent).toContain("A");

    render({ value: "B" });
    expect(exitCount()).toBe(1); // previous "A" fading out

    act(() => {
      vi.advanceTimersByTime(400); // past totalMs = max(200, 0 + 300)
    });
    expect(exitCount()).toBe(0);
    expect(container.textContent).toContain("B");

    act(() => root.unmount());
  });

  it("does not get stuck when a duration prop changes mid-transition", () => {
    const { render, exitCount, root } = renderProbe();

    render({ value: "A" });
    render({ value: "B" }); // start transition, timer scheduled for 300ms
    expect(exitCount()).toBe(1);

    // Change ONLY a duration prop while the fade is in flight (value unchanged).
    act(() => {
      vi.advanceTimersByTime(100);
    });
    render({ value: "B", exitDuration: 500 });

    // The original reset timer must still fire; the exit layer must clear.
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(exitCount()).toBe(0);

    act(() => root.unmount());
  });

  it("ignores a same-value rerender (no new exit layer)", () => {
    const { render, exitCount, root } = renderProbe();

    render({ value: "A" });
    render({ value: "A" });
    expect(exitCount()).toBe(0);

    act(() => root.unmount());
  });
});
