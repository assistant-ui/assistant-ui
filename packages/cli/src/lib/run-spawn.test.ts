import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
}));

vi.mock("cross-spawn", async (importOriginal) => ({
  ...(await importOriginal()),
  spawn: mocks.spawn,
}));

import {
  runSpawn,
  runSpawnCapture,
  SpawnExitError,
  SpawnSignalError,
} from "./run-spawn";

const createChild = () =>
  Object.assign(new EventEmitter(), {
    kill: vi.fn(() => true),
  });

describe("runSpawn", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("forwards the first termination signal and cleans up listeners", async () => {
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

    child.emit("close", null, "SIGTERM");
    await expect(result).rejects.toMatchObject({
      signal: "SIGTERM",
      forwarded: true,
    });
    expect(process.listenerCount("SIGTERM")).toBe(initialListeners);
  });

  it("escalates a repeated termination signal", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const initialListeners = process.listenerCount("SIGTERM");
    const result = runSpawn("assistant-ui", ["create"]);
    const signalHandler = process.listeners("SIGTERM").at(-1);

    signalHandler?.();
    signalHandler?.();

    expect(child.kill).toHaveBeenNthCalledWith(1, "SIGTERM");
    expect(child.kill).toHaveBeenNthCalledWith(2, "SIGKILL");
    await expect(result).rejects.toBeInstanceOf(SpawnSignalError);
    expect(process.listenerCount("SIGTERM")).toBe(initialListeners);
  });

  it("preserves normal child exit handling", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const result = runSpawn("assistant-ui", ["create"]);

    child.emit("close", 0, null);

    await expect(result).resolves.toBeUndefined();
  });

  it("reports nonzero child exits", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const result = runSpawn("assistant-ui", ["create"]);

    child.emit("close", 7, null);

    await expect(result).rejects.toEqual(expect.any(SpawnExitError));
    await expect(result).rejects.toMatchObject({ code: 7 });
  });

  it("distinguishes child signals from forwarded signals", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const result = runSpawn("assistant-ui", ["create"]);

    child.emit("close", null, "SIGSEGV");

    await expect(result).rejects.toMatchObject({
      signal: "SIGSEGV",
      forwarded: false,
    });
  });

  it("captures output without blocking the event loop", async () => {
    const child = Object.assign(new EventEmitter(), {
      kill: vi.fn(() => true),
      stdout: new PassThrough(),
      stderr: new PassThrough(),
    });
    mocks.spawn.mockReturnValue(child);
    const result = runSpawnCapture("jscodeshift", ["--version"]);

    child.stdout.write("Processing file one\n");
    child.stderr.write("warning\n");
    child.stdout.end();
    child.stderr.end();
    child.emit("close", 0, null);

    await expect(result).resolves.toMatchObject({
      code: 0,
      signal: null,
      stdout: "Processing file one\n",
      stderr: "warning\n",
    });
  });
});
