import { describe, expect, it, vi } from "vitest";
import {
  createCore,
  deferred,
  makeAdapter,
  setStartThreadRuntime,
} from "./remote-thread-list-test-helpers";

const thread = (remoteId: string) => ({
  remoteId,
  externalId: remoteId,
  status: "regular" as const,
  title: remoteId,
});

describe("RemoteThreadList adapter changes", () => {
  it("clears the selected thread and cached data from the previous adapter", async () => {
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("thread-a")] }),
    });
    const listAdapterB = vi.fn(async () => ({
      threads: [thread("thread-b")],
    }));
    const adapterB = makeAdapter({ list: listAdapterB });
    const core = createCore(adapterA);
    const started: string[] = [];
    setStartThreadRuntime(core, async (id) => {
      started.push(id);
      return {};
    });

    await core.getLoadThreadsPromise();
    await core.switchToThread("thread-a");
    expect(core.getItemById(core.mainThreadId)?.remoteId).toBe("thread-a");

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });

    await core.getLoadThreadsPromise();
    expect(listAdapterB).toHaveBeenCalledTimes(1);
    expect(core.threadIds).toEqual(["thread-b"]);
    expect(core.getItemById("thread-a")).toBeUndefined();
    expect(core.getItemById(core.mainThreadId)?.remoteId).not.toBe("thread-a");
    expect(started).toContain(core.mainThreadId);

    await expect(core.rename("thread-a", "leaked")).rejects.toThrow(
      'Thread "thread-a" not found',
    );
    expect(adapterB.rename).not.toHaveBeenCalled();
  });

  it("clears loading when the replaced adapter's list never settles", async () => {
    const adapterA = makeAdapter({
      list: vi.fn(() => new Promise<never>(() => {})),
    });
    const adapterB = makeAdapter({
      list: vi.fn(async () => ({ threads: [thread("thread-b")] })),
    });
    const core = createCore(adapterA);

    void core.getLoadThreadsPromise();

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();

    expect(core.threadIds).toEqual(["thread-b"]);
    expect(core.isLoading).toBe(false);
  });

  it("does not resume an old adapter mutation through the new adapter", async () => {
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("thread-a")] }),
    });
    const adapterB = makeAdapter();
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    await core.switchToThread("thread-a");

    const runtimeStart = deferred<unknown>();
    setStartThreadRuntime(core, () => runtimeStart.promise);
    const archiveTask = core.archive("thread-a");

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    runtimeStart.resolve({});

    await expect(archiveTask).rejects.toThrow("adapter changed");
    expect(adapterA.archive).not.toHaveBeenCalled();
    expect(adapterB.archive).not.toHaveBeenCalled();
  });

  it("preserves an adapter failure that races an adapter change", async () => {
    const unarchiveRequest = deferred<void>();
    const adapterA = makeAdapter({
      list: async () => ({
        threads: [{ ...thread("thread-a"), status: "archived" as const }],
      }),
      unarchive: vi.fn(() => unarchiveRequest.promise),
    });
    const adapterB = makeAdapter();
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const unarchiveTask = core.unarchive("thread-a");
    await vi.waitFor(() => expect(adapterA.unarchive).toHaveBeenCalledOnce());

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    const failure = new Error("network error");
    unarchiveRequest.reject(failure);

    await expect(unarchiveTask).rejects.toBe(failure);
  });

  it("does not apply a late initialize to the replacement adapter state", async () => {
    const initializeRequest = deferred<{
      remoteId: string;
      externalId: string;
    }>();
    const adapterA = makeAdapter({
      list: async () => ({ threads: [] }),
      initialize: vi.fn(() => initializeRequest.promise),
    });
    const adapterB = makeAdapter();
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const localId = core.newThreadId;
    expect(localId).toBeDefined();
    const initializeTask = core.initialize(localId!);

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    initializeRequest.resolve({
      remoteId: "leaked",
      externalId: "leaked",
    });
    await expect(initializeTask).rejects.toThrow("adapter changed");
    expect(core.getItemById("leaked")).toBeUndefined();
    expect(core.threadIds).not.toContain("leaked");

    await core.getLoadThreadsPromise();
    expect(core.getItemById(core.mainThreadId)?.status).toBe("new");
    expect(core.getItemById(core.mainThreadId)?.remoteId).toBeUndefined();
    await expect(core.initialize(core.mainThreadId)).resolves.toEqual({
      remoteId: core.mainThreadId,
      externalId: core.mainThreadId,
    });
  });

  it("selects a controlled thread that arrives on the replacement page", async () => {
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("thread-a")] }),
    });
    const adapterB = makeAdapter({
      list: async () => ({ threads: [thread("thread-b")] }),
    });
    const core = createCore(adapterA, "thread-a");

    await core.getLoadThreadsPromise();
    core.__internal_load();
    await core.switchToThread("thread-a");

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
      threadId: "thread-b",
    });
    await core.getLoadThreadsPromise();

    expect(core.getItemById(core.mainThreadId)?.remoteId).toBe("thread-b");
  });

  it("keeps the unsent draft runtime across an empty-list adapter swap", async () => {
    const adapterA = makeAdapter();
    const adapterB = makeAdapter();
    const core = createCore(adapterA);
    const stopped: string[] = [];
    const hookManager = (
      core as unknown as {
        _hookManager: { stopThreadRuntime: (id: string) => void };
      }
    )._hookManager;
    const originalStop = hookManager.stopThreadRuntime.bind(hookManager);
    hookManager.stopThreadRuntime = (id: string) => {
      stopped.push(id);
      originalStop(id);
    };

    await core.getLoadThreadsPromise();
    const draftId = core.mainThreadId;
    expect(core.getItemById(draftId)?.status).toBe("new");

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();

    expect(core.mainThreadId).toBe(draftId);
    expect(core.getItemById(draftId)?.status).toBe("new");
    expect(stopped).not.toContain(draftId);
  });

  it("stops runtimes for threads missing from the replacement list", async () => {
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("thread-a")] }),
    });
    const adapterB = makeAdapter({
      list: async () => ({ threads: [thread("thread-b")] }),
    });
    const core = createCore(adapterA);
    const stopped: string[] = [];
    const hookManager = (
      core as unknown as {
        _hookManager: { stopThreadRuntime: (id: string) => void };
      }
    )._hookManager;
    const originalStop = hookManager.stopThreadRuntime.bind(hookManager);
    hookManager.stopThreadRuntime = (id: string) => {
      stopped.push(id);
      originalStop(id);
    };

    await core.getLoadThreadsPromise();
    await core.switchToThread("thread-a");

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();

    expect(core.getItemById("thread-a")).toBeUndefined();
    expect(stopped).toContain("thread-a");
    expect(stopped).not.toContain(core.mainThreadId);
  });

  it("does not reject when a controlled thread is missing from the replacement adapter", async () => {
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("thread-a")] }),
    });
    const adapterB = makeAdapter({
      list: async () => ({ threads: [thread("thread-b")] }),
      fetch: vi.fn(async () => {
        throw new Error("not found");
      }),
    });
    const core = createCore(adapterA, "thread-a");

    await core.getLoadThreadsPromise();
    await core.switchToThread("thread-a");

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
      threadId: "thread-a",
    });
    await expect(core.getLoadThreadsPromise()).resolves.toBeUndefined();
    await vi.waitFor(() => {
      expect(adapterB.fetch).toHaveBeenCalledWith("thread-a");
    });
    expect(core.getItemById("thread-a")).toBeUndefined();
    expect(core.getItemById(core.mainThreadId)?.status).toBe("new");
  });

  it("reuses the preserved unsent draft when the selected thread is missing after swap", async () => {
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("thread-a")] }),
    });
    const adapterB = makeAdapter({
      list: async () => ({ threads: [thread("thread-b")] }),
    });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const draftId = core.newThreadId;
    expect(draftId).toBeDefined();
    await core.switchToThread("thread-a");
    expect(core.mainThreadId).toBe("thread-a");
    expect(core.newThreadId).toBe(draftId);

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();

    expect(core.mainThreadId).toBe(draftId);
    expect(core.newThreadId).toBe(draftId);
    expect(core.getItemById(draftId!)?.status).toBe("new");
    expect(
      Object.values(core.threadItems).filter((item) => item.status === "new"),
    ).toHaveLength(1);
  });

  it("does not send a rename through the replacement adapter while its list is pending", async () => {
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("thread-a")] }),
    });
    const listB = deferred<{ threads: ReturnType<typeof thread>[] }>();
    const adapterB = makeAdapter({
      list: vi.fn(() => listB.promise),
    });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    await core.switchToThread("thread-a");

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await expect(core.rename("thread-a", "leaked")).rejects.toThrow(
      "adapter changed",
    );
    await expect(core.switchToThread("thread-a")).rejects.toThrow(
      "adapter changed",
    );
    expect(adapterB.rename).not.toHaveBeenCalled();

    listB.resolve({ threads: [thread("thread-b")] });
    await core.getLoadThreadsPromise();
    expect(adapterB.rename).not.toHaveBeenCalled();
    expect(core.getItemById("thread-a")).toBeUndefined();
  });

  it("does not freeze mutations when the replacement list fails", async () => {
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("thread-a")] }),
    });
    const adapterB = makeAdapter({
      list: vi.fn(async () => {
        throw new Error("network");
      }),
    });
    const core = createCore(adapterA);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await core.getLoadThreadsPromise();
    await core.switchToThread("thread-a");

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();

    expect(core.getItemById("thread-a")).toBeUndefined();
    expect(core.getItemById(core.mainThreadId)?.status).toBe("new");
    await expect(core.switchToNewThread()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps a thread initialized while the replacement list is pending", async () => {
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("thread-a")] }),
    });
    const listB = deferred<{ threads: ReturnType<typeof thread>[] }>();
    const adapterB = makeAdapter({
      list: vi.fn(() => listB.promise),
      initialize: vi.fn(async () => ({
        remoteId: "created-on-b",
        externalId: "created-on-b",
      })),
    });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const draftId = core.newThreadId;
    expect(draftId).toBeDefined();

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await expect(core.initialize(draftId!)).resolves.toEqual({
      remoteId: "created-on-b",
      externalId: "created-on-b",
    });

    listB.resolve({ threads: [thread("thread-b")] });
    await core.getLoadThreadsPromise();

    expect(core.getItemById(draftId!)?.remoteId).toBe("created-on-b");
    expect(core.mainThreadId).toBe(draftId);
    expect(core.threadIds).toContain("created-on-b");
  });
});
