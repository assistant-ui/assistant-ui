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
  { retainDirtyWithoutAdapter = false } = {},
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
      retainDirtyWithoutAdapter,
    }),
  );

  return {
    ...hook,
    adapterRef,
    replaceScope() {
      adapterGenerationRef.current += 1;
    },
    detachAdapter() {
      adapterRef.current = undefined;
    },
    attachAdapter() {
      adapterRef.current = save ? { save } : undefined;
    },
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

const startRetryBehindQueuedSnapshot = async () => {
  const first = createDeferred();
  const second = createDeferred();
  const firstError = new Error("first save failed");
  const save = vi
    .fn<(state: TestState) => Promise<void>>()
    .mockImplementationOnce(() => first.promise)
    .mockImplementationOnce(() => second.promise)
    .mockResolvedValue(undefined);
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
  let firstFlush!: Promise<void>;
  act(() => {
    firstFlush = queue.result.current.flush();
  });
  first.reject(firstError);
  await act(flushMicrotasks);

  const flush = () => {
    let promise!: Promise<void>;
    act(() => {
      promise = queue.result.current.flush();
    });
    return promise;
  };

  return { queue, save, second, firstError, firstFlush, flush };
};

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

      const recovered = await wait;
      expect(recovered).toEqual([
        { payload: { a: 1 }, dirtyIds: new Set(["a"]) },
      ]);
      await expect(
        queue.result.current.waitForAdapterSaves(adapter),
      ).resolves.toEqual(recovered);
      const restore = vi.fn();
      queue.result.current.restoreAdapterRecovery(
        adapter,
        recovered[0]!,
        restore,
      );
      expect(restore).toHaveBeenCalledTimes(1);
      await expect(
        queue.result.current.waitForAdapterSaves(adapter),
      ).resolves.toEqual(recovered);
    });

    it("lets a later successful full snapshot supersede an earlier failed batch", async () => {
      const first = createDeferred();
      const second = createDeferred();
      const save = vi
        .fn<(state: TestState) => Promise<void>>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise);
      const queue = renderQueue(save);
      const adapter = queue.adapterRef.current!;
      await startSave(queue, "a", 1);
      queue.setState("b", 2);
      act(() => {
        queue.result.current.schedulePersistence("b");
        queue.result.current.flushIfPending();
      });

      const wait = queue.result.current.waitForAdapterSaves(adapter);
      first.reject(new Error("first save failed"));
      await act(flushMicrotasks);
      expect(save).toHaveBeenCalledTimes(2);
      expect(save.mock.lastCall![0]).toEqual({ a: 1, b: 2 });
      second.resolve();

      await expect(wait).resolves.toEqual([]);
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

    it.each([false, true])(
      "hands back a rejected retry after prior recovery restored=%s",
      async (restoreRecovery) => {
        const retry = createDeferred();
        const save = vi
          .fn<(state: TestState) => Promise<void>>()
          .mockRejectedValueOnce(new Error("offline"))
          .mockImplementationOnce(() => retry.promise);
        const queue = renderQueue(save);
        const adapter = queue.adapterRef.current!;
        await startSave(queue, "a", 1);
        if (restoreRecovery) {
          const [recovery] =
            await queue.result.current.waitForAdapterSaves(adapter);
          const restore = vi.fn();
          queue.result.current.restoreAdapterRecovery(
            adapter,
            recovery!,
            restore,
          );
          expect(restore).toHaveBeenCalledTimes(1);
        }
        act(() => {
          void queue.result.current.flush();
        });
        expect(save).toHaveBeenCalledTimes(2);

        const wait = queue.result.current.waitForAdapterSaves(adapter);
        retry.reject(new Error("retry failed"));

        await expect(wait).resolves.toEqual([
          { payload: { a: 1 }, dirtyIds: new Set(["a"]) },
        ]);
      },
    );

    it("does not hand back a failed retry that a newer saved snapshot covers", async () => {
      const retry = createDeferred();
      const newer = createDeferred();
      const save = vi
        .fn<(state: TestState) => Promise<void>>()
        .mockRejectedValueOnce(new Error("offline"))
        .mockImplementationOnce(() => retry.promise)
        .mockImplementationOnce(() => newer.promise);
      const queue = renderQueue(save);
      const adapter = queue.adapterRef.current!;
      await startSave(queue, "a", 1);
      act(() => {
        void queue.result.current.flush();
      });
      queue.setState("a", 2);
      act(() => {
        queue.result.current.schedulePersistence("a");
        queue.result.current.flushIfPending();
      });

      const wait = queue.result.current.waitForAdapterSaves(adapter);
      retry.reject(new Error("retry failed"));
      await act(flushMicrotasks);
      expect(save).toHaveBeenLastCalledWith({ a: 2 });
      newer.resolve();

      await expect(wait).resolves.toEqual([]);
    });

    it("stops waiting once a queued retry is skipped as redundant", async () => {
      const { queue, save, second, firstFlush, flush } =
        await startRetryBehindQueuedSnapshot();
      const adapter = queue.adapterRef.current!;
      const secondFlush = flush();

      let result: unknown;
      void queue.result.current.waitForAdapterSaves(adapter).then((r) => {
        result = r;
      });
      second.resolve();
      await act(() => Promise.all([firstFlush, secondFlush]));
      await act(flushMicrotasks);

      expect(save).toHaveBeenCalledTimes(2);
      expect(result).toEqual([]);
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

      await expect(
        queue.result.current.waitForAdapterSaves(adapter),
      ).resolves.toEqual(result);
    });

    it("skips snapshots queued behind a timed-out save", async () => {
      const queue = renderQueue(() => new Promise<void>(() => {}));
      const adapter = queue.adapterRef.current!;
      await startSave(queue, "a", 1);
      const firstWait = queue.result.current.waitForAdapterSaves(adapter);
      await act(() => vi.advanceTimersByTimeAsync(SAVE_WAIT_TIMEOUT_MS));
      const recovered = await firstWait;

      queue.setState("b", 2);
      act(() => {
        queue.result.current.schedulePersistence("b");
        queue.result.current.flushIfPending();
      });

      await expect(
        queue.result.current.waitForAdapterSaves(adapter),
      ).resolves.toEqual([
        { payload: { a: 1, b: 2 }, dirtyIds: new Set(["a", "b"]) },
      ]);
      expect(recovered).toEqual([
        { payload: { a: 1 }, dirtyIds: new Set(["a"]) },
      ]);
    });

    it("keeps waiting for another adapter queued behind a timed-out save", async () => {
      const first = createDeferred();
      const second = createDeferred();
      const saveB = vi.fn(() => second.promise);
      const queue = renderQueue(() => first.promise);
      const adapterA = queue.adapterRef.current!;
      const adapterB = { save: saveB };
      await startSave(queue, "a", 1);

      queue.adapterRef.current = adapterB;
      queue.setState("b", 2);
      act(() => {
        queue.result.current.schedulePersistence("b");
        queue.result.current.flushIfPending();
      });

      const waitA = queue.result.current.waitForAdapterSaves(adapterA);
      await act(() => vi.advanceTimersByTimeAsync(SAVE_WAIT_TIMEOUT_MS));
      await expect(waitA).resolves.toEqual([
        { payload: { a: 1 }, dirtyIds: new Set(["a"]) },
      ]);

      let result: unknown;
      void queue.result.current.waitForAdapterSaves(adapterB).then((value) => {
        result = value;
      });
      await act(() => vi.advanceTimersByTimeAsync(SAVE_WAIT_TIMEOUT_MS - 1));
      expect(result).toBeUndefined();
      await act(() => vi.advanceTimersByTimeAsync(1));
      expect(result).toEqual([
        { payload: { a: 1, b: 2 }, dirtyIds: new Set(["b"]) },
      ]);

      first.resolve();
      await act(flushMicrotasks);
      expect(saveB).toHaveBeenCalledOnce();
      second.resolve();
      await act(flushMicrotasks);
    });
  });
  it("retries a failed save on flush and keeps its error until a save succeeds", async () => {
    const retry = createDeferred();
    const error = new Error("offline");
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockRejectedValueOnce(error)
      .mockImplementationOnce(() => retry.promise);
    const queue = renderQueue(save);

    queue.setState("a", 1);
    act(() => queue.result.current.schedulePersistence("a"));
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(queue.getStatus()).toEqual({ a: { isPending: false, error } });

    let flushPromise!: Promise<void>;
    act(() => {
      flushPromise = queue.result.current.flush();
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ a: 1 });
    expect(queue.getStatus()).toEqual({ a: { isPending: true, error } });

    retry.resolve();
    await act(() => flushPromise);

    expect(queue.getStatus()).toEqual({});
  });

  it("retries a permanently failing save only when a save is requested", async () => {
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockRejectedValue(new Error("offline"));
    const queue = renderQueue(save);

    queue.setState("a", 1);
    act(() => queue.result.current.schedulePersistence("a"));
    await act(() => vi.advanceTimersByTimeAsync(500));
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(save).toHaveBeenCalledTimes(1);

    await act(() => queue.result.current.flush());
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(save).toHaveBeenCalledTimes(2);

    queue.setState("b", 2);
    act(() => queue.result.current.schedulePersistence("b"));
    await act(() => vi.advanceTimersByTimeAsync(500));
    await act(() => vi.advanceTimersByTimeAsync(60_000));

    expect(save).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenLastCalledWith({ a: 1, b: 2 });
    expect(queue.getStatus()).toEqual({
      a: { isPending: false, error: expect.any(Error) },
      b: { isPending: false, error: expect.any(Error) },
    });
  });

  it("clears a failed id once a later save carrying its value succeeds", async () => {
    const error = new Error("offline");
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);
    const queue = renderQueue(save);

    queue.setState("a", 1);
    act(() => queue.result.current.schedulePersistence("a"));
    await act(() => vi.advanceTimersByTimeAsync(500));

    queue.setState("b", 2);
    act(() => queue.result.current.schedulePersistence("b"));
    await act(() => vi.advanceTimersByTimeAsync(500));

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ a: 1, b: 2 });
    expect(queue.getStatus()).toEqual({});

    await act(() => queue.result.current.flush());
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("clears a failed id when a snapshot queued before the failure saves it", async () => {
    const first = createDeferred();
    const second = createDeferred();
    const firstError = new Error("first save failed");
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockResolvedValue(undefined);
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

    expect(queue.getStatus()).toEqual({
      a: { isPending: true, error: undefined },
      b: { isPending: false, error: firstError },
    });

    second.resolve();
    await act(() => flushPromise);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ a: 2, b: 1 });
    expect(queue.getStatus()).toEqual({});

    await act(() => queue.result.current.flush());
    await act(() => vi.advanceTimersByTimeAsync(60_000));

    expect(save).toHaveBeenCalledTimes(2);
  });

  it("keeps a failed id queued when the snapshot queued before the failure also fails", async () => {
    const first = createDeferred();
    const second = createDeferred();
    const firstError = new Error("first save failed");
    const secondError = new Error("second save failed");
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockResolvedValue(undefined);
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
    second.reject(secondError);
    await act(() => flushPromise);

    expect(queue.getStatus()).toEqual({
      a: { isPending: false, error: secondError },
      b: { isPending: false, error: firstError },
    });

    await act(() => queue.result.current.flush());

    expect(save).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenLastCalledWith({ a: 2, b: 1 });
    expect(queue.getStatus()).toEqual({});
  });

  it("keeps a failed id's error when it changed after the snapshot that succeeded", async () => {
    const first = createDeferred();
    const second = createDeferred();
    const firstError = new Error("first save failed");
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockResolvedValue(undefined);
    const queue = renderQueue(save, { retainDirtyWithoutAdapter: true });

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

    queue.detachAdapter();
    queue.setState("b", 2);
    act(() => queue.result.current.schedulePersistence("b"));
    second.resolve();
    await act(() => flushPromise);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ a: 2, b: 1 });
    expect(queue.getStatus()).toEqual({
      b: { isPending: false, error: firstError },
    });

    queue.attachAdapter();
    await act(() => queue.result.current.flush());

    expect(save).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenLastCalledWith({ a: 2, b: 2 });
    expect(queue.getStatus()).toEqual({});
  });

  it("keeps the failure of a newer edit when an older snapshot succeeds", async () => {
    const first = createDeferred();
    const error = new Error("offline");
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockImplementationOnce(() => first.promise)
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);
    const queue = renderQueue(save);

    queue.setState("a", 1);
    queue.setState("b", 1);
    act(() => {
      queue.result.current.schedulePersistence("a");
      queue.result.current.schedulePersistence("b");
    });
    await act(() => vi.advanceTimersByTimeAsync(500));

    queue.setState("b", 2);
    act(() => queue.result.current.schedulePersistence("b"));
    let flushPromise!: Promise<void>;
    act(() => {
      flushPromise = queue.result.current.flush();
    });
    first.resolve();
    await act(() => flushPromise);

    expect(save).toHaveBeenCalledTimes(2);
    expect(queue.getStatus()).toEqual({ b: { isPending: false, error } });

    await act(() => queue.result.current.flush());

    expect(save).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenLastCalledWith({ a: 1, b: 2 });
    expect(queue.getStatus()).toEqual({});
  });

  it("does not retry a failed save from a replaced scope", async () => {
    const pending = createDeferred();
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockImplementationOnce(() => pending.promise);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const queue = renderQueue(save);

    queue.setState("a", 1);
    act(() => queue.result.current.schedulePersistence("a"));
    await act(() => vi.advanceTimersByTimeAsync(500));

    queue.replaceScope();
    pending.reject(new Error("save failed"));
    await act(flushMicrotasks);
    await act(() => queue.result.current.flush());

    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.getStatus()).toEqual({});
  });

  it("drops a failed save on discardPending", async () => {
    const error = new Error("offline");
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);
    const queue = renderQueue(save);

    queue.setState("a", 1);
    act(() => queue.result.current.schedulePersistence("a"));
    await act(() => vi.advanceTimersByTimeAsync(500));

    act(() => queue.result.current.discardPending());
    await act(() => queue.result.current.flush());
    expect(save).toHaveBeenCalledTimes(1);

    queue.setState("b", 2);
    act(() => queue.result.current.schedulePersistence("b"));
    await act(() => vi.advanceTimersByTimeAsync(500));

    expect(save).toHaveBeenCalledTimes(2);
    expect(queue.getStatus()).toEqual({ a: { isPending: false, error } });
  });

  it("retries a failed id without recreating its removed status", async () => {
    const save = vi
      .fn<(state: TestState) => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("still offline"));
    const queue = renderQueue(save);

    queue.setState("removed", 1);
    act(() => queue.result.current.schedulePersistence("removed"));
    await act(() => vi.advanceTimersByTimeAsync(500));

    queue.removeStatus("removed");
    await act(() => queue.result.current.flush());

    expect(save).toHaveBeenCalledTimes(2);
    expect(queue.getStatus()).toEqual({});
  });

  it("does not resend a failed id that the snapshot already in flight saves", async () => {
    const { queue, save, second, firstFlush, flush } =
      await startRetryBehindQueuedSnapshot();
    save.mockRejectedValueOnce(new Error("redundant retry failed"));

    const secondFlush = flush();
    second.resolve();
    await act(() => Promise.all([firstFlush, secondFlush]));

    expect(queue.getStatus()).toEqual({});
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ a: 2, b: 1 });

    await act(() => queue.result.current.flush());
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("schedules one retry for concurrent flush callers", async () => {
    const { queue, save, second, firstFlush, flush } =
      await startRetryBehindQueuedSnapshot();
    const secondError = new Error("second save failed");

    const flushes = [firstFlush, flush(), flush(), flush()];
    second.reject(secondError);
    await act(() => Promise.all(flushes));

    expect(save).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenLastCalledWith({ a: 2, b: 1 });
    expect(queue.getStatus()).toEqual({});
  });

  it("keeps both failures when the queued snapshot and the retry fail", async () => {
    const { queue, save, second, firstFlush, flush } =
      await startRetryBehindQueuedSnapshot();
    const secondError = new Error("second save failed");
    const retryError = new Error("retry failed");
    save.mockRejectedValueOnce(retryError);

    const secondFlush = flush();
    second.reject(secondError);
    await act(() => Promise.all([firstFlush, secondFlush]));

    expect(save).toHaveBeenCalledTimes(3);
    expect(queue.getStatus()).toEqual({
      a: { isPending: false, error: secondError },
      b: { isPending: false, error: retryError },
    });

    await act(() => queue.result.current.flush());

    expect(save).toHaveBeenCalledTimes(4);
    expect(save).toHaveBeenLastCalledWith({ a: 2, b: 1 });
    expect(queue.getStatus()).toEqual({});
  });

  it("still saves a newer edit that joined the retry the queued snapshot made redundant", async () => {
    const { queue, save, second, firstFlush, flush } =
      await startRetryBehindQueuedSnapshot();
    const retryError = new Error("retry failed");
    save.mockRejectedValueOnce(retryError);

    queue.setState("c", 1);
    act(() => queue.result.current.schedulePersistence("c"));
    const secondFlush = flush();
    second.resolve();
    await act(() => Promise.all([firstFlush, secondFlush]));

    expect(save).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenLastCalledWith({ a: 2, b: 1, c: 1 });
    expect(queue.getStatus()).toEqual({
      c: { isPending: false, error: retryError },
    });
  });

  it("keeps a failed id's error when it changed after its retry was queued", async () => {
    const { queue, save, second, firstError, firstFlush, flush } =
      await startRetryBehindQueuedSnapshot();
    const retry = createDeferred();
    save.mockImplementationOnce(() => retry.promise);

    const secondFlush = flush();
    queue.setState("b", 2);
    act(() => queue.result.current.schedulePersistence("b"));
    second.resolve();
    await act(flushMicrotasks);

    expect(save).toHaveBeenCalledTimes(3);
    expect(queue.getStatus()).toEqual({
      b: { isPending: true, error: firstError },
    });

    retry.resolve();
    await act(() => Promise.all([firstFlush, secondFlush]));

    expect(save).toHaveBeenCalledTimes(4);
    expect(save).toHaveBeenLastCalledWith({ a: 2, b: 2 });
    expect(queue.getStatus()).toEqual({});
  });
});
