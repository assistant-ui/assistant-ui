import { describe, expect, it, vi } from "vitest";
import {
  createCore,
  deferred,
  makeAdapter,
  setStartThreadRuntime,
} from "../../tests/remote-thread-list-test-helpers";

describe("RemoteThreadListThreadListRuntimeCore switch/delete ordering", () => {
  it("does not unarchive a thread deleted while its runtime is starting", async () => {
    const startThreadRuntime = deferred<unknown>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "archived" as const,
            remoteId: "thread-b",
            externalId: "thread-b",
            title: "Thread B",
          },
        ],
      })),
    });
    const core = createCore(adapter);
    const start = vi.fn(() => startThreadRuntime.promise);
    setStartThreadRuntime(core, start);
    await core.getLoadThreadsPromise();
    const initialMainThreadId = core.mainThreadId;

    const switchToB = core.switchToThread("thread-b");
    await vi.waitFor(() => {
      expect(start).toHaveBeenCalledWith("thread-b");
    });
    await core.delete("thread-b");

    startThreadRuntime.resolve({});
    await expect(switchToB).resolves.toBeUndefined();

    expect(adapter.unarchive).not.toHaveBeenCalled();
    expect(core.getItemById("thread-b")).toBeUndefined();
    expect(core.mainThreadId).toBe(initialMainThreadId);
  });

  it("does not select a thread deleted while its switch is unarchiving", async () => {
    const unarchive = deferred<void>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "archived" as const,
            remoteId: "thread-b",
            externalId: "thread-b",
            title: "Thread B",
          },
        ],
      })),
      unarchive: vi.fn(() => unarchive.promise),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    const initialMainThreadId = core.mainThreadId;

    const switchToB = core.switchToThread("thread-b");
    await vi.waitFor(() => {
      expect(adapter.unarchive).toHaveBeenCalledWith("thread-b");
    });
    await core.delete("thread-b");

    unarchive.resolve();
    await switchToB;

    expect(core.getItemById("thread-b")).toBeUndefined();
    expect(core.mainThreadId).toBe(initialMainThreadId);
    expect(core.getItemById(core.mainThreadId!)).toBeDefined();
  });
});
