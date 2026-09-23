import { describe, expect, it, vi } from "vitest";
import type { RemoteThreadListThreadListRuntimeCore } from "../react/runtimes/RemoteThreadListThreadListRuntimeCore";
import {
  createCore,
  deferred,
  makeAdapter,
  setStartThreadRuntime,
} from "./remote-thread-list-test-helpers";

const trackRunningThreads = (core: RemoteThreadListThreadListRuntimeCore) => {
  const running = new Set<string>();
  setStartThreadRuntime(core, async (id) => {
    running.add(id);
    return {};
  });
  const hookManager = (
    core as unknown as {
      _hookManager: { stopThreadRuntime: (id: string) => void };
    }
  )._hookManager;
  const stop = hookManager.stopThreadRuntime.bind(hookManager);
  hookManager.stopThreadRuntime = (id) => {
    running.delete(id);
    stop(id);
  };
  return running;
};

describe("RemoteThreadListThreadListRuntimeCore main thread runtime", () => {
  it("runs the main thread's runtime when a switch lands on a thread detached during its unarchive", async () => {
    const unarchive = deferred<void>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "archived" as const,
            remoteId: "thread-b",
            externalId: "thread-b",
          },
        ],
      })),
      unarchive: vi.fn(() => unarchive.promise),
    });
    const core = createCore(adapter);
    const running = trackRunningThreads(core);
    await core.getLoadThreadsPromise();

    const switchToB = core.switchToThread("thread-b");
    await vi.waitFor(() => {
      expect(adapter.unarchive).toHaveBeenCalledWith("thread-b");
    });
    await core.detach("thread-b");
    unarchive.resolve();
    await switchToB;

    expect(core.mainThreadId).toBe("thread-b");
    expect(running.has("thread-b")).toBe(true);
  });

  it("runs the main thread's runtime when initialize moves main onto a detached draft", async () => {
    const initialization = deferred<{ remoteId: string; externalId: string }>();
    const core = createCore(
      makeAdapter({ initialize: vi.fn(() => initialization.promise) }),
    );
    const running = trackRunningThreads(core);
    await core.getLoadThreadsPromise();
    const localId = core.newThreadId!;
    const initializing = core.initialize(localId);

    await core.switchToThread("thread-b");
    await core.detach(localId);
    initialization.resolve({ remoteId: "thread-b", externalId: "thread-b" });
    await initializing;

    expect(core.mainThreadId).toBe(localId);
    expect(running.has(localId)).toBe(true);
  });
});
