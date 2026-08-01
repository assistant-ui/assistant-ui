import { describe, expect, it } from "vitest";
import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import { RemoteThreadListHookInstanceManager } from "./RemoteThreadListHookInstanceManager";

describe("RemoteThreadListHookInstanceManager", () => {
  it("rejects a pending start when the thread runtime is stopped", async () => {
    const manager = new RemoteThreadListHookInstanceManager(() => {
      throw new Error("Runtime hook should not render during this test");
    }, {} as ThreadListRuntimeCore);

    const startPromise = manager.startThreadRuntime("thread-1");
    manager.stopThreadRuntime("thread-1");

    await expect(startPromise).rejects.toThrow(
      "Thread was deleted before runtime was started",
    );
  });
});

describe("RemoteThreadListHookInstanceManager.__internal_restartThreadRuntime", () => {
  const makeManager = () =>
    new RemoteThreadListHookInstanceManager(
      () => ({}) as never,
      {} as ThreadListRuntimeCore,
    );

  // no React binder attaches a runtime in these tests, so the returned promises
  // stay pending or reject on stop; neither is what is under test here
  const start = (manager: RemoteThreadListHookInstanceManager, id: string) => {
    manager.startThreadRuntime(id).catch(() => {});
  };
  const restart = (
    manager: RemoteThreadListHookInstanceManager,
    id: string,
  ) => {
    manager.__internal_restartThreadRuntime(id).catch(() => {});
  };

  const renderedKeys = (manager: RemoteThreadListHookInstanceManager) =>
    Array.from(
      (
        manager as unknown as {
          instances: Map<string, { generation: number }>;
        }
      ).instances.entries(),
    ).map(([id, { generation }]) => `${id}:${generation}`);

  it("changes the binder key so React remounts the runtime hook", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const before = renderedKeys(manager);

    restart(manager, "thread-1");

    expect(renderedKeys(manager)).not.toEqual(before);
    expect(renderedKeys(manager)).toEqual(["thread-1:1"]);
  });

  it("keeps the thread rendered across the restart, unlike stop", () => {
    const restarted = makeManager();
    start(restarted, "thread-1");
    restart(restarted, "thread-1");

    const stopped = makeManager();
    start(stopped, "thread-1");
    stopped.stopThreadRuntime("thread-1");

    expect(renderedKeys(restarted)).toHaveLength(1);
    expect(renderedKeys(stopped)).toHaveLength(0);
  });

  it("starts the runtime when the thread is not alive yet", () => {
    const manager = makeManager();

    restart(manager, "thread-1");

    expect(renderedKeys(manager)).toEqual(["thread-1:0"]);
  });

  it("stop then start in one tick leaves the key unchanged, which is why the generation exists", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const before = renderedKeys(manager);

    manager.stopThreadRuntime("thread-1");
    start(manager, "thread-1");

    expect(renderedKeys(manager)).toEqual(before);
  });
});
