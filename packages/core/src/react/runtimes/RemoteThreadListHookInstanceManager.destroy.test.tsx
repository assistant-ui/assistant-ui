import { describe, expect, it } from "vitest";
import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import { captureThreadRuntimeGeneration } from "../../runtime/utils/thread-runtime-lifecycle";
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

const makeRunningRuntime = () => {
  const subscribers = new Set<() => void>();
  const eventListeners = new Map<string, Set<() => void>>();
  const runtime = {
    isRunning: true,
    messages: [],
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
      return () => listeners.delete(callback);
    },
  } as unknown as ThreadRuntimeCore & { isRunning: boolean };

  return {
    runtime,
    // what a stopOnClientDestroy consumer does when the destroy signal fires
    stop: () => {
      runtime.isRunning = false;
      for (const callback of eventListeners.get("runEnd") ?? []) callback();
      for (const callback of subscribers) callback();
    },
  };
};

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
  internals._publishThreadRuntime(
    threadId,
    runtime,
    internals.instances.get(threadId)!.generation,
  );
};

describe("RemoteThreadListHookInstanceManager restart teardown", () => {
  it("keeps the outgoing generation's terminal events off the thread's subscribers", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const { runtime, stop } = makeRunningRuntime();
    publish(manager, "thread-1", runtime);

    const signal = publishedSignal(manager, "thread-1")!;
    signal.addEventListener("abort", stop, { once: true });

    const events: string[] = [];
    manager.__internal_subscribeThreadEvents((event) =>
      events.push(event.type),
    );
    const runningChanges: boolean[] = [];
    manager.__internal_subscribeRunningChanged(() =>
      runningChanges.push(manager.__internal_isThreadRunning("thread-1")),
    );
    expect(manager.__internal_isThreadRunning("thread-1")).toBe(true);

    restart(manager, "thread-1");

    expect(signal.aborted).toBe(true);
    expect(events).toEqual([]);
    expect(runningChanges).toEqual([]);
    expect(manager.__internal_isThreadRunning("thread-1")).toBe(true);
  });

  it("retires every outgoing runtime when the runtime hook changes", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    start(manager, "thread-2");
    const first = makeRunningRuntime();
    const second = makeRunningRuntime();
    publish(manager, "thread-1", first.runtime);
    publish(manager, "thread-2", second.runtime);

    const generations = [
      captureThreadRuntimeGeneration(first.runtime),
      captureThreadRuntimeGeneration(second.runtime),
    ];
    const firstSignal = publishedSignal(manager, "thread-1")!;
    const secondSignal = publishedSignal(manager, "thread-2")!;
    const signals = [firstSignal, secondSignal];
    firstSignal.addEventListener("abort", first.stop, { once: true });
    secondSignal.addEventListener("abort", second.stop, { once: true });

    const events: string[] = [];
    manager.__internal_subscribeThreadEvents((event) =>
      events.push(event.type),
    );
    const runningChanges: boolean[] = [];
    manager.__internal_subscribeRunningChanged(() =>
      runningChanges.push(manager.__internal_isThreadRunning("thread-1")),
    );

    manager.setRuntimeHook(() => ({}) as never);

    const successors = [
      publishedSignal(manager, "thread-1")!,
      publishedSignal(manager, "thread-2")!,
    ];
    expect(generations.map((generation) => generation.aborted)).toEqual([
      true,
      true,
    ]);
    expect(signals.map((signal) => signal.aborted)).toEqual([true, true]);
    expect(
      successors.map((signal, index) => signal !== signals[index]),
    ).toEqual([true, true]);
    expect(successors.map((signal) => signal.aborted)).toEqual([false, false]);
    expect(events).toEqual([]);
    expect(runningChanges).toEqual([]);
    expect(manager.__internal_isThreadRunning("thread-1")).toBe(true);
    expect(manager.__internal_isThreadRunning("thread-2")).toBe(true);
  });

  it("updates every thread when a running subscription cleanup throws", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    start(manager, "thread-2");
    const first = makeRunningRuntime();
    const second = makeRunningRuntime();
    publish(manager, "thread-1", first.runtime);
    publish(manager, "thread-2", second.runtime);

    const generations = [
      captureThreadRuntimeGeneration(first.runtime),
      captureThreadRuntimeGeneration(second.runtime),
    ];
    const signals = [
      publishedSignal(manager, "thread-1")!,
      publishedSignal(manager, "thread-2")!,
    ];
    const internals = manager as unknown as {
      instances: Map<string, { unsubscribeRunning?: () => void }>;
    };
    const firstCleanup =
      internals.instances.get("thread-1")!.unsubscribeRunning;
    const secondCleanup =
      internals.instances.get("thread-2")!.unsubscribeRunning;
    const cleanupError = new Error("unsubscribe failed");
    let secondCleaned = false;
    internals.instances.get("thread-1")!.unsubscribeRunning = () => {
      firstCleanup?.();
      throw cleanupError;
    };
    internals.instances.get("thread-2")!.unsubscribeRunning = () => {
      secondCleaned = true;
      secondCleanup?.();
    };

    expect(() => manager.setRuntimeHook(() => ({}) as never)).toThrow(
      cleanupError,
    );

    const successors = [
      publishedSignal(manager, "thread-1")!,
      publishedSignal(manager, "thread-2")!,
    ];
    expect(secondCleaned).toBe(true);
    expect(generations.map((generation) => generation.aborted)).toEqual([
      true,
      true,
    ]);
    expect(signals.map((signal) => signal.aborted)).toEqual([true, true]);
    expect(
      successors.map((signal, index) => signal !== signals[index]),
    ).toEqual([true, true]);
    expect(successors.map((signal) => signal.aborted)).toEqual([false, false]);
  });
});
