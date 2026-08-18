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

    expect(() => core.rename("thread-a", "leaked")).toThrow(
      'Thread "thread-a" not found',
    );
    expect(adapterB.rename).not.toHaveBeenCalled();
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
  });
});
