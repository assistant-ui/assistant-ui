import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
}));

vi.mock("cross-spawn", async (importOriginal) => ({
  ...(await importOriginal()),
  spawn: mocks.spawn,
}));

import { main, runSpawn } from "./run";

const createChild = () =>
  Object.assign(new EventEmitter(), {
    kill: vi.fn(() => true),
  });

describe("runSpawn", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("forwards termination signals to the child", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const existingListeners = new Set(process.listeners("SIGTERM"));
    const initialListeners = process.listenerCount("SIGTERM");
    const result = runSpawn("assistant-ui", ["create"]);
    const signalHandler = process
      .listeners("SIGTERM")
      .find((listener) => !existingListeners.has(listener));

    expect(signalHandler).toBeDefined();
    signalHandler?.();
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");

    child.emit("close", 0, null);
    await expect(result).rejects.toMatchObject({
      signal: "SIGTERM",
      forwarded: true,
    });
    expect(process.listenerCount("SIGTERM")).toBe(initialListeners);
  });

  it("force-stops the child after a repeated termination signal", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const existingListeners = new Set(process.listeners("SIGTERM"));
    const initialListeners = process.listenerCount("SIGTERM");
    const result = runSpawn("assistant-ui", ["create"]);
    const signalHandler = process
      .listeners("SIGTERM")
      .find((listener) => !existingListeners.has(listener));

    expect(signalHandler).toBeDefined();
    signalHandler?.();
    signalHandler?.();

    expect(child.kill).toHaveBeenNthCalledWith(1, "SIGTERM");
    expect(child.kill).toHaveBeenNthCalledWith(2, "SIGKILL");
    await expect(result).rejects.toMatchObject({
      signal: "SIGTERM",
      forwarded: true,
    });
    expect(process.listenerCount("SIGTERM")).toBe(initialListeners);
  });

  it("distinguishes child crash signals from forwarded signals", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const result = runSpawn("assistant-ui", ["create"]);

    child.emit("close", null, "SIGSEGV");

    await expect(result).rejects.toMatchObject({
      signal: "SIGSEGV",
      forwarded: false,
    });
  });

  it("removes signal forwarding after normal completion", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const initialSigintListeners = process.listenerCount("SIGINT");
    const initialSigtermListeners = process.listenerCount("SIGTERM");
    const result = runSpawn("assistant-ui", ["create"]);

    child.emit("close", 0, null);
    await expect(result).resolves.toBeUndefined();

    expect(process.listenerCount("SIGINT")).toBe(initialSigintListeners);
    expect(process.listenerCount("SIGTERM")).toBe(initialSigtermListeners);
  });
});

describe("main", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("re-raises a signal forwarded to the child", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const existingListeners = new Set(process.listeners("SIGTERM"));
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);
    const removeAllListeners = vi
      .spyOn(process, "removeAllListeners")
      .mockReturnValue(process);
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    const result = main();

    await vi.waitFor(() => expect(mocks.spawn).toHaveBeenCalledOnce());
    const signalHandler = process
      .listeners("SIGTERM")
      .find((listener) => !existingListeners.has(listener));
    expect(signalHandler).toBeDefined();
    signalHandler?.();
    child.emit("close", null, "SIGTERM");

    await expect(result).rejects.toThrow("process.exit");
    expect(removeAllListeners).toHaveBeenCalledWith("SIGTERM");
    expect(kill).toHaveBeenCalledWith(process.pid, "SIGTERM");
    expect(removeAllListeners.mock.invocationCallOrder[0]).toBeLessThan(
      kill.mock.invocationCallOrder[0]!,
    );
    expect(exit).toHaveBeenCalledWith(143);
  });

  it("does not re-raise a signal received only by the child", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);
    const removeAllListeners = vi
      .spyOn(process, "removeAllListeners")
      .mockReturnValue(process);
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    const result = main();

    await vi.waitFor(() => expect(mocks.spawn).toHaveBeenCalledOnce());
    child.emit("close", null, "SIGSEGV");

    await expect(result).rejects.toThrow("process.exit");
    expect(removeAllListeners).not.toHaveBeenCalled();
    expect(kill).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(139);
  });
});
