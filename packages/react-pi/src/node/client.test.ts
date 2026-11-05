import { afterEach, describe, expect, it, vi } from "vitest";
import { createPiNodeClient } from "./client";

const supervisor = vi.hoisted(() => ({
  getAvailableModels: vi.fn(async () => []),
}));

vi.mock("./ThreadSupervisor", () => ({
  PiThreadSupervisor: vi.fn(function () {
    return supervisor;
  }),
}));

afterEach(() => {
  delete (globalThis as Record<string, unknown>)
    .__assistantUiPiThreadSupervisor;
});

describe("createPiNodeClient", () => {
  it("lists models for the requested thread", async () => {
    const client = createPiNodeClient();

    await client.getAvailableModels({ workspacePath: "/ws", threadId: "t1" });

    expect(supervisor.getAvailableModels).toHaveBeenLastCalledWith({
      threadId: "t1",
    });
  });

  it("lists the process-wide catalog without a thread", async () => {
    const client = createPiNodeClient();

    await client.getAvailableModels({ workspacePath: "/ws" });

    expect(supervisor.getAvailableModels).toHaveBeenLastCalledWith(undefined);
  });
});
