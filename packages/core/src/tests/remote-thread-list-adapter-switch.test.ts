import { describe, expect, it, onTestFinished, vi } from "vitest";
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

  it("keeps stopping the threads missing from the replacement list when one stop throws", async () => {
    const adapterA = makeAdapter({
      list: async () => ({
        threads: [thread("thread-a"), thread("thread-c")],
      }),
    });
    const adapterB = makeAdapter({
      list: async () => ({ threads: [thread("thread-b")] }),
    });
    const core = createCore(adapterA);
    const stopped: string[] = [];
    const error = new Error("cleanup failed");
    const hookManager = (
      core as unknown as {
        _hookManager: { stopThreadRuntime: (id: string) => void };
      }
    )._hookManager;
    const originalStop = hookManager.stopThreadRuntime.bind(hookManager);
    hookManager.stopThreadRuntime = (id: string) => {
      stopped.push(id);
      originalStop(id);
      if (stopped.length === 1) throw error;
    };
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());

    await core.getLoadThreadsPromise();
    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();

    expect(stopped).toEqual(expect.arrayContaining(["thread-a", "thread-c"]));
    expect(core.getItemById("thread-a")).toBeUndefined();
    expect(core.getItemById("thread-b")).toBeDefined();
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Thread runtime cleanup threw while stopping a thread",
      error,
    );
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
    expect(core.threadIds).toContain(draftId);
    expect(core.getItemById("created-on-b")?.id).toBe(draftId);
  });

  it("keeps one slot when the replacement list already carries the initialized thread", async () => {
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

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.initialize(draftId!);

    listB.resolve({
      threads: [thread("created-on-b"), thread("thread-b")],
    });
    await core.getLoadThreadsPromise();

    expect(
      Object.values(core.threadItems).filter(
        (item) => item.remoteId === "created-on-b",
      ),
    ).toHaveLength(1);
    expect(core.threadIds).toEqual([draftId, "thread-b"]);
    expect(core.getItemById("created-on-b")?.id).toBe(draftId);

    await core.delete("created-on-b");

    expect(core.getItemById("created-on-b")).toBeUndefined();
    expect(core.getItemById(draftId!)).toBeUndefined();
    expect(core.threadIds).toEqual(["thread-b"]);
  });

  it("keeps the replacement's thread when an old deletion of a listed thread with the same id settles", async () => {
    const deleteRequest = deferred<void>();
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("same")] }),
      delete: vi.fn(() => deleteRequest.promise),
    });
    const adapterB = makeAdapter({
      list: async () => ({ threads: [thread("same")] }),
    });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const deleteTask = core.delete("same");
    await vi.waitFor(() => expect(adapterA.delete).toHaveBeenCalledOnce());

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();
    expect(core.threadIds).toEqual(["same"]);

    deleteRequest.resolve();
    await deleteTask;

    expect(core.threadIds).toEqual(["same"]);
  });

  it("keeps the replacement's thread listed when an old archive of the same id settles", async () => {
    const archiveRequest = deferred<void>();
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("same")] }),
      archive: vi.fn(() => archiveRequest.promise),
    });
    const adapterB = makeAdapter({
      list: async () => ({ threads: [thread("same")] }),
    });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const archiveTask = core.archive("same");
    await vi.waitFor(() => expect(adapterA.archive).toHaveBeenCalledOnce());

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();
    archiveRequest.resolve();
    await archiveTask;

    expect(core.threadIds).toEqual(["same"]);
    expect(core.archivedThreadIds).toEqual([]);
  });

  it("keeps the replacement's thread archived when an old unarchive of the same id settles", async () => {
    const unarchiveRequest = deferred<void>();
    const archived = { ...thread("same"), status: "archived" as const };
    const adapterA = makeAdapter({
      list: async () => ({ threads: [archived] }),
      unarchive: vi.fn(() => unarchiveRequest.promise),
    });
    const adapterB = makeAdapter({
      list: async () => ({ threads: [archived] }),
    });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const unarchiveTask = core.unarchive("same");
    await vi.waitFor(() => expect(adapterA.unarchive).toHaveBeenCalledOnce());

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();
    unarchiveRequest.resolve();
    await unarchiveTask;

    expect(core.threadIds).toEqual([]);
    expect(core.archivedThreadIds).toEqual(["same"]);
  });

  it("keeps the replacement's title when an old rename of the same id settles", async () => {
    const renameRequest = deferred<void>();
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("same")] }),
      rename: vi.fn(() => renameRequest.promise),
    });
    const adapterB = makeAdapter({
      list: async () => ({ threads: [{ ...thread("same"), title: "B" }] }),
    });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const renameTask = core.rename("same", "A");
    await vi.waitFor(() => expect(adapterA.rename).toHaveBeenCalledOnce());

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();
    expect(core.getItemById("same")?.title).toBe("B");

    renameRequest.resolve();
    await renameTask;

    expect(core.getItemById("same")?.title).toBe("B");
  });

  it("keeps the replacement's custom metadata when an old update of the same id settles", async () => {
    const updateRequest = deferred<void>();
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("same")] }),
      updateCustom: vi.fn(() => updateRequest.promise),
    });
    const adapterB = makeAdapter({
      list: async () => ({
        threads: [{ ...thread("same"), custom: { owner: "B" } }],
      }),
    });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const updateTask = core.updateCustom("same", { owner: "A" });
    await vi.waitFor(() =>
      expect(adapterA.updateCustom).toHaveBeenCalledOnce(),
    );

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();
    expect(core.getItemById("same")?.custom).toEqual({ owner: "B" });

    updateRequest.resolve();
    await updateTask;

    expect(core.getItemById("same")?.custom).toEqual({ owner: "B" });
  });

  it("keeps a thread deleted before an adapter swap hidden until the replacement list lands", async () => {
    const deleteRequest = deferred<void>();
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("same"), thread("other")] }),
      delete: vi.fn(() => deleteRequest.promise),
    });
    const listB = deferred<{ threads: ReturnType<typeof thread>[] }>();
    const adapterB = makeAdapter({ list: vi.fn(() => listB.promise) });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const deleteTask = core.delete("same");
    await vi.waitFor(() => expect(adapterA.delete).toHaveBeenCalledOnce());

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    const loading = core.getLoadThreadsPromise();
    expect(core.threadIds).toEqual(["other"]);

    deleteRequest.resolve();
    await deleteTask;
    expect(core.threadIds).toEqual(["other"]);

    listB.resolve({ threads: [thread("same")] });
    await loading;

    expect(core.threadIds).toEqual(["same"]);
  });

  it("keeps a listed thread deleted when the adapter swaps away and back before the deletion settles", async () => {
    const deleteRequest = deferred<void>();
    const staleList = deferred<{ threads: ReturnType<typeof thread>[] }>();
    const list = vi
      .fn()
      .mockResolvedValueOnce({ threads: [thread("same")] })
      .mockReturnValueOnce(staleList.promise);
    const adapterA = makeAdapter({
      list,
      delete: vi.fn(() => deleteRequest.promise),
    });
    const adapterB = makeAdapter();
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const deleteTask = core.delete("same");
    await vi.waitFor(() => expect(adapterA.delete).toHaveBeenCalledOnce());

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();
    core.__internal_setOptions({
      adapter: adapterA,
      runtimeHook: () => ({}) as never,
    });
    const loading = core.getLoadThreadsPromise();
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    deleteRequest.resolve();
    await deleteTask;
    staleList.resolve({ threads: [thread("same")] });
    await loading;

    expect(core.getItemById("same")).toBeUndefined();
  });

  it("keeps the replacement's selected thread running when an old deletion of the same id settles", async () => {
    const deleteRequest = deferred<void>();
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("same")] }),
      delete: vi.fn(() => deleteRequest.promise),
    });
    const adapterB = makeAdapter({
      list: async () => ({ threads: [thread("same")] }),
    });
    const core = createCore(adapterA);
    const hookManager = (
      core as unknown as {
        _hookManager: { stopThreadRuntime: (id: string) => void };
      }
    )._hookManager;
    const stopThreadRuntime = vi.spyOn(hookManager, "stopThreadRuntime");

    await core.getLoadThreadsPromise();
    const deleteTask = core.delete("same");
    await vi.waitFor(() => expect(adapterA.delete).toHaveBeenCalledOnce());

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();
    await core.switchToThread("same");
    stopThreadRuntime.mockClear();

    deleteRequest.resolve();
    await deleteTask;

    expect(core.mainThreadId).toBe("same");
    expect(stopThreadRuntime).not.toHaveBeenCalledWith("same");
  });

  it("keeps the replacement's thread listed while a later adapter's list loads", async () => {
    const deleteRequest = deferred<void>();
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("same")] }),
      delete: vi.fn(() => deleteRequest.promise),
    });
    const adapterB = makeAdapter({
      list: async () => ({ threads: [thread("same")] }),
    });
    const listC = deferred<{ threads: ReturnType<typeof thread>[] }>();
    const adapterC = makeAdapter({ list: vi.fn(() => listC.promise) });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const deleteTask = core.delete("same");
    await vi.waitFor(() => expect(adapterA.delete).toHaveBeenCalledOnce());

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();
    core.__internal_setOptions({
      adapter: adapterC,
      runtimeHook: () => ({}) as never,
    });
    const loading = core.getLoadThreadsPromise();

    expect(core.threadIds).toEqual(["same"]);

    listC.resolve({ threads: [] });
    await loading;
    deleteRequest.resolve();
    await deleteTask;
  });

  it("keeps a thread deleted before two adapter swaps hidden until a list lands", async () => {
    const deleteRequest = deferred<void>();
    const adapterA = makeAdapter({
      list: async () => ({ threads: [thread("same"), thread("other")] }),
      delete: vi.fn(() => deleteRequest.promise),
    });
    const adapterB = makeAdapter({
      list: vi.fn(() => new Promise<never>(() => {})),
    });
    const listC = deferred<{ threads: ReturnType<typeof thread>[] }>();
    const adapterC = makeAdapter({ list: vi.fn(() => listC.promise) });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const deleteTask = core.delete("same");
    await vi.waitFor(() => expect(adapterA.delete).toHaveBeenCalledOnce());

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    void core.getLoadThreadsPromise();
    core.__internal_setOptions({
      adapter: adapterC,
      runtimeHook: () => ({}) as never,
    });
    const loading = core.getLoadThreadsPromise();

    expect(core.threadIds).toEqual(["other"]);

    listC.resolve({ threads: [] });
    await loading;
    deleteRequest.resolve();
    await deleteTask;
  });

  it("keeps the replacement's thread listed until the deleting adapter's list lands again", async () => {
    const deleteRequest = deferred<void>();
    const listAgain = deferred<{ threads: ReturnType<typeof thread>[] }>();
    const listA = vi
      .fn()
      .mockResolvedValueOnce({ threads: [thread("same")] })
      .mockReturnValueOnce(listAgain.promise);
    const adapterA = makeAdapter({
      list: listA,
      delete: vi.fn(() => deleteRequest.promise),
    });
    const adapterB = makeAdapter({
      list: async () => ({ threads: [thread("same")] }),
    });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    const deleteTask = core.delete("same");
    await vi.waitFor(() => expect(adapterA.delete).toHaveBeenCalledOnce());

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();
    core.__internal_setOptions({
      adapter: adapterA,
      runtimeHook: () => ({}) as never,
    });
    const loading = core.getLoadThreadsPromise();
    expect(core.threadIds).toEqual(["same"]);

    listAgain.resolve({ threads: [thread("same")] });
    await loading;
    expect(core.threadIds).toEqual([]);

    deleteRequest.resolve();
    await deleteTask;
  });
});
