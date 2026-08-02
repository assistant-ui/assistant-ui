import { describe, expect, it, vi } from "vitest";
import type {
  RemoteThreadListAdapter,
  RemoteThreadMetadata,
} from "../../runtimes/remote-thread-list/types";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const makeThread = (
  remoteId: string,
  status: "regular" | "archived" = "regular",
): RemoteThreadMetadata => ({
  status,
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
  it("replaces the active thread and prunes previous adapter data", async () => {
    const adapterA = makeAdapter([
      makeThread("active-thread"),
      makeThread("account-a-thread"),
    ]);
    const adapterB = makeAdapter([makeThread("account-b-thread")]);
    const core = makeCore(adapterA);

    await core.getLoadThreadsPromise();
    core.__internal_load();
    await core.switchToThread("active-thread");
    expect(core.getItemById("account-a-thread")).toBeDefined();
    const mainThreadId = core.mainThreadId;

    core.__internal_setOptions(makeOptions(adapterB));
    expect(core.mainThreadId).not.toBe(mainThreadId);
    await core.getLoadThreadsPromise();

    expect(core.threadIds).toEqual(["account-b-thread"]);
    expect(core.getItemById("account-a-thread")).toBeUndefined();
    expect(core.getItemById("active-thread")).toBeUndefined();
    expect(core.getItemById(core.mainThreadId)?.status).toBe("new");
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

  it("keeps the local runtime id when the active thread appears in a refreshed list", async () => {
    let listedThreads: RemoteThreadMetadata[] = [];
    const adapter = makeAdapter([], {
      list: vi.fn(async () => ({ threads: listedThreads })),
      initialize: vi.fn(async () => ({ remoteId: "active-remote" })),
    });
    const core = makeCore(adapter);

    await core.switchToNewThread();
    const localId = core.mainThreadId;
    await core.initialize(localId);

    listedThreads = [makeThread("active-remote")];
    await core.reload();

    expect(core.mainThreadId).toBe(localId);
    expect(core.getItemById(localId)?.id).toBe(localId);
    expect(core.getItemById("active-remote")?.id).toBe(localId);
    expect(core.threadIds).toEqual([localId]);

    await core.archive("active-remote");
    expect(core.threadIds).toEqual([]);
    expect(core.archivedThreadIds).toEqual([localId]);

    await core.delete("active-remote");
    expect(core.archivedThreadIds).toEqual([]);
    expect(core.getItemById(localId)).toBeUndefined();
    expect(core.getItemById("active-remote")).toBeUndefined();
  });

  it("ignores initialization completed by the previous adapter", async () => {
    const initializeRequest = deferred<{ remoteId: string }>();
    const adapterA = makeAdapter([], {
      initialize: vi.fn(() => initializeRequest.promise),
    });
    const adapterB = makeAdapter([]);
    const core = makeCore(adapterA);
    core.__internal_load();

    const previousThreadId = core.mainThreadId;
    const initializeTask = core.initialize(previousThreadId);
    core.__internal_setOptions(makeOptions(adapterB));

    initializeRequest.resolve({ remoteId: "account-a-thread" });
    await initializeTask;

    expect(core.mainThreadId).not.toBe(previousThreadId);
    expect(core.getItemById("account-a-thread")).toBeUndefined();
    expect(core.getItemById(core.mainThreadId)?.status).toBe("new");
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

  it("does not navigate the new adapter after an old unarchive fails", async () => {
    const unarchiveRequest = deferred<void>();
    const adapterA = makeAdapter([makeThread("shared-thread", "archived")], {
      unarchive: vi.fn(() => unarchiveRequest.promise),
    });
    const adapterB = makeAdapter([makeThread("shared-thread")]);
    const core = makeCore(adapterA);
    await core.getLoadThreadsPromise();

    const unarchiveTask = core.unarchive("shared-thread");
    core.__internal_setOptions(makeOptions(adapterB));
    await core.getLoadThreadsPromise();
    await core.switchToThread("shared-thread", { unarchive: false });
    const mainThreadId = core.mainThreadId;

    unarchiveRequest.reject(new Error("old adapter failed"));
    await expect(unarchiveTask).rejects.toThrow("old adapter failed");

    expect(core.mainThreadId).toBe(mainThreadId);
  });

  it("stops unarchive cleanup when the adapter changes during its fallback switch", async () => {
    const unarchiveRequest = deferred<void>();
    const fallbackStart = deferred<unknown>();
    const adapterA = makeAdapter([makeThread("shared-thread", "archived")], {
      unarchive: vi.fn(() => unarchiveRequest.promise),
    });
    const adapterB = makeAdapter([makeThread("shared-thread")]);
    const core = makeCore(adapterA);
    await core.getLoadThreadsPromise();
    core.__internal_load();
    await core.switchToThread("shared-thread", { unarchive: false });

    const startThreadRuntime = vi.fn(async (threadId: string) => {
      if (threadId.startsWith("__LOCALID_")) return fallbackStart.promise;
      return {};
    });
    (
      core as unknown as {
        _hookManager: {
          startThreadRuntime: (id: string) => Promise<unknown>;
        };
      }
    )._hookManager.startThreadRuntime = startThreadRuntime;

    const unarchiveTask = core.unarchive("shared-thread");
    const rejected =
      expect(unarchiveTask).rejects.toThrow("old adapter failed");
    unarchiveRequest.reject(new Error("old adapter failed"));
    await vi.waitFor(() => {
      expect(startThreadRuntime).toHaveBeenCalledWith(
        expect.stringMatching(/^__LOCALID_/),
      );
    });

    core.__internal_setOptions({
      ...makeOptions(adapterB),
      threadId: "shared-thread",
    });
    await vi.waitFor(() => {
      expect(core.mainThreadId).toBe("shared-thread");
    });

    fallbackStart.resolve({});
    await rejected;
    expect(core.mainThreadId).toBe("shared-thread");
  });
});
