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

    await core.getLoadThreadsPromise();
    await core.switchToThread("thread-a");
    expect(core.getItemById(core.mainThreadId)?.remoteId).toBe("thread-a");

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
    expect(listAdapterB).toHaveBeenCalledTimes(1);
    expect(core.mainThreadId).not.toBe("thread-a");
    expect(core.getItemById(core.mainThreadId)?.status).toBe("new");
    await core.getLoadThreadsPromise();

    expect(core.threadIds).toEqual(["thread-b"]);
    expect(core.getItemById("thread-a")).toBeUndefined();
    expect(core.getItemById(core.mainThreadId)?.remoteId).not.toBe("thread-a");
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
});
