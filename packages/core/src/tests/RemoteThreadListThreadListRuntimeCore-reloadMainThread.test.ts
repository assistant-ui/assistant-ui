import { describe, it, expect, vi } from "vitest";
import { createCore, makeAdapter } from "./remote-thread-list-test-helpers";
import type { RemoteThreadListThreadListRuntimeCore } from "../react/runtimes/RemoteThreadListThreadListRuntimeCore";

type HookManagerStub = {
  startThreadRuntime: (id: string) => Promise<unknown>;
  __internal_restartThreadRuntime: (id: string) => Promise<unknown>;
  getThreadRuntimeCore: (id: string) =>
    | {
        unstable_refetchThread?: () => Promise<void>;
        capabilities?: { cancel: boolean };
        cancelRun?: () => void;
      }
    | undefined;
};

const hookManagerOf = (core: RemoteThreadListThreadListRuntimeCore) =>
  (core as unknown as { _hookManager: HookManagerStub })._hookManager;

const openRegularThread = async () => {
  const core = createCore(
    makeAdapter({
      list: async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "t-1",
            externalId: "t-1",
            title: "Open",
          },
        ],
      }),
    }),
  );
  await core.getLoadThreadsPromise();
  await core.switchToThread("t-1");
  return core;
};

describe("RemoteThreadListThreadListRuntimeCore.reloadMainThread", () => {
  it("restarts the runtime of the thread that is currently open", async () => {
    const core = await openRegularThread();
    const threadId = core.mainThreadId;

    const restart = vi.fn(async () => ({}));
    hookManagerOf(core).__internal_restartThreadRuntime = restart;

    await core.reloadMainThread();

    expect(restart).toHaveBeenCalledExactlyOnceWith(threadId);
  });

  it("notifies subscribers so the reloaded thread re-renders", async () => {
    const core = await openRegularThread();
    hookManagerOf(core).__internal_restartThreadRuntime = async () => ({});

    const callback = vi.fn();
    core.subscribe(callback);
    await core.reloadMainThread();

    expect(callback).toHaveBeenCalled();
  });

  it("leaves an unsent thread alone, since it holds no remote state", async () => {
    const core = createCore(makeAdapter());
    await core.switchToNewThread();

    const restart = vi.fn(async () => ({}));
    hookManagerOf(core).__internal_restartThreadRuntime = restart;

    await expect(core.reloadMainThread()).resolves.toBeUndefined();
    expect(restart).not.toHaveBeenCalled();
  });

  it("does nothing before the initial thread is open", async () => {
    // the constructor switches to a new thread, so this is the window between
    // construction and that switch settling
    const core = createCore(makeAdapter());
    (core as unknown as { _mainThreadId: string | undefined })._mainThreadId =
      undefined;

    const restart = vi.fn(async () => ({}));
    hookManagerOf(core).__internal_restartThreadRuntime = restart;

    await expect(core.reloadMainThread()).resolves.toBeUndefined();
    expect(restart).not.toHaveBeenCalled();
  });

  it("still notifies when a redundant switch to the same thread lands mid-reload", async () => {
    const core = await openRegularThread();
    const threadId = core.mainThreadId;

    let releaseRestart!: () => void;
    hookManagerOf(core).__internal_restartThreadRuntime = () =>
      new Promise((resolve) => {
        releaseRestart = () => resolve({});
      });

    const reloadTask = core.reloadMainThread();
    // bumps the switch generation without changing the main thread
    await core.switchToThread(threadId);

    const callback = vi.fn();
    core.subscribe(callback);
    releaseRestart();
    await reloadTask;

    expect(callback).toHaveBeenCalled();
  });

  it("resolves quietly when the thread is removed mid-reload", async () => {
    const core = await openRegularThread();

    hookManagerOf(core).__internal_restartThreadRuntime = async () => {
      (core as unknown as { _mainThreadId: string })._mainThreadId = "other";
      throw new Error("Thread was deleted before runtime was started");
    };

    await expect(core.reloadMainThread()).resolves.toBeUndefined();
  });

  it("surfaces a restart failure that is not a lifecycle handover", async () => {
    const core = await openRegularThread();

    hookManagerOf(core).__internal_restartThreadRuntime = async () => {
      throw new Error("boom");
    };

    await expect(core.reloadMainThread()).rejects.toThrow("boom");
  });

  it("lets a switch to a different thread win the notification", async () => {
    const core = await openRegularThread();

    let releaseRestart!: () => void;
    hookManagerOf(core).__internal_restartThreadRuntime = () =>
      new Promise((resolve) => {
        releaseRestart = () => resolve({});
      });

    const reloadTask = core.reloadMainThread();
    (core as unknown as { _mainThreadId: string })._mainThreadId = "elsewhere";

    const callback = vi.fn();
    core.subscribe(callback);
    releaseRestart();
    await reloadTask;

    expect(callback).not.toHaveBeenCalled();
  });
});

describe("RemoteThreadListThreadListRuntimeCore.reloadMainThread capability dispatch", () => {
  it("prefers the runtime's in-place reload over remounting", async () => {
    const core = await openRegularThread();
    const reload = vi.fn(async () => {});
    const restart = vi.fn(async () => ({}));
    hookManagerOf(core).getThreadRuntimeCore = () => ({
      unstable_refetchThread: reload,
      capabilities: { cancel: false },
    });
    hookManagerOf(core).__internal_restartThreadRuntime = restart;

    await core.reloadMainThread();

    expect(reload).toHaveBeenCalledOnce();
    expect(restart).not.toHaveBeenCalled();
  });

  it("leaves a run in progress to the capability implementation", async () => {
    const core = await openRegularThread();
    const cancelRun = vi.fn();
    hookManagerOf(core).getThreadRuntimeCore = () => ({
      unstable_refetchThread: async () => {},
      capabilities: { cancel: true },
      isRunning: true,
      cancelRun,
    });

    await core.reloadMainThread();

    // cancelRun returns the trailing user message to the composer, which is
    // the wrong thing to do to a thread that is only being refetched
    expect(cancelRun).not.toHaveBeenCalled();
  });

  it("notifies subscribers after an in-place reload", async () => {
    const core = await openRegularThread();
    hookManagerOf(core).getThreadRuntimeCore = () => ({
      unstable_refetchThread: async () => {},
      capabilities: { cancel: false },
    });

    const callback = vi.fn();
    core.subscribe(callback);
    await core.reloadMainThread();

    expect(callback).toHaveBeenCalled();
  });

  it("falls back to remounting when the runtime lacks the capability", async () => {
    const core = await openRegularThread();
    const restart = vi.fn(async () => ({}));
    hookManagerOf(core).getThreadRuntimeCore = () => ({});
    hookManagerOf(core).__internal_restartThreadRuntime = restart;

    await core.reloadMainThread();

    expect(restart).toHaveBeenCalledExactlyOnceWith(core.mainThreadId);
  });

  it("falls back to remounting when no runtime is attached yet", async () => {
    const core = await openRegularThread();
    const restart = vi.fn(async () => ({}));
    hookManagerOf(core).getThreadRuntimeCore = () => undefined;
    hookManagerOf(core).__internal_restartThreadRuntime = restart;

    await core.reloadMainThread();

    expect(restart).toHaveBeenCalledOnce();
  });

  it("lets a switch to a different thread win the notification after an in-place reload", async () => {
    const core = await openRegularThread();

    let releaseReload!: () => void;
    hookManagerOf(core).getThreadRuntimeCore = () => ({
      unstable_refetchThread: () =>
        new Promise<void>((resolve) => {
          releaseReload = resolve;
        }),
      capabilities: { cancel: false },
    });

    const reloadTask = core.reloadMainThread();
    (core as unknown as { _mainThreadId: string })._mainThreadId = "elsewhere";

    const callback = vi.fn();
    core.subscribe(callback);
    releaseReload();
    await reloadTask;

    expect(callback).not.toHaveBeenCalled();
  });

  it("propagates an in-place reload failure", async () => {
    const core = await openRegularThread();
    hookManagerOf(core).getThreadRuntimeCore = () => ({
      unstable_refetchThread: async () => {
        throw new Error("refetch failed");
      },
      capabilities: { cancel: false },
    });

    await expect(core.reloadMainThread()).rejects.toThrow("refetch failed");
  });
});
