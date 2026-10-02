import { describe, expect, it, vi } from "vitest";
import { createAdkApiRoute } from "./createAdkApiRoute";

describe("createAdkApiRoute", () => {
  it("passes the client thread ID to the session resolver", async () => {
    const runAsync = vi.fn(async function* () {});
    const sessionId = vi.fn(
      (_request: Request, clientSessionId: string | undefined) => {
        if (!clientSessionId) throw new Error("Missing session ID");
        return `scoped-${clientSessionId}`;
      },
    );
    const handler = createAdkApiRoute({
      runner: { runAsync },
      userId: "user-1",
      sessionId,
    });

    await handler(
      new Request("https://example.test/api/adk", {
        method: "POST",
        body: JSON.stringify({ message: "Hello", sessionId: "thread-1" }),
      }),
    );

    expect(sessionId).toHaveBeenCalledWith(expect.any(Request), "thread-1");
    expect(runAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        sessionId: "scoped-thread-1",
      }),
    );
  });
});
