import { describe, it, expect, vi } from "vitest";
import type { RemoteThreadListAdapter } from "../runtimes/remote-thread-list/types";
import { createCore, makeAdapter } from "./remote-thread-list-test-helpers";

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
});
