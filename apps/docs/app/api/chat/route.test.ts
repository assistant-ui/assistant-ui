import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAnonymousSession: vi.fn(),
  checkRateLimit: vi.fn(),
  getModel: vi.fn(),
}));

vi.mock("@/lib/anonymous-session", async (importOriginal) => ({
  ...(await importOriginal()),
  requireAnonymousSession: mocks.requireAnonymousSession,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/lib/ai/provider", async (importOriginal) => ({
  ...(await importOriginal()),
  getModel: mocks.getModel,
}));

import { POST } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/chat access boundary", () => {
  it("does not trust an allowed Origin without a signed session", async () => {
    mocks.requireAnonymousSession.mockReturnValue(
      Response.json({ error: "session required" }, { status: 401 }),
    );

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://assistant-ui-expo.vercel.app",
        },
        body: JSON.stringify({ messages: [] }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.getModel).not.toHaveBeenCalled();
  });

  it("stops before model selection when a quota is exhausted", async () => {
    mocks.requireAnonymousSession.mockReturnValue({
      id: "session_1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(
      new Response("limited", { status: 429 }),
    );

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      }),
    );

    expect(response.status).toBe(429);
    expect(mocks.getModel).not.toHaveBeenCalled();
  });
});
