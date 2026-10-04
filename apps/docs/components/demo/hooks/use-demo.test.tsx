// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DemoStageContext } from "../elements/demo-stage";
import { useWordStream } from "./use-demo";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useWordStream", () => {
  it("restarts a completed word stream", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useWordStream("one two", { interval: 1, startDelay: 0 }),
    );

    act(() => vi.runAllTimers());
    expect(result.current.count).toBe(2);
    expect(result.current.streaming).toBe(false);

    act(() => result.current.restart());
    expect(result.current.count).toBe(0);
    expect(result.current.streaming).toBe(true);

    act(() => vi.runAllTimers());
    expect(result.current.count).toBe(2);
    expect(result.current.streaming).toBe(false);
  });

  it("does not clear the response while the demo is paused", () => {
    vi.useFakeTimers();
    let stopped = false;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DemoStageContext.Provider
        value={{ stopped, setPlaying: () => undefined }}
      >
        {children}
      </DemoStageContext.Provider>
    );
    const { result, rerender } = renderHook(
      () => useWordStream("one two", { interval: 1, startDelay: 0 }),
      { wrapper },
    );

    act(() => vi.runAllTimers());
    stopped = true;
    rerender();
    act(() => result.current.restart());

    expect(result.current.count).toBe(2);
    expect(result.current.streaming).toBe(false);
  });
});
