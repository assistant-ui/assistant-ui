import { describe, it, expect, vi } from "vitest";
import { OptimisticState } from "../runtimes/remote-thread-list/optimistic-state";
import {
  type RemoteThreadState,
  createThreadMappingId,
  updateStatusReducer,
  getThreadData,
} from "../runtimes/remote-thread-list/remote-thread-state";

/**
 * This test reproduces the crash from issue #3346:
 * "Entry not available in the store" when deleting the active thread.
 *
 * Root cause: optimisticUpdate's `optimistic` callback runs synchronously
 * and removes the thread from threadData, but mainThreadId still points to
 * the deleted thread. Subscribers that fire during _notifySubscribers() see
 * this inconsistent state and crash.
 */

const createThreadState = (
  threadId: string,
  status: "regular" | "archived" = "regular",
): RemoteThreadState => {
  const mappingId = createThreadMappingId(threadId);
  return {
    isLoading: false,
    newThreadId: undefined,
    threadIds: status === "regular" ? [threadId] : [],
    archivedThreadIds: status === "archived" ? [threadId] : [],
    threadIdMap: { [threadId]: mappingId },
    threadData: {
      [mappingId]: {
        id: threadId,
        remoteId: threadId,
        externalId: undefined,
        status,
        title: undefined,
        initializeTask: Promise.resolve({
          remoteId: threadId,
          externalId: undefined,
        }),
      },
    },
  };
};

describe("OptimisticState delete crash (#3346)", () => {
  it("optimistic callback runs synchronously before execute completes", async () => {
    const state = new OptimisticState(createThreadState("thread-1"));
    const events: string[] = [];

    state.subscribe(() => {
      events.push("subscriber-notified");
    });

    const executeStarted = vi.fn();
    const executeCompleted = vi.fn();

    const promise = state.optimisticUpdate({
      execute: async () => {
        executeStarted();
        // simulate async work like _ensureThreadIsNotMain
        await Promise.resolve();
        executeCompleted();
      },
      optimistic: (s) => {
        events.push("optimistic-ran");
        return updateStatusReducer(s, "thread-1", "deleted");
      },
    });

    // After calling optimisticUpdate but before awaiting:
    // - optimistic callback has already run (synchronous)
    // - execute has started but not completed (async)
    expect(events).toEqual(["optimistic-ran", "subscriber-notified"]);
    expect(executeStarted).toHaveBeenCalled();
    expect(executeCompleted).not.toHaveBeenCalled();

    // Thread data is already gone from the optimistic value
    expect(getThreadData(state.value, "thread-1")).toBeUndefined();

    await promise;
  });

  it("BUG SCENARIO: subscriber sees deleted thread data while mainThreadId still references it", async () => {
    const state = new OptimisticState(createThreadState("thread-1"));

    // Simulate what happens in the real code:
    // mainThreadId is external state that _ensureThreadIsNotMain would update
    let mainThreadId = "thread-1";
    let subscriberSawInconsistentState = false;

    state.subscribe(() => {
      // This fires synchronously during optimisticUpdate.
      // In the real code, React components would re-render here and try to
      // access the main thread's data.
      const threadData = getThreadData(state.value, mainThreadId);
      if (threadData === undefined && mainThreadId === "thread-1") {
        // mainThreadId points to a deleted thread — this is the crash condition
        subscriberSawInconsistentState = true;
      }
    });

    // OLD CODE: _ensureThreadIsNotMain inside execute
    // The optimistic callback deletes thread data BEFORE execute can update mainThreadId
    const promise = state.optimisticUpdate({
      execute: async () => {
        // In old code, _ensureThreadIsNotMain was here.
        // It would switch mainThreadId, but this runs AFTER optimistic callback
        await Promise.resolve();
        mainThreadId = "thread-2"; // too late — subscriber already fired
      },
      optimistic: (s) => {
        return updateStatusReducer(s, "thread-1", "deleted");
      },
    });

    // The subscriber saw inconsistent state — mainThreadId points to deleted thread
    expect(subscriberSawInconsistentState).toBe(true);

    await promise;
  });

  it("FIX: switching mainThreadId before optimisticUpdate prevents inconsistency", async () => {
    const state = new OptimisticState(createThreadState("thread-1"));

    let mainThreadId = "thread-1";
    let subscriberSawInconsistentState = false;

    state.subscribe(() => {
      const threadData = getThreadData(state.value, mainThreadId);
      if (threadData === undefined) {
        subscriberSawInconsistentState = true;
      }
    });

    // FIX: _ensureThreadIsNotMain runs BEFORE optimisticUpdate.
    // switchToNewThread() both creates the new thread in state AND updates mainThreadId.
    const newThreadId = "thread-2";
    const mappingId = createThreadMappingId(newThreadId);
    const currentState = state.value;
    state.update({
      ...currentState,
      newThreadId: newThreadId,
      threadIdMap: {
        ...currentState.threadIdMap,
        [newThreadId]: mappingId,
      },
      threadData: {
        ...currentState.threadData,
        [mappingId]: {
          status: "new" as const,
          id: newThreadId,
          remoteId: undefined,
          externalId: undefined,
          title: undefined,
        },
      },
    });
    mainThreadId = newThreadId;

    // Reset flag — the state.update above triggered the subscriber
    subscriberSawInconsistentState = false;

    const promise = state.optimisticUpdate({
      execute: async () => {
        // _ensureThreadIsNotMain no longer here
        return undefined;
      },
      optimistic: (s) => {
        return updateStatusReducer(s, "thread-1", "deleted");
      },
    });

    // mainThreadId was already switched to thread-2 which exists in state
    // — subscriber sees consistent state, no crash
    expect(subscriberSawInconsistentState).toBe(false);

    await promise;
  });

  it("archive does NOT remove threadData (no crash even without fix)", () => {
    const state = new OptimisticState(createThreadState("thread-1"));

    let threadDataMissingDuringNotify = false;

    state.subscribe(() => {
      const threadData = getThreadData(state.value, "thread-1");
      if (threadData === undefined) {
        threadDataMissingDuringNotify = true;
      }
    });

    state.optimisticUpdate({
      execute: async () => undefined,
      optimistic: (s) => {
        return updateStatusReducer(s, "thread-1", "archived");
      },
    });

    // Archive keeps threadData — no SKIP_UPDATE, no crash
    expect(threadDataMissingDuringNotify).toBe(false);
    expect(getThreadData(state.value, "thread-1")).toBeDefined();
    expect(getThreadData(state.value, "thread-1")?.status).toBe("archived");
  });
});
