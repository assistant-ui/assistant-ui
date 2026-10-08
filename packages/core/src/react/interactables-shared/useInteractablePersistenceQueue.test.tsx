// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SAVE_WAIT_TIMEOUT_MS,
  useInteractablePersistenceQueue,
} from "./useInteractablePersistenceQueue";

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

const renderQueue = (
  save: ((state: TestState) => void | Promise<void>) | undefined,
) => {
  let snapshot: TestState = {};
  let persistence: PersistenceStatusMap = {};
  const adapterRef: {
    current: { save: (state: TestState) => void | Promise<void> } | undefined;
  } = { current: save ? { save } : undefined };
  const adapterGenerationRef = { current: 0 };
  const updatePersistenceStatus = (
    updater: (prev: PersistenceStatusMap) => PersistenceStatusMap,
  ) => {
    persistence = updater(persistence);
  };
  const hook = renderHook(() =>
    useInteractablePersistenceQueue({
      adapterRef,
      adapterGenerationRef,
      snapshot: () => snapshot,
      updatePersistenceStatus,
    }),
  );

  return {
    ...hook,
    adapterRef,
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
  it("resolves flush while edits wait for an adapter", async () => {
    const queue = renderQueue(undefined);

    queue.setState("a", 1);
    act(() => queue.result.current.schedulePersistence("a"));

    let flushPromise!: Promise<void>;
    act(() => {
      flushPromise = queue.result.current.flush();
    });

    await expect(flushPromise).resolves.toBeUndefined();
  });

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

  it("reports an id as saving until its batch settles", async () => {
    const pending = createDeferred();
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockImplementationOnce(() => pending.promise);
    const queue = renderQueue(save);

    queue.setState("a", 1);
    act(() => queue.result.current.schedulePersistence("a"));
    expect(queue.result.current.isSaving("a")).toBe(false);

    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(queue.result.current.isSaving("a")).toBe(true);

    pending.reject(new Error("save failed"));
    await act(flushMicrotasks);
    expect(queue.result.current.isSaving("a")).toBe(false);
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

  describe("waitForAdapterSaves", () => {
    const startSave = async (
      queue: ReturnType<typeof renderQueue>,
      id: string,
      value: number,
    ) => {
      queue.setState(id, value);
      act(() => queue.result.current.schedulePersistence(id));
      await act(() => vi.advanceTimersByTimeAsync(500));
    };

    it("does not wait on saves to another adapter", async () => {
      const pending = createDeferred();
      const queue = renderQueue(() => pending.promise);
      const other = { save: vi.fn() };
      await startSave(queue, "a", 1);

      await expect(
        queue.result.current.waitForAdapterSaves(other),
      ).resolves.toEqual([]);
    });

    it("waits for in-flight and queued saves to the same adapter", async () => {
      const first = createDeferred();
      const second = createDeferred();
      const save = vi
        .fn<(state: TestState) => Promise<void>>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise);
      const queue = renderQueue(save);
      const adapter = queue.adapterRef.current!;
      await startSave(queue, "a", 1);
      queue.setState("a", 2);
      act(() => {
        queue.result.current.schedulePersistence("a");
        queue.result.current.flushIfPending();
      });

      let result: unknown;
      void queue.result.current.waitForAdapterSaves(adapter).then((r) => {
        result = r;
      });
      first.resolve();
      await act(flushMicrotasks);
      expect(save).toHaveBeenCalledTimes(2);
      expect(result).toBeUndefined();

      second.resolve();
      await act(flushMicrotasks);
      expect(result).toEqual([]);
    });

    it("hands back a batch whose save rejected", async () => {
      const pending = createDeferred();
      const queue = renderQueue(() => pending.promise);
      const adapter = queue.adapterRef.current!;
      await startSave(queue, "a", 1);

      const wait = queue.result.current.waitForAdapterSaves(adapter);
      pending.reject(new Error("save failed"));

      await expect(wait).resolves.toEqual([
        { payload: { a: 1 }, dirtyIds: new Set(["a"]) },
      ]);
    });

    it("does not recover an older failed edit after a newer save succeeds", async () => {
      const first = createDeferred();
      const second = createDeferred();
      const save = vi
        .fn<(state: TestState) => Promise<void>>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise);
      const queue = renderQueue(save);
      const adapter = queue.adapterRef.current!;
      await startSave(queue, "a", 1);
      queue.setState("a", 2);
      act(() => {
        queue.result.current.schedulePersistence("a");
        queue.result.current.flushIfPending();
      });

      const wait = queue.result.current.waitForAdapterSaves(adapter);
      first.reject(new Error("first save failed"));
      await act(flushMicrotasks);
      second.resolve();

      await expect(wait).resolves.toEqual([]);
    });

    it("hands back a batch whose save has not settled by the timeout", async () => {
      const queue = renderQueue(() => new Promise<void>(() => {}));
      const adapter = queue.adapterRef.current!;
      await startSave(queue, "a", 1);

      let result: unknown;
      void queue.result.current.waitForAdapterSaves(adapter).then((r) => {
        result = r;
      });
      await act(() => vi.advanceTimersByTimeAsync(SAVE_WAIT_TIMEOUT_MS - 1));
      expect(result).toBeUndefined();

      await act(() => vi.advanceTimersByTimeAsync(1));
      expect(result).toEqual([{ payload: { a: 1 }, dirtyIds: new Set(["a"]) }]);
    });
  });
});
