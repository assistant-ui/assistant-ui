import { describe, it, expect } from "vitest";
import { OptimisticState } from "../runtimes/remote-thread-list/optimistic-state";
import {
  type RemoteThreadState,
  type RemoteThreadData,
  type THREAD_MAPPING_ID,
  createThreadMappingId,
  updateStatusReducer,
} from "../runtimes/remote-thread-list/remote-thread-state";

/**
 * Reproduces the race condition where a stale list() response
 * re-introduces a thread that was deleted/archived while the list
 * was in flight.
 *
 * Root cause (before fix): OptimisticState's `then` callback could
 * overwrite `_baseValue`, erasing effects from transforms that had
 * already completed. The fix re-applies completed `optimistic`
 * callbacks after every `then`.
 */

const EMPTY_STATE: RemoteThreadState = {
  isLoading: false,
  newThreadId: undefined,
  threadIds: [],
  archivedThreadIds: [],
  threadIdMap: {},
  threadData: {},
};

type ListResult = {
  threads: {
    remoteId: string;
    status: "regular" | "archived";
    title?: string;
    externalId?: string | undefined;
  }[];
};

/** Simulates getLoadThreadsPromise's then callback (plain version, no workarounds). */
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
    threadIds: newThreadIds,
    archivedThreadIds: newArchivedThreadIds,
    threadIdMap: { ...state.threadIdMap, ...newThreadIdMap },
    threadData: { ...state.threadData, ...newThreadData },
  };
};

/** Creates a deferred promise for controlling resolution order. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("list + delete race condition", () => {
  it("stale list() does not re-add a thread deleted while list was in flight", async () => {
    const state = new OptimisticState<RemoteThreadState>(EMPTY_STATE);

    const listDeferred = deferred<ListResult>();
    const deleteDeferred = deferred<void>();

    // 1. list() starts
    const listPromise = state.optimisticUpdate({
      execute: () => listDeferred.promise,
      loading: (s) => ({ ...s, isLoading: true }),
      then: applyListResult,
    });

    // 2. delete starts (while list is in flight)
    const deletePromise = state.optimisticUpdate({
      execute: () => deleteDeferred.promise,
      optimistic: (s) => updateStatusReducer(s, "thread-A", "deleted"),
    });

    // 3. DELETE resolves first
    deleteDeferred.resolve();
    await deletePromise;

    // 4. list resolves with stale data that includes deleted thread
    listDeferred.resolve({
      threads: [{ remoteId: "thread-A", status: "regular", title: "A" }],
    });
    await listPromise;

    // Thread A must NOT reappear
    expect(state.value.threadIds).not.toContain("thread-A");
    expect(
      state.value.threadData[createThreadMappingId("thread-A")],
    ).toBeUndefined();
  });

  it("stale list() does not revert archive back to regular", async () => {
    // Start with thread A already in state
    const mappingId = createThreadMappingId("thread-A");
    const initial: RemoteThreadState = {
      ...EMPTY_STATE,
      threadIds: ["thread-A"],
      threadIdMap: { "thread-A": mappingId },
      threadData: {
        [mappingId]: {
          id: "thread-A",
          remoteId: "thread-A",
          externalId: undefined,
          status: "regular",
          title: "A",
          initializeTask: Promise.resolve({
            remoteId: "thread-A",
            externalId: undefined,
          }),
        },
      },
    };

    const state = new OptimisticState<RemoteThreadState>(initial);

    const listDeferred = deferred<ListResult>();
    const archiveDeferred = deferred<void>();

    // 1. list() starts
    const listPromise = state.optimisticUpdate({
      execute: () => listDeferred.promise,
      loading: (s) => ({ ...s, isLoading: true }),
      then: applyListResult,
    });

    // 2. archive starts
    const archivePromise = state.optimisticUpdate({
      execute: () => archiveDeferred.promise,
      optimistic: (s) => updateStatusReducer(s, "thread-A", "archived"),
    });

    // 3. archive resolves first
    archiveDeferred.resolve();
    await archivePromise;

    // 4. list resolves with stale data (thread-A as regular)
    listDeferred.resolve({
      threads: [{ remoteId: "thread-A", status: "regular", title: "A" }],
    });
    await listPromise;

    // Thread A should remain archived, NOT be reverted to regular
    expect(state.value.threadIds).not.toContain("thread-A");
    expect(state.value.archivedThreadIds).toContain("thread-A");
    expect(
      state.value.threadData[createThreadMappingId("thread-A")]?.status,
    ).toBe("archived");
  });

  it("threads NOT modified during list() are loaded normally", async () => {
    const state = new OptimisticState<RemoteThreadState>(EMPTY_STATE);

    const listDeferred = deferred<ListResult>();
    const deleteDeferred = deferred<void>();

    // 1. list() starts
    const listPromise = state.optimisticUpdate({
      execute: () => listDeferred.promise,
      loading: (s) => ({ ...s, isLoading: true }),
      then: applyListResult,
    });

    // 2. delete thread A (while list is in flight)
    const deletePromise = state.optimisticUpdate({
      execute: () => deleteDeferred.promise,
      optimistic: (s) => updateStatusReducer(s, "thread-A", "deleted"),
    });

    deleteDeferred.resolve();
    await deletePromise;

    // 3. list resolves with [A, B] — A should be filtered, B should load
    listDeferred.resolve({
      threads: [
        { remoteId: "thread-A", status: "regular", title: "A" },
        { remoteId: "thread-B", status: "regular", title: "B" },
      ],
    });
    await listPromise;

    expect(state.value.threadIds).toEqual(["thread-B"]);
    expect(state.value.threadIds).not.toContain("thread-A");
    expect(
      state.value.threadData[createThreadMappingId("thread-B")],
    ).toBeDefined();
  });

  it("list resolves before delete — no race, both work correctly", async () => {
    const state = new OptimisticState<RemoteThreadState>(EMPTY_STATE);

    const listDeferred = deferred<ListResult>();
    const deleteDeferred = deferred<void>();

    const listPromise = state.optimisticUpdate({
      execute: () => listDeferred.promise,
      loading: (s) => ({ ...s, isLoading: true }),
      then: applyListResult,
    });

    const deletePromise = state.optimisticUpdate({
      execute: () => deleteDeferred.promise,
      optimistic: (s) => updateStatusReducer(s, "thread-A", "deleted"),
    });

    // list resolves FIRST this time
    listDeferred.resolve({
      threads: [{ remoteId: "thread-A", status: "regular", title: "A" }],
    });
    await listPromise;

    // thread A is in base state now, but delete's optimistic still hides it
    expect(state.value.threadIds).not.toContain("thread-A");

    // delete resolves
    deleteDeferred.resolve();
    await deletePromise;

    // thread A is gone from both base and cached
    expect(state.value.threadIds).not.toContain("thread-A");
    expect(
      state.value.threadData[createThreadMappingId("thread-A")],
    ).toBeUndefined();
  });
});
