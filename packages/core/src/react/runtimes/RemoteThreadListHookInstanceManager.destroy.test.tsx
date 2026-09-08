import { describe, expect, it } from "vitest";
import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import { RemoteThreadListHookInstanceManager } from "./RemoteThreadListHookInstanceManager";

const makeManager = () =>
  new RemoteThreadListHookInstanceManager(
    () => ({}) as never,
    {} as ThreadListRuntimeCore,
  );

// No AdapterSink attaches a runtime here, so the start and restart promises
// stay pending or reject on stop; neither is what these tests are about.
const start = (manager: RemoteThreadListHookInstanceManager, id: string) => {
  manager.startThreadRuntime(id).catch(() => {});
};
const restart = (manager: RemoteThreadListHookInstanceManager, id: string) => {
  manager.__internal_restartThreadRuntime(id).catch(() => {});
};

const publishedSignal = (
  manager: RemoteThreadListHookInstanceManager,
  id: string,
) => {
  const { hostStore } = manager as unknown as {
    hostStore: {
      getState: () => {
        threads: readonly { id: string; destroySignal: AbortSignal }[];
      };
    };
  };
  return hostStore.getState().threads.find((thread) => thread.id === id)
    ?.destroySignal;
};

describe("RemoteThreadListHookInstanceManager destroy signal", () => {
  it("publishes a live signal for each started thread", () => {
    const manager = makeManager();
    start(manager, "thread-1");

    expect(publishedSignal(manager, "thread-1")?.aborted).toBe(false);
  });

  it("aborts the thread's signal when its runtime stops", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const signal = publishedSignal(manager, "thread-1")!;

    manager.stopThreadRuntime("thread-1");

    expect(signal.aborted).toBe(true);
  });

  it("leaves sibling threads untouched when one stops", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    start(manager, "thread-2");
    const sibling = publishedSignal(manager, "thread-2")!;

    manager.stopThreadRuntime("thread-1");

    expect(sibling.aborted).toBe(false);
  });

  it("hands the next generation a fresh signal on restart", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const first = publishedSignal(manager, "thread-1")!;

    restart(manager, "thread-1");
    const second = publishedSignal(manager, "thread-1")!;

    expect(first.aborted).toBe(true);
    expect(second).not.toBe(first);
    expect(second.aborted).toBe(false);
  });

  it("aborts every thread when the manager is disposed", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    start(manager, "thread-2");
    const signals = [
      publishedSignal(manager, "thread-1")!,
      publishedSignal(manager, "thread-2")!,
    ];

    manager.__internal_dispose();

    expect(signals.map((signal) => signal.aborted)).toEqual([true, true]);
  });
});
