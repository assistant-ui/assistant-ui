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
});
