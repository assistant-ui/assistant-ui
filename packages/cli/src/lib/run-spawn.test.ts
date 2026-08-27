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
  hasActiveSpawn,
  runSpawn,
  runSpawnCapture,
  SpawnExitError,
  SpawnSignalError,
} from "./run-spawn";

const createChild = () =>
  Object.assign(new EventEmitter(), {
    kill: vi.fn(() => true),
  });

const trackSignal = (signal: NodeJS.Signals) => {
  const before = new Set(process.listeners(signal));
  return {
    count: before.size,
    added: () =>
      process.listeners(signal).find((listener) => !before.has(listener)),
  };
};

describe("runSpawn", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("forwards the first termination signal and cleans up listeners", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const sigterm = trackSignal("SIGTERM");
    const result = runSpawn("assistant-ui", ["create"]);
    const signalHandler = sigterm.added();

    expect(signalHandler).toBeDefined();
    signalHandler?.("SIGTERM");
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");

    child.emit("close", null, "SIGTERM");
    await expect(result).rejects.toMatchObject({
      signal: "SIGTERM",
      forwarded: true,
    });
    expect(process.listenerCount("SIGTERM")).toBe(sigterm.count);
  });

  it("escalates a repeated termination signal", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const sigterm = trackSignal("SIGTERM");
    const result = runSpawn("assistant-ui", ["create"]);
    const signalHandler = sigterm.added();

    expect(signalHandler).toBeDefined();
    signalHandler?.("SIGTERM");
    signalHandler?.("SIGTERM");

    expect(child.kill).toHaveBeenNthCalledWith(1, "SIGTERM");
    expect(child.kill).toHaveBeenNthCalledWith(2, "SIGKILL");
    await expect(result).rejects.toBeInstanceOf(SpawnSignalError);
    expect(process.listenerCount("SIGTERM")).toBe(sigterm.count);
  });

  it("reports an active spawn only while the child is running", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);

    expect(hasActiveSpawn()).toBe(false);
    const result = runSpawn("assistant-ui", ["create"]);
    expect(hasActiveSpawn()).toBe(true);

    child.emit("close", 0, null);
    await result;

    expect(hasActiveSpawn()).toBe(false);
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
