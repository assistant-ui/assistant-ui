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

type ListResult = Awaited<ReturnType<ReturnType<typeof makeAdapter>["list"]>>;

describe("RemoteThreadListThreadListRuntimeCore load race", () => {
  it("keeps a thread initialized during the list() flight at the top", async () => {
    const listDeferred = deferred<ListResult>();
    const adapter = makeAdapter({ list: vi.fn(() => listDeferred.promise) });
    const core = createCore(adapter);

    const loadPromise = core.getLoadThreadsPromise();

    await core.switchToNewThread();
    const newId = core.newThreadId!;
    await core.initialize(newId);
    expect(core.threadIds).toContain(newId);

    listDeferred.resolve({
      threads: [
        { status: "regular", remoteId: "t1", externalId: "t1", title: "One" },
      ],
    });
    await loadPromise;

    expect(core.getItemById(newId)?.status).toBe("regular");
    expect(core.threadIds[0]).toBe(newId);
    expect(core.threadIds).toContain("t1");
  });
});

describe("preserveMidLoadTransitions", () => {
  const stateWith = (
    data: {
      id: string;
      remoteId?: string;
      status: "new" | "regular" | "archived";
    }[],
    lists: { threadIds?: string[]; archivedThreadIds?: string[] } = {},
  ): RemoteThreadState => ({
    isLoading: false,
    isLoadingMore: false,
    cursor: undefined,
    newThreadId: undefined,
    threadIds: lists.threadIds ?? [],
    archivedThreadIds: lists.archivedThreadIds ?? [],
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
      { threadIds: ["t1"], archivedThreadIds: [] },
      new Map([["t1", "regular"]]),
    );
    expect(result.threadIds).toEqual([]);
  });

  it("does not duplicate a thread the response contains by remoteId", () => {
    const state = stateWith(
      [{ id: "local-1", remoteId: "remote-1", status: "regular" }],
      { threadIds: ["remote-1"] },
    );
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: ["local-1"], archivedThreadIds: [] },
      new Map(),
    );
    expect(result.threadIds).toEqual(["remote-1"]);
  });

  it("prepends a mid-flight transition ahead of listed threads", () => {
    const state = stateWith(
      [
        { id: "local-1", remoteId: "remote-1", status: "regular" },
        { id: "t1", remoteId: "t1", status: "regular" },
      ],
      { threadIds: ["t1"] },
    );
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: ["local-1", "t1"], archivedThreadIds: [] },
      new Map([
        ["local-1", "new"],
        ["t1", "regular"],
      ]),
    );
    expect(result.threadIds).toEqual(["local-1", "t1"]);
  });

  it("orders multiple rescued threads by their live pre-response order", () => {
    const state = stateWith(
      [
        { id: "local-1", remoteId: "remote-1", status: "regular" },
        { id: "local-2", remoteId: "remote-2", status: "regular" },
      ],
      { threadIds: ["t1"] },
    );
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: ["local-2", "local-1"], archivedThreadIds: [] },
      new Map(),
    );
    expect(result.threadIds).toEqual(["local-2", "local-1", "t1"]);
  });

  it("is not confused by integer-like ids enumerating out of order", () => {
    const state = stateWith([
      { id: "1", status: "regular" },
      { id: "2", status: "regular" },
    ]);
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: ["1", "2"], archivedThreadIds: [] },
      new Map(),
    );
    expect(result.threadIds).toEqual(["1", "2"]);
  });

  it("re-inserts an archived mid-flight transition", () => {
    const state = stateWith([
      { id: "local-1", remoteId: "remote-1", status: "archived" },
    ]);
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: [], archivedThreadIds: ["local-1"] },
      new Map([["local-1", "new"]]),
    );
    expect(result.archivedThreadIds).toEqual(["local-1"]);
  });
});
