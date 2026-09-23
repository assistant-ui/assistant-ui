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
  it("grows with time while active and never reaches the end", () => {
    const { result } = renderHook(() =>
      useSyntheticProgress({ active: true, stepKey: "working" }),
    );
    expect(result.current.value).toBe(0);
    act(() => vi.advanceTimersByTime(3_000));
    const early = result.current.value;
    expect(early).toBeGreaterThan(0);
    act(() => vi.advanceTimersByTime(600_000));
    expect(result.current.value).toBeGreaterThan(early);
    expect(result.current.value).toBeLessThan(0.92);
  });

  it("holds its value while frozen and resumes when active again", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useSyntheticProgress({ active, stepKey: "working" }),
      { initialProps: { active: true } },
    );
    act(() => vi.advanceTimersByTime(3_000));
    const held = result.current.value;
    expect(held).toBeGreaterThan(0);
    rerender({ active: false });
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.value).toBe(held);
    rerender({ active: true });
    act(() => vi.advanceTimersByTime(20_000));
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
    act(() => vi.advanceTimersByTime(3_000));
    expect(result.current.value).toBeGreaterThan(0);
  });

  it("resumes where it left off when remounted with the same step", () => {
    const first = renderHook(() =>
      useSyntheticProgress({ active: true, stepKey: "resume" }),
    );
    act(() => vi.advanceTimersByTime(5_000));
    const left = first.result.current.value;
    expect(left).toBeGreaterThan(0);
    first.unmount();
    const second = renderHook(() =>
      useSyntheticProgress({ active: true, stepKey: "resume" }),
    );
    expect(second.result.current.value).toBe(left);
    act(() => vi.advanceTimersByTime(20_000));
    expect(second.result.current.value).toBeGreaterThan(left);
  });
});
