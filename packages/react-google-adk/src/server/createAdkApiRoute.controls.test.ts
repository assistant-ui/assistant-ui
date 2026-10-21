import { describe, expect, it, vi } from "vitest";
import { createAdkApiRoute } from "./createAdkApiRoute";

const makeRequest = (body: unknown) =>
  new Request("https://example.test/api/adk", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("createAdkApiRoute request controls", () => {
  it("does not trust client run configuration or state by default", async () => {
    const runAsync = vi.fn(async function* () {});
    const handler = createAdkApiRoute({
      runner: { runAsync },
      userId: "user-1",
      sessionId: "session-1",
    });

    await handler(
      makeRequest({
        message: "Hello",
        runConfig: { maxLlmCalls: 1_000_000 },
        stateDelta: { "app:role": "admin" },
      }),
    );

    expect(runAsync).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: "session-1",
      newMessage: { role: "user", parts: [{ text: "Hello" }] },
    });
  });

  it("forwards only values returned by server resolvers", async () => {
    const runAsync = vi.fn(async function* () {});
    const resolveRunConfig = vi.fn(() => ({ maxLlmCalls: 10 }));
    const resolveStateDelta = vi.fn(() => ({ taskId: "server-task" }));
    const handler = createAdkApiRoute({
      runner: { runAsync },
      userId: "user-1",
      sessionId: "session-1",
      resolveRunConfig,
      resolveStateDelta,
    });
    const request = makeRequest({
      message: "Hello",
      runConfig: { maxLlmCalls: 1_000_000 },
      stateDelta: { "app:role": "admin" },
    });

    await handler(request);

    expect(resolveRunConfig).toHaveBeenCalledWith(request, {
      maxLlmCalls: 1_000_000,
    });
    expect(resolveStateDelta).toHaveBeenCalledWith(request, {
      "app:role": "admin",
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        runConfig: { maxLlmCalls: 10 },
        stateDelta: { taskId: "server-task" },
      }),
    );
  });
});
