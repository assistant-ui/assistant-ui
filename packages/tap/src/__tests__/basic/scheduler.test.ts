import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("UpdateScheduler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers setImmediate when available", async () => {
    let scheduled: (() => void) | undefined;
    const setImmediateMock = vi.fn((callback: () => void) => {
      scheduled = callback;
    });
    const messageChannelMock = vi.fn();

    vi.stubGlobal("setImmediate", setImmediateMock);
    vi.stubGlobal("MessageChannel", messageChannelMock);

    const { UpdateScheduler } = await import("../../core/scheduler");
    const task = vi.fn();

    new UpdateScheduler(task).markDirty();

    expect(setImmediateMock).toHaveBeenCalledOnce();
    expect(messageChannelMock).not.toHaveBeenCalled();
    expect(task).not.toHaveBeenCalled();

    scheduled?.();

    expect(task).toHaveBeenCalledOnce();
  });

  it("uses MessageChannel when setImmediate is unavailable", async () => {
    const port1 = {
      onmessage: null as (() => void) | null,
    };
    const postMessage = vi.fn(() => port1.onmessage?.());

    class MessageChannelMock {
      readonly port1 = port1;
      readonly port2 = { postMessage };
    }

    vi.stubGlobal("setImmediate", undefined);
    vi.stubGlobal("MessageChannel", MessageChannelMock);

    const { UpdateScheduler } = await import("../../core/scheduler");
    const task = vi.fn();

    new UpdateScheduler(task).markDirty();

    expect(postMessage).toHaveBeenCalledOnce();
    expect(task).toHaveBeenCalledOnce();
  });
});
