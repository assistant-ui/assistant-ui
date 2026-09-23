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
  const starts: string[] = [];
  setStartThreadRuntime(core, async (id) => {
    starts.push(id);
    running.add(id);
    return {};
  });
  const hookManager = (
    core as unknown as {
      _hookManager: {
        stopThreadRuntime: (id: string) => void;
        getThreadRuntimeCore: (id: string) => unknown;
      };
    }
  )._hookManager;
  hookManager.getThreadRuntimeCore = (id) => (running.has(id) ? {} : undefined);
  const stop = hookManager.stopThreadRuntime.bind(hookManager);
  hookManager.stopThreadRuntime = (id) => {
    running.delete(id);
    stop(id);
  };
  return { running, starts };
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
    const { running } = trackRunningThreads(core);
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
    const { running } = trackRunningThreads(core);
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

  it("does not start the runtime again when a switch lands on a thread whose runtime is running", async () => {
    const core = createCore(
      makeAdapter({
        list: vi.fn(async () => ({
          threads: [
            {
              status: "regular" as const,
              remoteId: "thread-b",
              externalId: "thread-b",
            },
          ],
        })),
      }),
    );
    const { starts } = trackRunningThreads(core);
    await core.getLoadThreadsPromise();

    await core.switchToThread("thread-b");

    expect(core.mainThreadId).toBe("thread-b");
    expect(starts.filter((id) => id === "thread-b")).toHaveLength(1);
  });
});
