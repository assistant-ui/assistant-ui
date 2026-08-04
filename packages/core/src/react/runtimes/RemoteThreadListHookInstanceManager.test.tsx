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

  type InstanceInternals = {
    instances: Map<
      string,
      {
        runtime?: unknown;
        publishedGeneration?: number;
        generation: number;
      }
    >;
    _notifySubscribers: () => void;
  };
  const internalsOf = (manager: RemoteThreadListHookInstanceManager) =>
    manager as unknown as InstanceInternals;

  const renderedKeys = (manager: RemoteThreadListHookInstanceManager) =>
    Array.from(internalsOf(manager).instances.entries()).map(
      ([id, { generation }]) => `${id}:${generation}`,
    );

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

  it("stop then start in one tick yields a fresh key, so the old still-mounted binder cannot satisfy the new start", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const before = renderedKeys(manager);

    manager.stopThreadRuntime("thread-1");
    start(manager, "thread-1");

    expect(renderedKeys(manager)).not.toEqual(before);
    expect(renderedKeys(manager)).toEqual(["thread-1:1"]);
  });

  // simulates the binder's updateRuntime: publish a runtime for the
  // instance's current generation (or an explicit stale one)
  const publish = (
    manager: RemoteThreadListHookInstanceManager,
    id: string,
    runtime: unknown,
    options?: { generation?: number },
  ) => {
    const instance = internalsOf(manager).instances.get(id)!;
    instance.runtime = runtime;
    instance.publishedGeneration = options?.generation ?? instance.generation;
    internalsOf(manager)._notifySubscribers();
  };

  it("does not settle with the pre-restart runtime; only the incoming binder's publication resolves it", async () => {
    const manager = makeManager();
    start(manager, "thread-1");
    publish(manager, "thread-1", { tag: "pre-reload-runtime" });

    let settledWith = "NOT_SETTLED";
    manager.__internal_restartThreadRuntime("thread-1").then((r) => {
      settledWith = (r as { tag: string }).tag;
    });

    // the outgoing runtime rides across the restart (stays readable)…
    expect(manager.getThreadRuntimeCore("thread-1")).toEqual({
      tag: "pre-reload-runtime",
    });
    // …but must not count as attached
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(settledWith).toBe("NOT_SETTLED");

    publish(manager, "thread-1", { tag: "post-reload-runtime" });
    await Promise.resolve();
    expect(settledWith).toBe("post-reload-runtime");
  });

  it("keeps the outgoing runtime readable while the restart promise is pending", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    publish(manager, "thread-1", { tag: "pre-reload-runtime" });

    restart(manager, "thread-1");

    expect(manager.getThreadRuntimeCore("thread-1")).toEqual({
      tag: "pre-reload-runtime",
    });
  });

  it("a stale-generation publication does not resolve the restart promise", async () => {
    const manager = makeManager();
    start(manager, "thread-1");
    publish(manager, "thread-1", { tag: "pre-reload-runtime" });

    let settled = false;
    manager.__internal_restartThreadRuntime("thread-1").then(() => {
      settled = true;
    });

    // an outgoing binder re-publishing for its old generation (e.g. a late
    // outerSubscribe callback) must not count as the new attachment
    const staleGeneration =
      internalsOf(manager).instances.get("thread-1")!.generation - 1;
    publish(
      manager,
      "thread-1",
      { tag: "stale-publication" },
      { generation: staleGeneration },
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
  });
});
