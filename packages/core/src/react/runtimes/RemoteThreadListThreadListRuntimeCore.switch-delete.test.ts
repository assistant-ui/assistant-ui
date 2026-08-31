import { describe, expect, it, vi } from "vitest";
import {
  contextProvider,
  deferred,
  makeAdapter,
  setStartThreadRuntime,
} from "../../tests/remote-thread-list-test-helpers";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";

describe("RemoteThreadListThreadListRuntimeCore switch/delete ordering", () => {
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
    const core = new RemoteThreadListThreadListRuntimeCore(
      { adapter, runtimeHook: () => ({}) as never },
      contextProvider,
    );
    setStartThreadRuntime(core, async () => ({}));
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
