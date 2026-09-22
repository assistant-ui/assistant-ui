import { describe, expect, it, vi } from "vitest";
import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import { RemoteThreadListHookInstanceManager } from "./RemoteThreadListHookInstanceManager";
import { ExternalStoreThreadRuntimeCore } from "../../runtimes/external-store/external-store-thread-runtime-core";
import type { ExternalStoreAdapter } from "../../runtimes/external-store/external-store-adapter";
import type { ModelContextProvider } from "../../model-context/types";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";

const createExternalStoreRuntime = (
  store: Partial<ExternalStoreAdapter> = {},
) =>
  new ExternalStoreThreadRuntimeCore(
    { getModelContext: () => ({}) } satisfies ModelContextProvider,
    {
      messages: [],
      onNew: async () => {},
      ...store,
    } satisfies ExternalStoreAdapter,
  );

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

  it("dispatches an append before the thread runtime stops", async () => {
    let resolveInitialization!: () => void;
    const initialization = new Promise<void>((resolve) => {
      resolveInitialization = resolve;
    });
    const onNew = vi.fn(async () => {});
    const runtime = new ExternalStoreThreadRuntimeCore(
      { getModelContext: () => ({}) } satisfies ModelContextProvider,
      { messages: [], onNew } as ExternalStoreAdapter,
    );
    runtime.__internal_setGetInitializePromise(() => initialization);
    const manager = new RemoteThreadListHookInstanceManager(
      () => ({}) as never,
      {} as ThreadListRuntimeCore,
    );
    const internals = manager as unknown as {
      instances: Map<
        string,
        {
          runtime: typeof runtime;
          generation: number;
          isRunning: boolean;
          destroy: AbortController;
        }
      >;
    };
    internals.instances.set("thread-1", {
      runtime,
      generation: 0,
      isRunning: false,
      destroy: new AbortController(),
    });

    const appendPromise = runtime.append({
      parentId: null,
      sourceId: null,
      runConfig: {},
      role: "user",
      content: [{ type: "text", text: "hello" }],
      attachments: [],
      metadata: { custom: {} },
      createdAt: new Date(0),
    });
    await Promise.resolve();

    expect(onNew).toHaveBeenCalledTimes(1);

    manager.stopThreadRuntime("thread-1");
    resolveInitialization();

    await appendPromise;
    expect(onNew).toHaveBeenCalledTimes(1);
  });
});

describe("RemoteThreadListHookInstanceManager.__internal_restartThreadRuntime", () => {
  const makeManager = () =>
    new RemoteThreadListHookInstanceManager(
      () => ({}) as never,
      {} as ThreadListRuntimeCore,
    );

  // no AdapterSink attaches a runtime in these tests, so the returned promises
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
        runtime?: ThreadRuntimeCore;
        publishedGeneration?: number;
        generation: number;
        destroy: AbortController;
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

  it("changes the resource key so the tap host remounts the runtime hook", () => {
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

  it("stop then start in one tick yields a fresh key, so the old still-mounted resource cannot satisfy the new start", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const before = renderedKeys(manager);

    manager.stopThreadRuntime("thread-1");
    start(manager, "thread-1");

    expect(renderedKeys(manager)).not.toEqual(before);
    expect(renderedKeys(manager)).toEqual(["thread-1:1"]);
  });

  // simulates the resource publish: attach a runtime for the
  // instance's current generation (or an explicit stale one)
  const publish = (
    manager: RemoteThreadListHookInstanceManager,
    id: string,
    runtime: ThreadRuntimeCore,
    options?: { generation?: number },
  ) => {
    const instance = internalsOf(manager).instances.get(id)!;
    instance.runtime = runtime;
    instance.publishedGeneration = options?.generation ?? instance.generation;
    internalsOf(manager)._notifySubscribers();
  };

  it.each(["stop", "restart"] as const)(
    "discards an unfinished voice transcript on remote %s",
    (action) => {
      const onVoiceTranscript = vi.fn();
      const disconnect = vi.fn();
      let emitTranscript!: (item: RealtimeVoiceAdapter.TranscriptItem) => void;
      const session: RealtimeVoiceAdapter.Session = {
        status: { type: "running" },
        isMuted: false,
        disconnect,
        mute: vi.fn(),
        unmute: vi.fn(),
        onStatusChange: () => () => {},
        onTranscript: (callback) => {
          emitTranscript = callback;
          return () => {};
        },
        onModeChange: () => () => {},
        onVolumeChange: () => () => {},
      };
      const runtime = createExternalStoreRuntime({
        onVoiceTranscript,
        adapters: { voice: { connect: () => session } },
      });
      const manager = makeManager();
      start(manager, "thread-1");
      publish(manager, "thread-1", runtime);
      runtime.connectVoice();
      emitTranscript({ role: "assistant", text: "unfinished" });

      expect(runtime.messages).toHaveLength(1);
      if (action === "stop") manager.stopThreadRuntime("thread-1");
      else restart(manager, "thread-1");

      expect(disconnect).toHaveBeenCalledOnce();
      expect(onVoiceTranscript).not.toHaveBeenCalled();
      expect(runtime.messages).toHaveLength(0);
    },
  );

  it.each(["stop", "restart"] as const)(
    "finishes remote %s when voice disconnect throws",
    (action) => {
      const session: RealtimeVoiceAdapter.Session = {
        status: { type: "running" },
        isMuted: false,
        disconnect: () => {
          throw new Error("disconnect failed");
        },
        mute: vi.fn(),
        unmute: vi.fn(),
        onStatusChange: () => () => {},
        onTranscript: () => () => {},
        onModeChange: () => () => {},
        onVolumeChange: () => () => {},
      };
      const runtime = createExternalStoreRuntime({
        adapters: { voice: { connect: () => session } },
      });
      const manager = makeManager();
      start(manager, "thread-1");
      publish(manager, "thread-1", runtime);
      runtime.connectVoice();
      const oldDestroy =
        internalsOf(manager).instances.get("thread-1")!.destroy;

      expect(() => {
        if (action === "stop") manager.stopThreadRuntime("thread-1");
        else manager.__internal_restartThreadRuntime("thread-1");
      }).toThrow("disconnect failed");
      expect(oldDestroy.signal.aborted).toBe(true);
      if (action === "stop") {
        expect(internalsOf(manager).instances.has("thread-1")).toBe(false);
      } else {
        expect(renderedKeys(manager)).toEqual(["thread-1:1"]);
      }
    },
  );

  it("does not settle with the pre-restart runtime; only the incoming binder's publication resolves it", async () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const preReloadRuntime = createExternalStoreRuntime();
    const postReloadRuntime = createExternalStoreRuntime();
    publish(manager, "thread-1", preReloadRuntime);

    let settledWith = "NOT_SETTLED";
    manager.__internal_restartThreadRuntime("thread-1").then((runtime) => {
      settledWith = runtime === postReloadRuntime ? "post-reload-runtime" : "";
    });

    // the outgoing runtime rides across the restart (stays readable)…
    expect(manager.getThreadRuntimeCore("thread-1")).toBe(preReloadRuntime);
    // …but must not count as attached
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(settledWith).toBe("NOT_SETTLED");

    publish(manager, "thread-1", postReloadRuntime);
    await Promise.resolve();
    expect(settledWith).toBe("post-reload-runtime");
  });

  it("keeps the outgoing runtime readable while the restart promise is pending", () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const preReloadRuntime = createExternalStoreRuntime();
    publish(manager, "thread-1", preReloadRuntime);

    restart(manager, "thread-1");

    expect(manager.getThreadRuntimeCore("thread-1")).toBe(preReloadRuntime);
  });

  it("a stale-generation publication does not resolve the restart promise", async () => {
    const manager = makeManager();
    start(manager, "thread-1");
    const preReloadRuntime = createExternalStoreRuntime();
    const staleRuntime = createExternalStoreRuntime();
    publish(manager, "thread-1", preReloadRuntime);

    let settled = false;
    manager.__internal_restartThreadRuntime("thread-1").then(() => {
      settled = true;
    });

    // an outgoing resource re-publishing for its old generation (e.g. a late
    // outerSubscribe callback) must not count as the new attachment
    const staleGeneration =
      internalsOf(manager).instances.get("thread-1")!.generation - 1;
    publish(manager, "thread-1", staleRuntime, { generation: staleGeneration });

    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
  });
});
