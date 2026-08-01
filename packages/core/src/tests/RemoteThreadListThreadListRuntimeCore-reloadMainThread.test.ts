import { describe, it, expect, vi } from "vitest";
import { createCore, makeAdapter } from "./remote-thread-list-test-helpers";
import type { RemoteThreadListThreadListRuntimeCore } from "../react/runtimes/RemoteThreadListThreadListRuntimeCore";

type HookManagerStub = {
  startThreadRuntime: (id: string) => Promise<unknown>;
  __internal_restartThreadRuntime: (id: string) => Promise<unknown>;
};

const hookManagerOf = (core: RemoteThreadListThreadListRuntimeCore) =>
  (core as unknown as { _hookManager: HookManagerStub })._hookManager;

describe("RemoteThreadListThreadListRuntimeCore.reloadMainThread", () => {
  it("restarts the runtime of the thread that is currently open", async () => {
    const core = createCore(makeAdapter());
    await core.switchToNewThread();
    const threadId = core.mainThreadId;

    const restart = vi.fn(async () => ({}));
    hookManagerOf(core).__internal_restartThreadRuntime = restart;

    await core.reloadMainThread();

    expect(restart).toHaveBeenCalledExactlyOnceWith(threadId);
  });

  it("notifies subscribers so the reloaded thread re-renders", async () => {
    const core = createCore(makeAdapter());
    await core.switchToNewThread();
    hookManagerOf(core).__internal_restartThreadRuntime = async () => ({});

    const callback = vi.fn();
    core.subscribe(callback);
    await core.reloadMainThread();

    expect(callback).toHaveBeenCalled();
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
    const core = createCore(makeAdapter());
    await core.switchToNewThread();
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
    const core = createCore(makeAdapter());
    await core.switchToNewThread();

    hookManagerOf(core).__internal_restartThreadRuntime = async () => {
      (core as unknown as { _mainThreadId: string })._mainThreadId = "other";
      throw new Error("Thread was deleted before runtime was started");
    };

    await expect(core.reloadMainThread()).resolves.toBeUndefined();
  });

  it("surfaces a restart failure that is not a lifecycle handover", async () => {
    const core = createCore(makeAdapter());
    await core.switchToNewThread();

    hookManagerOf(core).__internal_restartThreadRuntime = async () => {
      throw new Error("boom");
    };

    await expect(core.reloadMainThread()).rejects.toThrow("boom");
  });

  it("lets a switch to a different thread win the notification", async () => {
    const core = createCore(makeAdapter());
    await core.switchToNewThread();

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
