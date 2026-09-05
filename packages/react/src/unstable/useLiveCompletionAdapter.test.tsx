/** @vitest-environment jsdom */
import { startTransition, Suspense, useLayoutEffect } from "react";
import { act, render, renderHook } from "@testing-library/react";
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

  it("does not start a queued fetch after unmount", async () => {
    const fetcher = vi.fn(async () => []);
    const { result, unmount } = renderHook(() =>
      unstable_useLiveCompletionAdapter({ fetcher, debounceMs: 0 }),
    );

    result.current.adapter.search!("alice");
    unmount();
    await Promise.resolve();

    expect(vi.getTimerCount()).toBe(0);
    await vi.runAllTimersAsync();

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps an in-flight fetch when the debounce changes", async () => {
    let resolve!: (items: readonly Unstable_TriggerItem[]) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<readonly Unstable_TriggerItem[]>((r) => {
          resolve = r;
        }),
    );
    const { result, rerender } = renderHook(
      ({ debounceMs }) =>
        unstable_useLiveCompletionAdapter({ fetcher, debounceMs }),
      { initialProps: { debounceMs: 0 } },
    );

    await act(async () => {
      result.current.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledOnce();

    rerender({ debounceMs: 50 });
    await act(async () => resolve([item("alice")]));

    expect(result.current.adapter.search!("alice")).toEqual([item("alice")]);
    expect(result.current.isLoading).toBe(false);
  });

  it("replays a search queued while the adapter is hidden", async () => {
    const fetcher = vi.fn(async () => []);
    const suspended = new Promise<never>(() => {});
    let committed!: ReturnType<typeof unstable_useLiveCompletionAdapter>;
    const Harness = ({ blocked }: { blocked: boolean }) => {
      const current = unstable_useLiveCompletionAdapter({
        fetcher,
        debounceMs: 0,
      });
      useLayoutEffect(() => {
        committed = current;
      }, [current]);
      if (blocked) throw suspended;
      return null;
    };
    const view = (blocked: boolean) => (
      <Suspense fallback={null}>
        <Harness blocked={blocked} />
      </Suspense>
    );
    const rendered = render(view(false));

    await act(async () => rendered.rerender(view(true)));
    committed.adapter.search!("alice");
    await Promise.resolve();

    expect(vi.getTimerCount()).toBe(0);
    await act(async () => rendered.rerender(view(false)));
    await act(async () => vi.advanceTimersByTimeAsync(0));

    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith("alice");
  });

  it("drops a hidden search superseded by a cached query", async () => {
    const fetcher = vi.fn(async (query: string) => [item(query)]);
    const suspended = new Promise<never>(() => {});
    let committed!: ReturnType<typeof unstable_useLiveCompletionAdapter>;
    const Harness = ({ blocked }: { blocked: boolean }) => {
      const current = unstable_useLiveCompletionAdapter({
        fetcher,
        debounceMs: 0,
      });
      useLayoutEffect(() => {
        committed = current;
      }, [current]);
      if (blocked) throw suspended;
      return null;
    };
    const view = (blocked: boolean) => (
      <Suspense fallback={null}>
        <Harness blocked={blocked} />
      </Suspense>
    );
    const rendered = render(view(false));

    await act(async () => {
      committed.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(committed.adapter.search!("alice")).toEqual([item("alice")]);

    await act(async () => rendered.rerender(view(true)));
    committed.adapter.search!("bob");
    await Promise.resolve();
    committed.adapter.search!("alice");
    await Promise.resolve();

    await act(async () => rendered.rerender(view(false)));
    await act(async () => vi.advanceTimersByTimeAsync(0));

    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith("alice");
  });

  it("settles loading when a suspended adapter is shown again", async () => {
    const fetcher = vi.fn(() => new Promise<never>(() => {}));
    const suspended = new Promise<never>(() => {});
    let committed!: ReturnType<typeof unstable_useLiveCompletionAdapter>;
    const Harness = ({ blocked }: { blocked: boolean }) => {
      const current = unstable_useLiveCompletionAdapter({
        fetcher,
        debounceMs: 0,
      });
      useLayoutEffect(() => {
        committed = current;
      }, [current]);
      if (blocked) throw suspended;
      return <output data-testid="status">{String(current.isLoading)}</output>;
    };
    const view = (blocked: boolean) => (
      <Suspense fallback={null}>
        <Harness blocked={blocked} />
      </Suspense>
    );
    const rendered = render(view(false));

    await act(async () => {
      committed.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(rendered.getByTestId("status").textContent).toBe("true");

    await act(async () => rendered.rerender(view(true)));
    await act(async () => rendered.rerender(view(false)));

    expect(rendered.getByTestId("status").textContent).toBe("false");
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

  it("refreshes cached results when the fetcher cache key changes", async () => {
    const fetcherA = vi.fn(async () => [item("workspace-a")]);
    const fetcherB = vi.fn(async () => [item("workspace-b")]);
    const { result, rerender } = renderHook(
      ({ fetcher, cacheKey }) =>
        unstable_useLiveCompletionAdapter({
          fetcher,
          cacheKey,
          debounceMs: 0,
        }),
      { initialProps: { fetcher: fetcherA, cacheKey: "workspace-a" } },
    );

    await act(async () => {
      result.current.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.adapter.search!("alice")).toEqual([
      item("workspace-a"),
    ]);

    await act(async () => {
      rerender({ fetcher: fetcherB, cacheKey: "workspace-b" });
    });
    expect(result.current.adapter.search!("alice")).toEqual([]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcherB).toHaveBeenCalledWith("alice");
    expect(result.current.adapter.search!("alice")).toEqual([
      item("workspace-b"),
    ]);
  });

  it("drops pending results after the fetcher cache key changes", async () => {
    let resolveA!: (items: readonly Unstable_TriggerItem[]) => void;
    const fetcherA = vi.fn(
      () =>
        new Promise<readonly Unstable_TriggerItem[]>((resolve) => {
          resolveA = resolve;
        }),
    );
    const fetcherB = vi.fn(async () => [item("workspace-b")]);
    const { result, rerender } = renderHook(
      ({ fetcher, cacheKey }) =>
        unstable_useLiveCompletionAdapter({
          fetcher,
          cacheKey,
          debounceMs: 0,
        }),
      { initialProps: { fetcher: fetcherA, cacheKey: "workspace-a" } },
    );

    await act(async () => {
      result.current.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      rerender({ fetcher: fetcherB, cacheKey: "workspace-b" });
    });
    await act(async () => {
      result.current.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      resolveA([item("workspace-a")]);
    });

    expect(result.current.adapter.search!("alice")).toEqual([
      item("workspace-b"),
    ]);
  });

  it("keeps cached results when only the fetcher identity changes", async () => {
    const first = vi.fn(async () => [item("alice")]);
    const second = vi.fn(async () => [item("bob")]);
    const { result, rerender } = renderHook(
      ({ fetcher }) =>
        unstable_useLiveCompletionAdapter({
          fetcher,
          cacheKey: "workspace-a",
          debounceMs: 0,
        }),
      { initialProps: { fetcher: first } },
    );

    await act(async () => {
      result.current.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.adapter.search!("alice")).toEqual([item("alice")]);

    await act(async () => {
      rerender({ fetcher: second });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(second).not.toHaveBeenCalled();
    expect(result.current.adapter.search!("alice")).toEqual([item("alice")]);
  });

  it("keeps pending queries scoped to the committed fetcher", async () => {
    const fetcherA = vi.fn(async () => [item("workspace-a")]);
    const fetcherB = vi.fn(async () => [item("workspace-b")]);
    const interruptedRender = vi.fn();
    const pending = new Promise<never>(() => {});
    let adapter!: ReturnType<
      typeof unstable_useLiveCompletionAdapter
    >["adapter"];
    const Harness = ({
      fetcher,
      cacheKey,
      blocked,
    }: {
      fetcher: typeof fetcherA;
      cacheKey: string;
      blocked: boolean;
    }) => {
      const result = unstable_useLiveCompletionAdapter({
        fetcher,
        cacheKey,
        debounceMs: 50,
      });
      if (blocked) {
        interruptedRender();
        throw pending;
      }
      adapter = result.adapter;
      return null;
    };
    const view = (
      fetcher: typeof fetcherA,
      cacheKey: string,
      blocked: boolean,
    ) => (
      <Suspense fallback={null}>
        <Harness fetcher={fetcher} cacheKey={cacheKey} blocked={blocked} />
      </Suspense>
    );
    const rendered = render(view(fetcherA, "workspace-a", false));

    await act(async () => {
      adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => {
      startTransition(() =>
        rendered.rerender(view(fetcherB, "workspace-b", true)),
      );
    });
    expect(interruptedRender).toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(fetcherA).toHaveBeenCalledOnce();
    expect(fetcherB).not.toHaveBeenCalled();
  });

  it("drops a pending result when only the cache key changes", async () => {
    let resolveFirst!: (items: readonly Unstable_TriggerItem[]) => void;
    const first = new Promise<readonly Unstable_TriggerItem[]>((resolve) => {
      resolveFirst = resolve;
    });
    const fetcher = vi.fn(() => first);
    const { result, rerender } = renderHook(
      ({ cacheKey }) =>
        unstable_useLiveCompletionAdapter({ fetcher, cacheKey, debounceMs: 0 }),
      { initialProps: { cacheKey: "workspace-a" } },
    );

    await act(async () => {
      result.current.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender({ cacheKey: "workspace-b" });
    });
    await act(async () => {
      resolveFirst([item("workspace-a")]);
    });

    expect(result.current.isLoading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.adapter.search!("alice")).toEqual([]);
  });

  it("allows a failed query to be retried", async () => {
    const fetcher = vi
      .fn<(query: string) => Promise<readonly Unstable_TriggerItem[]>>()
      .mockRejectedValueOnce(new Error("temporarily unavailable"))
      .mockRejectedValueOnce(new Error("still unavailable"))
      .mockResolvedValueOnce([item("alice")]);
    const { result } = renderHook(() =>
      unstable_useLiveCompletionAdapter({ fetcher, debounceMs: 0 }),
    );

    for (const attempt of [1, 2]) {
      await act(async () => {
        result.current.adapter.search!("alice");
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(fetcher).toHaveBeenCalledTimes(attempt);
      expect(result.current.isLoading).toBe(false);
    }

    await act(async () => {
      result.current.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(result.current.adapter.search!("alice")).toEqual([item("alice")]);
  });

  it("allows a synchronously failed query to be retried", async () => {
    const fetcher = vi
      .fn<(query: string) => Promise<readonly Unstable_TriggerItem[]>>()
      .mockImplementationOnce(() => {
        throw new Error("invalid request configuration");
      })
      .mockResolvedValueOnce([item("alice")]);
    const { result } = renderHook(() =>
      unstable_useLiveCompletionAdapter({ fetcher, debounceMs: 0 }),
    );

    await act(async () => {
      result.current.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      result.current.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.adapter.search!("alice")).toEqual([item("alice")]);
  });

  it("does not automatically retry when search runs during every render", async () => {
    const fetcher = vi
      .fn<(query: string) => Promise<readonly Unstable_TriggerItem[]>>()
      .mockRejectedValueOnce(new Error("temporarily unavailable"))
      .mockImplementation(
        () => new Promise<readonly Unstable_TriggerItem[]>(() => {}),
      );
    const { result } = renderHook(() => {
      const completion = unstable_useLiveCompletionAdapter({
        fetcher,
        debounceMs: 0,
      });
      completion.adapter.search!("alice");
      return completion;
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("re-arms a failed query when its pending retry is interrupted", async () => {
    const fetcher = vi
      .fn<(query: string) => Promise<readonly Unstable_TriggerItem[]>>()
      .mockRejectedValueOnce(new Error("temporarily unavailable"))
      .mockImplementationOnce(
        () => new Promise<readonly Unstable_TriggerItem[]>(() => {}),
      )
      .mockResolvedValueOnce([item("alice")]);
    const { result } = renderHook(() =>
      unstable_useLiveCompletionAdapter({ fetcher, debounceMs: 0 }),
    );

    await act(async () => {
      result.current.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      result.current.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);

    await act(async () => {
      result.current.adapter.search!("alicex");
    });
    await act(async () => {
      result.current.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenLastCalledWith("alice");
    expect(result.current.adapter.search!("alice")).toEqual([item("alice")]);
  });

  it("re-arms a failed query when its retry is hidden", async () => {
    const fetcher = vi
      .fn<(query: string) => Promise<readonly Unstable_TriggerItem[]>>()
      .mockRejectedValueOnce(new Error("temporarily unavailable"))
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce([item("alice")]);
    const suspended = new Promise<never>(() => {});
    let committed!: ReturnType<typeof unstable_useLiveCompletionAdapter>;
    const Harness = ({ blocked }: { blocked: boolean }) => {
      const current = unstable_useLiveCompletionAdapter({
        fetcher,
        debounceMs: 0,
      });
      useLayoutEffect(() => {
        committed = current;
      }, [current]);
      if (blocked) throw suspended;
      return null;
    };
    const view = (blocked: boolean) => (
      <Suspense fallback={null}>
        <Harness blocked={blocked} />
      </Suspense>
    );
    const rendered = render(view(false));

    await act(async () => {
      committed.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledOnce();

    await act(async () => {
      committed.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);

    await act(async () => rendered.rerender(view(true)));
    await act(async () => rendered.rerender(view(false)));
    await act(async () => {
      committed.adapter.search!("alice");
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetcher).toHaveBeenCalledTimes(3);
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
