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

  it("lets a thread switch started mid-reload win", async () => {
    const core = createCore(makeAdapter());
    await core.switchToNewThread();

    let releaseRestart!: () => void;
    hookManagerOf(core).__internal_restartThreadRuntime = () =>
      new Promise((resolve) => {
        releaseRestart = () => resolve({});
      });

    const reloadTask = core.reloadMainThread();
    await core.switchToNewThread();

    const callback = vi.fn();
    core.subscribe(callback);
    releaseRestart();
    await reloadTask;

    expect(callback).not.toHaveBeenCalled();
  });
});
