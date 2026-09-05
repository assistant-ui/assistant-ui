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

  it("keeps one slot when the list reports the thread just initialized", async () => {
    const listDeferred = deferred<ListResult>();
    const adapter = makeAdapter({
      list: vi.fn(() => listDeferred.promise),
      initialize: vi.fn(async () => ({
        remoteId: "remote-1",
        externalId: "remote-1",
      })),
    });
    const core = createCore(adapter);

    const loadPromise = core.getLoadThreadsPromise();
    await core.switchToNewThread();
    const localId = core.newThreadId!;
    await core.initialize(localId);

    listDeferred.resolve({
      threads: [
        { status: "regular", remoteId: "remote-1", externalId: "remote-1" },
      ],
    });
    await loadPromise;

    expect(Object.keys(core.threadItems)).toEqual([localId]);
    expect(core.threadIds).toEqual([localId]);
    expect(core.getItemById("remote-1")?.id).toBe(localId);
    expect(core.mainThreadId).toBe(localId);

    await core.delete("remote-1");

    expect(core.getItemById(localId)).toBeUndefined();
    expect(core.getItemById("remote-1")).toBeUndefined();
    expect(core.threadIds).toEqual([]);
  });

  it("collapses a slot the list minted while initialize was in flight", async () => {
    const listDeferred = deferred<ListResult>();
    const initializeDeferred = deferred<{
      remoteId: string;
      externalId: string;
    }>();
    const adapter = makeAdapter({
      list: vi.fn(() => listDeferred.promise),
      initialize: vi.fn(() => initializeDeferred.promise),
    });
    const core = createCore(adapter);

    const loadPromise = core.getLoadThreadsPromise();
    await core.switchToNewThread();
    const localId = core.newThreadId!;
    const initializePromise = core.initialize(localId);

    listDeferred.resolve({
      threads: [
        { status: "regular", remoteId: "remote-1", externalId: "remote-1" },
      ],
    });
    await loadPromise;

    initializeDeferred.resolve({
      remoteId: "remote-1",
      externalId: "remote-1",
    });
    await initializePromise;

    expect(Object.keys(core.threadItems)).toEqual([localId]);
    expect(core.threadIds).toEqual([localId]);
    expect(core.getItemById("remote-1")?.id).toBe(localId);

    await core.delete("remote-1");

    expect(core.getItemById(localId)).toBeUndefined();
    expect(core.getItemById("remote-1")).toBeUndefined();
    expect(core.threadIds).toEqual([]);
  });

  it("does not leave the collapsed slot in both lists when the race reported it archived", async () => {
    const listDeferred = deferred<ListResult>();
    const initializeDeferred = deferred<{
      remoteId: string;
      externalId: string;
    }>();
    const adapter = makeAdapter({
      list: vi.fn(() => listDeferred.promise),
      initialize: vi.fn(() => initializeDeferred.promise),
    });
    const core = createCore(adapter);

    const loadPromise = core.getLoadThreadsPromise();
    await core.switchToNewThread();
    const localId = core.newThreadId!;
    const initializePromise = core.initialize(localId);

    listDeferred.resolve({
      threads: [
        { status: "archived", remoteId: "remote-1", externalId: "remote-1" },
      ],
    });
    await loadPromise;

    initializeDeferred.resolve({
      remoteId: "remote-1",
      externalId: "remote-1",
    });
    await initializePromise;

    expect(Object.keys(core.threadItems)).toEqual([localId]);
    expect(core.threadIds).toEqual([localId]);
    expect(core.archivedThreadIds).toEqual([]);
  });
});

describe("preserveMidLoadTransitions", () => {
  const stateWith = (
    data: {
      id: string;
      remoteId?: string;
      status: "new" | "regular" | "archived";
      localOrigin?: true;
    }[],
    lists: { threadIds?: string[]; archivedThreadIds?: string[] } = {},
  ): RemoteThreadState => ({
    isLoading: false,
    loadError: undefined,
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
          ...(d.localOrigin ? { localOrigin: true as const } : {}),
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
      [
        {
          id: "__LOCALID_1",
          remoteId: "remote-1",
          status: "regular",
          localOrigin: true,
        },
      ],
      { threadIds: ["remote-1"] },
    );
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: ["__LOCALID_1"], archivedThreadIds: [] },
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
        {
          id: "__LOCALID_1",
          remoteId: "remote-1",
          status: "regular",
          localOrigin: true,
        },
        {
          id: "__LOCALID_2",
          remoteId: "remote-2",
          status: "regular",
          localOrigin: true,
        },
      ],
      { threadIds: ["t1"] },
    );
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: ["__LOCALID_2", "__LOCALID_1"], archivedThreadIds: [] },
      new Map(),
    );
    expect(result.threadIds).toEqual(["__LOCALID_2", "__LOCALID_1", "t1"]);
  });

  it("leaves a fetched non-local thread governed by the response", () => {
    const state = stateWith([{ id: "t9", remoteId: "t9", status: "regular" }], {
      threadIds: ["t1"],
    });
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: ["t1", "t9"], archivedThreadIds: [] },
      new Map(),
    );
    expect(result.threadIds).toEqual(["t1"]);
  });

  it("does not trust a remote id that mimics the local prefix", () => {
    const state = stateWith(
      [{ id: "__LOCALID_evil", remoteId: "__LOCALID_evil", status: "regular" }],
      { threadIds: ["t1"] },
    );
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: ["t1", "__LOCALID_evil"], archivedThreadIds: [] },
      new Map(),
    );
    expect(result.threadIds).toEqual(["t1"]);
  });

  it("re-inserts an archived mid-flight transition", () => {
    const state = stateWith([
      {
        id: "__LOCALID_1",
        remoteId: "remote-1",
        status: "archived",
        localOrigin: true,
      },
    ]);
    const result = preserveMidLoadTransitions(
      state,
      { threadIds: [], archivedThreadIds: ["__LOCALID_1"] },
      new Map([["__LOCALID_1", "new"]]),
    );
    expect(result.archivedThreadIds).toEqual(["__LOCALID_1"]);
  });
});
