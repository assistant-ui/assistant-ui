import { describe, it, expect, vi } from "vitest";
import type { RemoteThreadListAdapter } from "../runtimes/remote-thread-list/types";
import {
  createCore,
  deferred,
  makeAdapter,
} from "./remote-thread-list-test-helpers";

/**
 * Tests for onThreadIdChange, driving the real
 * RemoteThreadListThreadListRuntimeCore via a mock adapter (no React). These
 * exercise the actual _notifyThreadIdChange / _mainThreadRemoteId path and the
 * subscription + switchToThread wiring that invokes it.
 */
function createCoreWithCallback(
  onThreadIdChange: (id: string | undefined) => void,
  adapterOverrides: Partial<RemoteThreadListAdapter> = {},
) {
  const adapter = makeAdapter(adapterOverrides);
  const core = createCore(adapter, undefined, onThreadIdChange);
  return { core, adapter };
}

// Let the constructor's in-flight switchToNewThread settle.
const flush = () => new Promise((resolve) => setTimeout(resolve));

describe("onThreadIdChange", () => {
  it("does not emit while the active thread is still optimistic", async () => {
    const cb = vi.fn();
    createCoreWithCallback(cb);
    await flush();

    expect(cb).not.toHaveBeenCalled();
  });

  it("emits the remote ID once a new thread is initialized", async () => {
    const cb = vi.fn();
    const { core } = createCoreWithCallback(cb, {
      initialize: vi.fn(async () => ({
        remoteId: "remote-1",
        externalId: "ext-1",
      })),
    });
    await flush();

    const newThreadId = core.newThreadId!;
    expect(newThreadId).toBeDefined();
    expect(cb).not.toHaveBeenCalled(); // still optimistic, no remote ID

    await core.initialize(newThreadId);

    expect(cb).toHaveBeenLastCalledWith("remote-1");
  });

  it("emits the settled id before switching away from an initializing draft", async () => {
    const initialize = deferred<{ remoteId: string; externalId: undefined }>();
    const cb = vi.fn();
    const { core } = createCoreWithCallback(cb, {
      initialize: vi.fn(() => initialize.promise),
    });
    await flush();

    const initializingId = core.mainThreadId;
    const initialization = core.initialize(initializingId);
    expect(core.getItemById(initializingId)?.status).toBe("regular");

    const switchTask = core.switchToNewThread();
    expect(cb).not.toHaveBeenCalled();

    initialize.resolve({ remoteId: "r1", externalId: undefined });
    await initialization;
    await switchTask;

    expect(core.getItemById(core.mainThreadId)?.status).toBe("new");
    expect(cb.mock.calls.map(([id]) => id)).toEqual(["r1", undefined]);
  });

  it("keeps an echoed switch to an initializing thread selected until its id settles", async () => {
    const initialize = deferred<{ remoteId: string; externalId: undefined }>();
    const reportedIds: (string | undefined)[] = [];
    const cb = vi.fn((id: string | undefined) => {
      reportedIds.push(id);
      core.__internal_setOptions({
        adapter,
        runtimeHook: () => ({}) as never,
        threadId: id,
        onThreadIdChange: cb,
      });
    });
    const { core, adapter } = createCoreWithCallback(cb, {
      initialize: vi.fn(() => initialize.promise),
    });
    core.__internal_load();
    await core.getLoadThreadsPromise();
    await flush();

    const initializingId = core.mainThreadId;
    const initialization = core.initialize(initializingId);
    expect(core.getItemById(initializingId)?.status).toBe("regular");

    await core.switchToThread("r0");
    expect(reportedIds).toEqual(["r0"]);
    await core.switchToThread(initializingId);
    expect(core.mainThreadId).toBe(initializingId);
    expect(reportedIds).toEqual(["r0"]);

    initialize.resolve({ remoteId: "r1", externalId: undefined });
    await initialization;
    expect(core.mainThreadId).toBe(initializingId);
    expect(core.getItemById(initializingId)?.remoteId).toBe("r1");
    expect(reportedIds).toEqual(["r0", "r1"]);
  });

  it("emits the remote ID when switching to an existing thread", async () => {
    const cb = vi.fn();
    const { core } = createCoreWithCallback(cb);
    await flush();

    await core.switchToThread("existing-1");

    expect(cb).toHaveBeenLastCalledWith("existing-1");
  });

  it("dedupes: switching to the already-active thread does not re-emit", async () => {
    const cb = vi.fn();
    const { core } = createCoreWithCallback(cb);
    await flush();

    await core.switchToThread("existing-1");
    const callsAfterFirstSwitch = cb.mock.calls.length;

    await core.switchToThread("existing-1");

    expect(cb).toHaveBeenCalledTimes(callsAfterFirstSwitch);
  });

  it("never surfaces the transient local ID", async () => {
    const cb = vi.fn();
    const { core } = createCoreWithCallback(cb, {
      initialize: vi.fn(async () => ({
        remoteId: "remote-1",
        externalId: "ext-1",
      })),
    });
    await flush();

    const localId = core.newThreadId!;
    await core.initialize(localId);

    for (const [emitted] of cb.mock.calls) {
      expect(emitted).not.toBe(localId);
    }
  });

  it("does not reject a completed switch when the callback throws", async () => {
    const callbackError = new Error("host callback failed");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const cb = vi.fn(() => {
        throw callbackError;
      });
      const { core } = createCoreWithCallback(cb);
      await flush();

      await expect(core.switchToThread("existing-1")).resolves.toBeUndefined();

      expect(core.mainThreadId).toBe("existing-1");
      expect(cb).toHaveBeenCalledExactlyOnceWith("existing-1");
      expect(errorSpy).toHaveBeenCalledWith(
        "[assistant-ui] onThreadIdChange callback threw an error",
        callbackError,
      );

      await expect(core.switchToThread("existing-2")).resolves.toBeUndefined();
      expect(core.mainThreadId).toBe("existing-2");
      expect(cb).toHaveBeenLastCalledWith("existing-2");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("contains a rejected callback promise", async () => {
    const callbackError = new Error("async host callback failed");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const cb = vi.fn(async () => {
        throw callbackError;
      });
      const { core } = createCoreWithCallback(cb);
      await flush();

      await expect(core.switchToThread("existing-1")).resolves.toBeUndefined();
      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          "[assistant-ui] onThreadIdChange callback threw an error",
          callbackError,
        );
      });

      expect(core.mainThreadId).toBe("existing-1");
    } finally {
      errorSpy.mockRestore();
    }
  });
});
