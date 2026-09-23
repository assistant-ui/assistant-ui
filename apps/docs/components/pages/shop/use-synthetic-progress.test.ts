// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSyntheticProgress } from "./use-synthetic-progress";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSyntheticProgress", () => {
  it("climbs toward 90% with time while active, faster at first", () => {
    const { result } = renderHook(() =>
      useSyntheticProgress({ active: true, stepKey: "working" }),
    );
    expect(result.current.value).toBe(0);
    act(() => vi.advanceTimersByTime(10_000));
    const early = result.current.value;
    expect(early).toBeGreaterThan(0.2);
    expect(early).toBeLessThan(0.3);
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.value - early).toBeLessThan(early);
    act(() => vi.advanceTimersByTime(600_000));
    expect(result.current.value).toBeLessThan(0.9);
    expect(result.current.value).toBeGreaterThan(0.89);
  });

  it("holds its value while frozen and resumes when active again", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useSyntheticProgress({ active, stepKey: "working" }),
      { initialProps: { active: true } },
    );
    act(() => vi.advanceTimersByTime(5_000));
    const held = result.current.value;
    expect(held).toBeGreaterThan(0);
    rerender({ active: false });
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.value).toBe(held);
    rerender({ active: true });
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.value).toBeGreaterThan(held);
  });

  it("jumps to 100% when the step changes and starts over shortly after", () => {
    const { result, rerender } = renderHook(
      ({ stepKey }) => useSyntheticProgress({ active: true, stepKey }),
      { initialProps: { stepKey: "install:0" } },
    );
    act(() => vi.advanceTimersByTime(5_000));
    rerender({ stepKey: "install:1" });
    expect(result.current).toEqual({ value: 1, complete: true });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.value).toBe(1);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toEqual({ value: 0, complete: false });
    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.value).toBeGreaterThan(0);
  });
});
