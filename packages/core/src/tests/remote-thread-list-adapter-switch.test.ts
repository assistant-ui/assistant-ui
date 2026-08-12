import { describe, expect, it } from "vitest";
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
    const adapterB = makeAdapter({
      list: async () => ({ threads: [thread("thread-b")] }),
    });
    const core = createCore(adapterA);

    await core.getLoadThreadsPromise();
    await core.switchToThread("thread-a");
    expect(core.getItemById(core.mainThreadId)?.remoteId).toBe("thread-a");

    core.__internal_setOptions({
      adapter: adapterB,
      runtimeHook: () => ({}) as never,
    });
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
});
