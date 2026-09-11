// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInteractablePersistenceQueue } from "./useInteractablePersistenceQueue";

type TestState = Record<string, number>;

type PersistenceStatus = {
  isPending: boolean;
  error: unknown;
};

type PersistenceStatusMap = Record<string, PersistenceStatus>;

const createDeferred = () => {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderQueue = (save: (state: TestState) => void | Promise<void>) => {
  let snapshot: TestState = {};
  let persistence: PersistenceStatusMap = {};
  const adapterRef = { current: { save } };
  const updatePersistenceStatus = (
    updater: (prev: PersistenceStatusMap) => PersistenceStatusMap,
  ) => {
    persistence = updater(persistence);
  };
  const hook = renderHook(() =>
    useInteractablePersistenceQueue({
      adapterRef,
      snapshot: () => snapshot,
      updatePersistenceStatus,
    }),
  );

  return {
    ...hook,
    setState(id: string, value: number) {
      snapshot = { ...snapshot, [id]: value };
    },
    removeStatus(id: string) {
      const { [id]: _, ...rest } = persistence;
      persistence = rest;
    },
    getStatus() {
      return persistence;
    },
  };
};

const flushMicrotasks = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useInteractablePersistenceQueue", () => {
  it("coalesces dirty marks inside the debounce window into one save", async () => {
    const save = vi.fn<(state: TestState) => void>();
    const queue = renderQueue(save);

    queue.setState("a", 1);
    act(() => queue.result.current.schedulePersistence("a"));
    await act(() => vi.advanceTimersByTimeAsync(200));

    queue.setState("b", 2);
    act(() => queue.result.current.schedulePersistence("b"));
    await act(() => vi.advanceTimersByTimeAsync(200));

    queue.setState("a", 3);
    act(() => queue.result.current.schedulePersistence("a"));
    await act(() => vi.advanceTimersByTimeAsync(499));

    expect(save).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith({ a: 3, b: 2 });
  });

  it("attributes errors by batch sequence and lets a newer save supersede an older error", async () => {
    const first = createDeferred();
    const second = createDeferred();
    const firstError = new Error("first save failed");
    const secondError = new Error("second save failed");
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const queue = renderQueue(save);

    queue.setState("a", 1);
    queue.setState("b", 1);
    act(() => {
      queue.result.current.schedulePersistence("a");
      queue.result.current.schedulePersistence("b");
    });
    await act(() => vi.advanceTimersByTimeAsync(500));

    queue.setState("a", 2);
    act(() => queue.result.current.schedulePersistence("a"));
    let flushPromise!: Promise<void>;
    act(() => {
      flushPromise = queue.result.current.flush();
    });

    first.reject(firstError);
    await act(flushMicrotasks);

    expect(save).toHaveBeenCalledTimes(2);
    expect(queue.getStatus()).toEqual({
      a: { isPending: true, error: undefined },
      b: { isPending: false, error: firstError },
    });

    second.reject(secondError);
    await act(flushMicrotasks);
    await flushPromise;

    expect(queue.getStatus()).toEqual({
      a: { isPending: false, error: secondError },
      b: { isPending: false, error: firstError },
    });
  });

  it("does not recreate a removed status when an in-flight save rejects", async () => {
    const pending = createDeferred();
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockImplementationOnce(() => pending.promise);
    const queue = renderQueue(save);

    queue.setState("removed", 1);
    act(() => queue.result.current.schedulePersistence("removed"));
    await act(() => vi.advanceTimersByTimeAsync(500));

    expect(queue.getStatus()).toEqual({
      removed: { isPending: true, error: undefined },
    });

    queue.removeStatus("removed");
    pending.reject(new Error("save failed"));
    await act(flushMicrotasks);

    expect(queue.getStatus()).toEqual({});
  });
});
