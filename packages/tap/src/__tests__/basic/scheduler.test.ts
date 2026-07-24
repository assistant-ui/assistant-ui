import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("UpdateScheduler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("only refs Node MessageChannel ports while a flush is pending", async () => {
    const receiver = {
      onmessage: null as (() => void) | null,
      ref: vi.fn(),
      unref: vi.fn(),
    };
    const sender = {
      postMessage: vi.fn(),
      ref: vi.fn(),
      unref: vi.fn(),
    };

    class MessageChannelMock {
      readonly port1 = receiver;
      readonly port2 = sender;
    }

    vi.stubGlobal("MessageChannel", MessageChannelMock);

    const { UpdateScheduler } = await import("../../core/scheduler");
    const task = vi.fn();

    expect(receiver.unref).toHaveBeenCalledOnce();
    expect(sender.unref).toHaveBeenCalledOnce();

    new UpdateScheduler(task).markDirty();

    expect(receiver.ref).toHaveBeenCalledOnce();
    expect(sender.ref).toHaveBeenCalledOnce();
    expect(sender.postMessage).toHaveBeenCalledOnce();
    expect(task).not.toHaveBeenCalled();

    receiver.onmessage?.();

    expect(task).toHaveBeenCalledOnce();
    expect(receiver.unref).toHaveBeenCalledTimes(2);
    expect(sender.unref).toHaveBeenCalledTimes(2);
  });

  it("supports browser MessageChannel ports without lifecycle methods", async () => {
    const port1 = {
      onmessage: null as (() => void) | null,
    };
    const postMessage = vi.fn(() => port1.onmessage?.());

    class MessageChannelMock {
      readonly port1 = port1;
      readonly port2 = { postMessage };
    }

    vi.stubGlobal("MessageChannel", MessageChannelMock);

    const { UpdateScheduler } = await import("../../core/scheduler");
    const task = vi.fn();

    new UpdateScheduler(task).markDirty();

    expect(postMessage).toHaveBeenCalledOnce();
    expect(task).toHaveBeenCalledOnce();
  });
});
