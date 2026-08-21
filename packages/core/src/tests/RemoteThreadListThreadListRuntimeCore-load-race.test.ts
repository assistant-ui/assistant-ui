import { describe, it, expect, vi } from "vitest";
import {
  createCore,
  makeAdapter,
  deferred,
} from "./remote-thread-list-test-helpers";
import {
  preserveMidLoadTransitions,
  createThreadMappingId,
  type RemoteThreadState,
} from "../runtimes/remote-thread-list/remote-thread-state";

describe("RemoteThreadListThreadListRuntimeCore load race", () => {
  it("keeps a thread initialized during the list() flight", async () => {
    const listDeferred = deferred<{ threads: never[] }>();
    const adapter = makeAdapter({ list: vi.fn(() => listDeferred.promise) });
    const core = createCore(adapter);

    const loadPromise = core.getLoadThreadsPromise();

    await core.switchToNewThread();
    const newId = core.newThreadId!;
    await core.initialize(newId);
    expect(core.threadIds).toContain(newId);

    listDeferred.resolve({ threads: [] });
    await loadPromise;

    expect(core.getItemById(newId)?.status).toBe("regular");
    expect(core.threadIds).toContain(newId);
  });
});

describe("preserveMidLoadTransitions", () => {
  const stateWith = (
    data: {
      id: string;
      remoteId?: string;
      status: "new" | "regular" | "archived";
    }[],
  ): RemoteThreadState => ({
    isLoading: false,
    isLoadingMore: false,
    cursor: undefined,
    newThreadId: undefined,
    threadIds: [],
    archivedThreadIds: [],
    threadIdMap: Object.fromEntries(
      data.map((d) => [d.id, createThreadMappingId(d.id)]),
    ),
    threadData: Object.fromEntries(
      data.map((d) => [
        createThreadMappingId(d.id),
        {
          id: d.id,
          remoteId: d.remoteId,
          externalId: undefined,
          status: d.status,
          initializeTask: Promise.resolve({
            remoteId: d.remoteId ?? d.id,
            externalId: undefined,
          }),
        },
      ]),
    ) as RemoteThreadState["threadData"],
  });

  it("does not resurrect a thread the server already knew and omitted", () => {
    const state = stateWith([{ id: "t1", remoteId: "t1", status: "regular" }]);
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: [], archivedThreadIds: [] },
      new Map([["t1", "regular"]]),
    );
    expect(result.threadIds).toEqual([]);
  });

  it("does not duplicate a thread the response contains by remoteId", () => {
    const state = stateWith([
      { id: "local-1", remoteId: "remote-1", status: "regular" },
    ]);
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: ["remote-1"], archivedThreadIds: [] },
      new Map(),
    );
    expect(result.threadIds).toEqual(["remote-1"]);
  });

  it("re-appends an archived mid-flight transition", () => {
    const state = stateWith([
      { id: "local-1", remoteId: "remote-1", status: "archived" },
    ]);
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: [], archivedThreadIds: [] },
      new Map([["local-1", "new"]]),
    );
    expect(result.archivedThreadIds).toEqual(["local-1"]);
  });
});
