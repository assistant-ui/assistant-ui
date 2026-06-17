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
    await act(async () => {
      returned = result.current.adapter.search!("ab");
    });
    expect(returned).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
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

  it("defers its state update out of search() so it is safe to call during render", () => {
    const fetcher = vi.fn(async () => []);
    const { result } = renderHook(() =>
      unstable_useLiveCompletionAdapter({ fetcher, debounceMs: 0 }),
    );

    const returned = result.current.adapter.search!("ab");
    expect(returned).toEqual([]);
    // the fetch (and its setIsLoading) is queued, not run synchronously
    expect(result.current.isLoading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not fetch when disabled and clears cached items", async () => {
    const fetcher = vi.fn(async () => [item("a")]);
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        unstable_useLiveCompletionAdapter({ fetcher, enabled, debounceMs: 0 }),
      { initialProps: { enabled: true } },
    );

    await act(async () => {
      result.current.adapter.search!("ab");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.adapter.search!("ab")).toEqual([item("a")]);

    fetcher.mockClear();
    await act(async () => {
      rerender({ enabled: false });
    });
    expect(result.current.adapter.search!("ab")).toEqual([]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
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

    await act(async () => {
      result.current.adapter.search!("a");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      result.current.adapter.search!("ab");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolvers["a"]!([item("a")]);
    });
    expect(result.current.adapter.search!("ab")).toEqual([]);

    await act(async () => {
      resolvers["ab"]!([item("ab")]);
    });
    expect(result.current.adapter.search!("ab")).toEqual([item("ab")]);
  });

  it("drops an in-flight fetch when the query returns to a cached value", async () => {
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

    await act(async () => {
      result.current.adapter.search!("ab");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      resolvers["ab"]!([item("ab")]);
    });
    expect(result.current.adapter.search!("ab")).toEqual([item("ab")]);

    // type "abc": a fetch goes in flight
    await act(async () => {
      result.current.adapter.search!("abc");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(resolvers["abc"]).toBeTypeOf("function");

    // delete back to the cached "ab": the in-flight "abc" must be invalidated
    await act(async () => {
      result.current.adapter.search!("ab");
    });
    await act(async () => {
      resolvers["abc"]!([item("abc")]);
    });
    expect(result.current.adapter.search!("ab")).toEqual([item("ab")]);
  });
});
