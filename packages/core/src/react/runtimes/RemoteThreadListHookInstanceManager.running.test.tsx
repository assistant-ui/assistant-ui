import { describe, expect, it, vi } from "vitest";
import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import type { ThreadMessage } from "../../types/message";
import { RemoteThreadListHookInstanceManager } from "./RemoteThreadListHookInstanceManager";

const makeRuntime = (
  initial: Partial<Pick<ThreadRuntimeCore, "isRunning" | "messages">> & {
    initialized?: boolean;
  } = {},
) => {
  const subscribers = new Set<() => void>();
  const eventListeners = new Map<string, Set<() => void>>();
  const runtime = {
    isRunning: initial.isRunning,
    messages: initial.messages ?? [],
    subscribe: (callback: () => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    unstable_on: (event: string, callback: () => void) => {
      let listeners = eventListeners.get(event);
      if (!listeners) {
        listeners = new Set();
        eventListeners.set(event, listeners);
      }
      listeners.add(callback);
      // mirrors the real core: initialize latches, so a subscriber that
      // attaches after initialization gets a deferred replay
      if (event === "initialize" && initial.initialized) {
        const latched = listeners;
        queueMicrotask(() => {
          if (latched.has(callback)) callback();
        });
      }
      return () => listeners.delete(callback);
    },
    composer: { dictation: undefined },
  } as unknown as ThreadRuntimeCore & {
    isRunning: boolean | undefined;
    messages: readonly ThreadMessage[];
  };

  return {
    runtime,
    subscriberCount: () => subscribers.size,
    eventListenerCount: () =>
      [...eventListeners.values()].reduce(
        (total, listeners) => total + listeners.size,
        0,
      ),
    emit: (event: string) => {
      for (const callback of eventListeners.get(event) ?? []) callback();
    },
    setRunning: (isRunning: boolean | undefined) => {
      runtime.isRunning = isRunning;
      for (const callback of subscribers) callback();
    },
  };
};

const makeManager = () =>
  new RemoteThreadListHookInstanceManager(
    () => ({}) as never,
    {} as ThreadListRuntimeCore,
  );

const makeRuntimeWithThrowingCleanup = () => {
  const thread = makeRuntime();
  const error = new Error("cleanup failed");
  const cleanupOrder: number[] = [];
  let subscriptionCount = 0;
  const cleanup = () => {
    const index = subscriptionCount++;
    return () => {
      cleanupOrder.push(index);
      if (index === 0) throw error;
    };
  };
  vi.spyOn(thread.runtime, "subscribe").mockImplementation(cleanup);
  vi.spyOn(thread.runtime, "unstable_on").mockImplementation(cleanup as never);
  return {
    ...thread,
    error,
    cleanupOrder,
    subscriptionCount: () => subscriptionCount,
  };
};

// mirrors what the tap fiber does on every publication
const publish = (
  manager: RemoteThreadListHookInstanceManager,
  threadId: string,
  runtime: ThreadRuntimeCore,
) => {
  const internals = manager as unknown as {
    instances: Map<string, { generation: number }>;
    _publishThreadRuntime: (
      threadId: string,
      runtime: ThreadRuntimeCore,
      generation: number,
    ) => void;
  };
  const generation = internals.instances.get(threadId)!.generation;
  internals._publishThreadRuntime(threadId, runtime, generation);
};

const start = (manager: RemoteThreadListHookInstanceManager, id: string) => {
  manager.startThreadRuntime(id).catch(() => {});
};

describe("RemoteThreadListHookInstanceManager run tracking", () => {
  it("reports a thread with no attached runtime as not running", () => {
    const manager = makeManager();
    start(manager, "thread-1");

    expect(manager.__internal_isThreadRunning("thread-1")).toBe(false);
    expect(manager.__internal_isThreadRunning("never-started")).toBe(false);
  });

  it("adopts the run state of the published runtime", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const { runtime } = makeRuntime({ isRunning: true });

    publish(manager, "thread-1", runtime);

    expect(manager.__internal_isThreadRunning("thread-1")).toBe(true);
  });

  it("falls back to the trailing assistant message when the runtime does not track runs", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const { runtime } = makeRuntime({
      messages: [
        { role: "assistant", status: { type: "running" } },
      ] as unknown as readonly ThreadMessage[],
    });

    publish(manager, "thread-1", runtime);

    expect(manager.__internal_isThreadRunning("thread-1")).toBe(true);
  });

  it("tracks a thread the user has switched away from", () => {
    const manager = makeManager();
    start(manager, "background");
    start(manager, "main");
    const background = makeRuntime({ isRunning: false });
    publish(manager, "background", background.runtime);
    publish(manager, "main", makeRuntime({ isRunning: false }).runtime);

    background.setRunning(true);

    expect(manager.__internal_isThreadRunning("background")).toBe(true);
    expect(manager.__internal_isThreadRunning("main")).toBe(false);
  });

  it("notifies the thread list only when the thread crosses the running boundary", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const thread = makeRuntime({ isRunning: false });
    publish(manager, "thread-1", thread.runtime);

    const onChange = vi.fn();
    manager.__internal_subscribeRunningChanged(onChange);

    thread.setRunning(false);
    expect(onChange).not.toHaveBeenCalled();

    thread.setRunning(true);
    expect(onChange).toHaveBeenCalledTimes(1);

    thread.setRunning(true);
    expect(onChange).toHaveBeenCalledTimes(1);

    thread.setRunning(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("notifies every running subscriber when one throws", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const thread = makeRuntime({ isRunning: false });
    publish(manager, "thread-1", thread.runtime);
    const error = new Error("listener failed");
    manager.__internal_subscribeRunningChanged(() => {
      throw error;
    });
    const laterSubscriber = vi.fn();
    manager.__internal_subscribeRunningChanged(laterSubscriber);

    expect(() => thread.setRunning(true)).toThrow(error);
    expect(laterSubscriber).toHaveBeenCalledOnce();
  });

  it("notifies every replacement subscriber when one throws", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    publish(manager, "thread-1", makeRuntime().runtime);
    const error = new Error("listener failed");
    manager.__internal_subscribeRuntimeReplaced(() => {
      throw error;
    });
    const laterSubscriber = vi.fn();
    manager.__internal_subscribeRuntimeReplaced(laterSubscriber);

    expect(() => publish(manager, "thread-1", makeRuntime().runtime)).toThrow(
      error,
    );
    expect(laterSubscriber).toHaveBeenCalledOnce();
  });

  it("moves tracking to the runtime a restart publishes", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const before = makeRuntime({ isRunning: true });
    publish(manager, "thread-1", before.runtime);

    const after = makeRuntime({ isRunning: false });
    publish(manager, "thread-1", after.runtime);

    expect(manager.__internal_isThreadRunning("thread-1")).toBe(false);
    expect(before.subscriberCount()).toBe(0);

    after.setRunning(true);
    expect(manager.__internal_isThreadRunning("thread-1")).toBe(true);
  });

  it("releases the run subscription when the thread runtime stops", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const thread = makeRuntime({ isRunning: true });
    publish(manager, "thread-1", thread.runtime);

    manager.stopThreadRuntime("thread-1");

    expect(thread.subscriberCount()).toBe(0);
    expect(thread.eventListenerCount()).toBe(0);
    expect(manager.__internal_isThreadRunning("thread-1")).toBe(false);
  });

  it("finishes stopping a runtime after a cleanup throws", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const thread = makeRuntimeWithThrowingCleanup();
    publish(manager, "thread-1", thread.runtime);
    const internals = manager as unknown as {
      instances: Map<string, { destroy: AbortController }>;
    };
    const destroySignal = internals.instances.get("thread-1")!.destroy.signal;

    expect(() => manager.stopThreadRuntime("thread-1")).toThrow(thread.error);

    expect(thread.cleanupOrder).toEqual(
      Array.from({ length: thread.subscriptionCount() }, (_, index) => index),
    );
    expect(destroySignal.aborted).toBe(true);
    expect(internals.instances.has("thread-1")).toBe(false);
  });

  it("finishes restarting a runtime after a cleanup throws", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const thread = makeRuntimeWithThrowingCleanup();
    publish(manager, "thread-1", thread.runtime);
    const internals = manager as unknown as {
      instances: Map<
        string,
        {
          destroy: AbortController;
          generation: number;
          unsubscribeRunning?: () => void;
        }
      >;
    };
    const before = internals.instances.get("thread-1")!;
    const destroySignal = before.destroy.signal;
    const generation = before.generation;

    expect(() => manager.__internal_restartThreadRuntime("thread-1")).toThrow(
      thread.error,
    );

    const after = internals.instances.get("thread-1")!;
    expect(thread.cleanupOrder).toEqual(
      Array.from({ length: thread.subscriptionCount() }, (_, index) => index),
    );
    expect(destroySignal.aborted).toBe(true);
    expect(after.destroy.signal).not.toBe(destroySignal);
    expect(after.generation).toBeGreaterThan(generation);
    expect(after.unsubscribeRunning).toBeUndefined();
  });

  it("installs replacement tracking after an old cleanup throws", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const before = makeRuntimeWithThrowingCleanup();
    publish(manager, "thread-1", before.runtime);
    const after = makeRuntime({ isRunning: false });

    expect(() => publish(manager, "thread-1", after.runtime)).toThrow(
      before.error,
    );

    expect(before.cleanupOrder).toEqual(
      Array.from({ length: before.subscriptionCount() }, (_, index) => index),
    );
    expect(after.subscriberCount()).toBe(1);
    after.setRunning(true);
    expect(manager.__internal_isThreadRunning("thread-1")).toBe(true);
  });

  it("forwards every lifecycle event from every tracked thread with its thread id", () => {
    const manager = makeManager();
    const events: unknown[] = [];
    manager.__internal_subscribeThreadEvents((event) => events.push(event));

    start(manager, "thread-1");
    start(manager, "thread-2");
    const first = makeRuntime();
    const second = makeRuntime();
    publish(manager, "thread-1", first.runtime);
    publish(manager, "thread-2", second.runtime);

    second.emit("runStart");
    first.emit("runEnd");
    first.emit("initialize");
    second.emit("modelContextUpdate");

    expect(events).toEqual([
      { threadId: "thread-2", type: "runStart" },
      { threadId: "thread-1", type: "runEnd" },
      { threadId: "thread-1", type: "initialize" },
      { threadId: "thread-2", type: "modelContextUpdate" },
    ]);
  });

  it("replays a latched initialize from the surviving runtime after a restart", async () => {
    const manager = makeManager();
    const events: unknown[] = [];
    manager.__internal_subscribeThreadEvents((event) => events.push(event));

    start(manager, "thread-1");
    const before = makeRuntime({ initialized: true });
    publish(manager, "thread-1", before.runtime);
    const after = makeRuntime({ initialized: true });
    publish(manager, "thread-1", after.runtime);
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(before.eventListenerCount()).toBe(0);
    expect(events).toEqual([{ threadId: "thread-1", type: "initialize" }]);
  });

  it("stops forwarding lifecycle events from a runtime a restart replaced", () => {
    const manager = makeManager();
    const events: unknown[] = [];
    manager.__internal_subscribeThreadEvents((event) => events.push(event));

    start(manager, "thread-1");
    const before = makeRuntime();
    publish(manager, "thread-1", before.runtime);
    const after = makeRuntime();
    publish(manager, "thread-1", after.runtime);

    before.emit("runEnd");
    before.emit("initialize");
    after.emit("runEnd");
    after.emit("modelContextUpdate");

    expect(before.eventListenerCount()).toBe(0);
    expect(events).toEqual([
      { threadId: "thread-1", type: "runEnd" },
      { threadId: "thread-1", type: "modelContextUpdate" },
    ]);
  });
});
