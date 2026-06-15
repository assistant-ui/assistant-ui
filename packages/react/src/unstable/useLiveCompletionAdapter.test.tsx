/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Unstable_TriggerItem } from "@assistant-ui/core";
import { unstable_useLiveCompletionAdapter } from "./useLiveCompletionAdapter";

const item = (id: string): Unstable_TriggerItem => ({
  id,
  type: "x",
  label: id,
});

describe("unstable_useLiveCompletionAdapter", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns cached items synchronously and schedules a debounced fetch", async () => {
    let resolve!: (value: readonly Unstable_TriggerItem[]) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<readonly Unstable_TriggerItem[]>((r) => {
          resolve = r;
        }),
    );
    const { result } = renderHook(() =>
      unstable_useLiveCompletionAdapter({ fetcher, debounceMs: 50 }),
    );

    let returned: readonly Unstable_TriggerItem[] = [];
    act(() => {
      returned = result.current.adapter.search!("ab");
    });
    expect(returned).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("ab");

    await act(async () => {
      resolve([item("ab")]);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.adapter.search!("ab")).toEqual([item("ab")]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when disabled", () => {
    const fetcher = vi.fn(async () => [item("a")]);
    const { result } = renderHook(() =>
      unstable_useLiveCompletionAdapter({
        fetcher,
        enabled: false,
        debounceMs: 0,
      }),
    );

    act(() => {
      result.current.adapter.search!("ab");
      vi.advanceTimersByTime(100);
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.adapter.search!("ab")).toEqual([]);
  });

  it("drops a stale in-flight result when the query changes", async () => {
    const resolvers: Record<
      string,
      (value: readonly Unstable_TriggerItem[]) => void
    > = {};
    const fetcher = vi.fn(
      (q: string) =>
        new Promise<readonly Unstable_TriggerItem[]>((r) => {
          resolvers[q] = r;
        }),
    );
    const { result } = renderHook(() =>
      unstable_useLiveCompletionAdapter({ fetcher, debounceMs: 0 }),
    );

    act(() => {
      result.current.adapter.search!("a");
      vi.advanceTimersByTime(0);
    });
    act(() => {
      result.current.adapter.search!("ab");
      vi.advanceTimersByTime(0);
    });

    await act(async () => {
      resolvers["a"]!([item("a")]);
    });
    expect(result.current.adapter.search!("ab")).toEqual([]);

    await act(async () => {
      resolvers["ab"]!([item("ab")]);
    });
    expect(result.current.adapter.search!("ab")).toEqual([item("ab")]);
  });
});
