import { describe, expect, it, vi } from "vitest";
import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import type { ThreadMessage } from "../../types/message";
import { RemoteThreadListHookInstanceManager } from "./RemoteThreadListHookInstanceManager";

const makeRuntime = (
  initial: Partial<Pick<ThreadRuntimeCore, "isRunning" | "messages">> = {},
) => {
  const subscribers = new Set<() => void>();
  const runtime = {
    isRunning: initial.isRunning,
    messages: initial.messages ?? [],
    subscribe: (callback: () => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
  } as unknown as ThreadRuntimeCore & {
    isRunning: boolean | undefined;
    messages: readonly ThreadMessage[];
  };

  return {
    runtime,
    subscriberCount: () => subscribers.size,
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

// mirrors what the React binder does on every publication
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
    expect(manager.__internal_isThreadRunning("thread-1")).toBe(false);
  });
});
