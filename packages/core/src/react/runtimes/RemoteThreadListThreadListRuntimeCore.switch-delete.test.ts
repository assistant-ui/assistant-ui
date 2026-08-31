import { describe, expect, it, vi } from "vitest";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";
import {
  contextProvider,
  createCore,
  deferred,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";

describe("RemoteThreadListThreadListRuntimeCore switch/delete ordering", () => {
  it("rejects when a thread is deleted before its runtime attaches", async () => {
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
    const core = new RemoteThreadListThreadListRuntimeCore(
      { adapter, runtimeHook: () => ({}) as never },
      contextProvider,
    );
    await core.getLoadThreadsPromise();
    const initialMainThreadId = core.mainThreadId;

    const switchToB = core.switchToThread("thread-b");
    const rejection = expect(switchToB).rejects.toThrow(
      "Thread was deleted before runtime was started",
    );
    await core.delete("thread-b");
    await rejection;

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
