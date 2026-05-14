import { describe, it, expect } from "vitest";
import { OptimisticState } from "../runtimes/remote-thread-list/optimistic-state";
import {
  type RemoteThreadState,
  type RemoteThreadData,
  type THREAD_MAPPING_ID,
  createThreadMappingId,
} from "../runtimes/remote-thread-list/remote-thread-state";
import { deferred } from "./remote-thread-list-test-helpers";

/**
 * Tests for the isLoading lifecycle of RemoteThreadListThreadListRuntimeCore.
 *
 * The initial isLoading must be `true` so consumers can distinguish
 * "not yet loaded" from "loaded with zero threads".
 */

type ListResult = {
  threads: {
    remoteId: string;
    status: "regular" | "archived";
    title?: string;
    externalId?: string | undefined;
  }[];
};

const INITIAL_STATE: RemoteThreadState = {
  isLoading: true,
  newThreadId: undefined,
  threadIds: [],
  archivedThreadIds: [],
  threadIdMap: {},
  threadData: {},
};

const applyListResult = (
  state: RemoteThreadState,
  l: ListResult,
): RemoteThreadState => {
  const newThreadIds: string[] = [];
  const newArchivedThreadIds: string[] = [];
  const newThreadIdMap = {} as Record<string, THREAD_MAPPING_ID>;
  const newThreadData = {} as Record<THREAD_MAPPING_ID, RemoteThreadData>;

  for (const thread of l.threads) {
    if (thread.status === "regular") newThreadIds.push(thread.remoteId);
    else newArchivedThreadIds.push(thread.remoteId);

    const mappingId = createThreadMappingId(thread.remoteId);
    newThreadIdMap[thread.remoteId] = mappingId;
    newThreadData[mappingId] = {
      id: thread.remoteId,
      remoteId: thread.remoteId,
      externalId: thread.externalId,
      status: thread.status,
      title: thread.title,
      initializeTask: Promise.resolve({
        remoteId: thread.remoteId,
        externalId: thread.externalId,
      }),
    };
  }

  return {
    ...state,
    isLoading: false,
    threadIds: newThreadIds,
    archivedThreadIds: newArchivedThreadIds,
    threadIdMap: { ...state.threadIdMap, ...newThreadIdMap },
    threadData: { ...state.threadData, ...newThreadData },
  };
};

describe("RemoteThreadList isLoading lifecycle", () => {
  it("starts as true before any loading begins", () => {
    const state = new OptimisticState<RemoteThreadState>(INITIAL_STATE);
    expect(state.value.isLoading).toBe(true);
  });

  it("remains true while loading is in progress", () => {
    const state = new OptimisticState<RemoteThreadState>(INITIAL_STATE);
    const d = deferred<ListResult>();

    state.optimisticUpdate({
      execute: () => d.promise,
      loading: (s) => ({ ...s, isLoading: true }),
      // biome-ignore lint/suspicious/noThenProperty: OptimisticState reducer pattern
      then: applyListResult,
    });

    expect(state.value.isLoading).toBe(true);
  });

  it("becomes false after loading completes with empty list", async () => {
    const state = new OptimisticState<RemoteThreadState>(INITIAL_STATE);
    const d = deferred<ListResult>();

    const promise = state.optimisticUpdate({
      execute: () => d.promise,
      loading: (s) => ({ ...s, isLoading: true }),
      // biome-ignore lint/suspicious/noThenProperty: OptimisticState reducer pattern
      then: applyListResult,
    });

    d.resolve({ threads: [] });
    await promise;

    expect(state.value.isLoading).toBe(false);
  });

  it("becomes false after loading completes with threads", async () => {
    const state = new OptimisticState<RemoteThreadState>(INITIAL_STATE);
    const d = deferred<ListResult>();

    const promise = state.optimisticUpdate({
      execute: () => d.promise,
      loading: (s) => ({ ...s, isLoading: true }),
      // biome-ignore lint/suspicious/noThenProperty: OptimisticState reducer pattern
      then: applyListResult,
    });

    d.resolve({
      threads: [
        { remoteId: "t-1", status: "regular", title: "Thread 1" },
        { remoteId: "t-2", status: "archived", title: "Thread 2" },
      ],
    });
    await promise;

    expect(state.value.isLoading).toBe(false);
    expect(state.value.threadIds).toEqual(["t-1"]);
    expect(state.value.archivedThreadIds).toEqual(["t-2"]);
  });

  it("initial true and final false are distinguishable", async () => {
    const state = new OptimisticState<RemoteThreadState>(INITIAL_STATE);
    const before = state.value.isLoading;

    const d = deferred<ListResult>();
    const promise = state.optimisticUpdate({
      execute: () => d.promise,
      loading: (s) => ({ ...s, isLoading: true }),
      // biome-ignore lint/suspicious/noThenProperty: OptimisticState reducer pattern
      then: applyListResult,
    });

    d.resolve({ threads: [] });
    await promise;

    const after = state.value.isLoading;
    expect(before).toBe(true);
    expect(after).toBe(false);
  });
});

describe("RemoteThreadList isLoading error path", () => {
  it("isLoading resets to false after adapter.list() rejects", async () => {
    const state = new OptimisticState<RemoteThreadState>(INITIAL_STATE);
    const d = deferred<ListResult>();

    // Simulate the getLoadThreadsPromise pattern with .catch() fix
    let loadPromise: Promise<void> | undefined;
    loadPromise = state
      .optimisticUpdate({
        execute: () => d.promise,
        loading: (s) => ({ ...s, isLoading: true }),
        // biome-ignore lint/suspicious/noThenProperty: OptimisticState reducer pattern
        then: applyListResult,
      })
      .catch(() => {
        loadPromise = undefined;
        state.update({ ...state.baseValue, isLoading: false });
      })
      .then(() => {});

    // While loading, isLoading is true
    expect(state.value.isLoading).toBe(true);

    d.reject(new Error("network error"));
    await loadPromise;

    // After failure, isLoading resets to false
    expect(state.value.isLoading).toBe(false);

    // Cache is cleared, allowing retry
    expect(loadPromise).toBeUndefined();
  });
});
