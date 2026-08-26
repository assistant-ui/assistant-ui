import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
}));

vi.mock("cross-spawn", async (importOriginal) => ({
  ...(await importOriginal()),
  spawn: mocks.spawn,
}));

import { runSpawn } from "./run";

const createChild = () =>
  Object.assign(new EventEmitter(), {
    kill: vi.fn(() => true),
  });

describe("runSpawn", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("forwards termination signals to the child", async () => {
    const child = createChild();
    mocks.spawn.mockReturnValue(child);
    const initialListeners = process.listenerCount("SIGTERM");
    const result = runSpawn("assistant-ui", ["create"]);

    process.emit("SIGTERM", "SIGTERM");
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");

    child.emit("close", 0, null);
    await expect(result).rejects.toMatchObject({ signal: "SIGTERM" });
    expect(process.listenerCount("SIGTERM")).toBe(initialListeners);
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
