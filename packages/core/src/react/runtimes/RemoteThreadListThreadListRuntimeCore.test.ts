import { describe, expect, it, vi } from "vitest";
import type {
  RemoteThreadListAdapter,
  RemoteThreadMetadata,
} from "../../runtimes/remote-thread-list/types";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const makeThread = (remoteId: string): RemoteThreadMetadata => ({
  status: "regular",
  remoteId,
});

const makeAdapter = (
  threads: RemoteThreadMetadata[],
  overrides: Partial<RemoteThreadListAdapter> = {},
) =>
  ({
    list: vi.fn(async () => ({ threads })),
    rename: vi.fn(async () => {}),
    archive: vi.fn(async () => {}),
    unarchive: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    initialize: vi.fn(async (threadId: string) => ({ remoteId: threadId })),
    generateTitle: vi.fn(async () => {
      throw new Error("not used in this test");
    }),
    fetch: vi.fn(async (threadId: string) => makeThread(threadId)),
    ...overrides,
  }) satisfies RemoteThreadListAdapter;

const makeOptions = (adapter: RemoteThreadListAdapter) => ({
  adapter,
  runtimeHook: () => {
    throw new Error("Runtime hook should not render during this test");
  },
});

const makeCore = (adapter: RemoteThreadListAdapter) => {
  const core = new RemoteThreadListThreadListRuntimeCore(makeOptions(adapter), {
    getModelContext: () => ({}),
  });
  (
    core as unknown as {
      _hookManager: {
        startThreadRuntime: (id: string) => Promise<unknown>;
      };
    }
  )._hookManager.startThreadRuntime = async () => ({});
  return core;
};

describe("RemoteThreadListThreadListRuntimeCore adapter replacement", () => {
  it("prunes inactive threads from the previous adapter after listing", async () => {
    const adapterA = makeAdapter([
      makeThread("active-thread"),
      makeThread("account-a-thread"),
    ]);
    const adapterB = makeAdapter([makeThread("account-b-thread")]);
    const core = makeCore(adapterA);

    await core.getLoadThreadsPromise();
    await core.switchToThread("active-thread");
    expect(core.getItemById("account-a-thread")).toBeDefined();
    const mainThreadId = core.mainThreadId;

    core.__internal_setOptions(makeOptions(adapterB));
    expect(core.mainThreadId).toBe(mainThreadId);
    await core.getLoadThreadsPromise();

    expect(core.threadIds).toEqual(["account-b-thread"]);
    expect(core.getItemById("account-a-thread")).toBeUndefined();
    expect(core.getItemById("active-thread")).toBeDefined();
    expect(core.mainThreadId).toBe(mainThreadId);
  });

  it("ignores a thread fetched by the previous adapter after replacement", async () => {
    const fetchRequest = deferred<RemoteThreadMetadata>();
    const adapterA = makeAdapter([], {
      fetch: vi.fn(() => fetchRequest.promise),
    });
    const adapterB = makeAdapter([]);
    const core = makeCore(adapterA);

    const switchTask = core.switchToThread("account-a-thread");
    core.__internal_setOptions(makeOptions(adapterB));
    fetchRequest.resolve(makeThread("account-a-thread"));
    await switchTask;

    expect(core.getItemById("account-a-thread")).toBeUndefined();
    expect(adapterB.fetch).not.toHaveBeenCalled();
  });

  it("keeps the local runtime id when the active thread appears in the new list", async () => {
    const adapterA = makeAdapter([], {
      initialize: vi.fn(async () => ({ remoteId: "active-remote" })),
    });
    const adapterB = makeAdapter([makeThread("active-remote")]);
    const core = makeCore(adapterA);

    await core.switchToNewThread();
    const localId = core.mainThreadId;
    await core.initialize(localId);

    core.__internal_setOptions(makeOptions(adapterB));
    await core.getLoadThreadsPromise();

    expect(core.mainThreadId).toBe(localId);
    expect(core.getItemById(localId)?.id).toBe(localId);
    expect(core.getItemById("active-remote")?.id).toBe(localId);
  });

  it("finishes an in-flight mutation through its originating adapter", async () => {
    const adapterA = makeAdapter([makeThread("account-a-thread")]);
    const adapterB = makeAdapter([]);
    const core = makeCore(adapterA);
    await core.getLoadThreadsPromise();

    const renameTask = core.rename("account-a-thread", "Renamed");
    core.__internal_setOptions(makeOptions(adapterB));
    await renameTask;
    await core.getLoadThreadsPromise();

    expect(adapterA.rename).toHaveBeenCalledWith("account-a-thread", "Renamed");
    expect(adapterB.rename).not.toHaveBeenCalled();
    expect(core.getItemById("account-a-thread")).toBeUndefined();
  });
});
