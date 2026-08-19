import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOptionalAiBuilderUserId: vi.fn(),
  requireAnonymousSession: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/feature-flags", async (importOriginal) => ({
  ...(await importOriginal()),
  isAiPlaygroundEnabled: true,
}));

vi.mock("@/lib/ai-builder-auth", async (importOriginal) => ({
  ...(await importOriginal()),
  getOptionalAiBuilderUserId: mocks.getOptionalAiBuilderUserId,
}));

vi.mock("@/lib/anonymous-session", async (importOriginal) => ({
  ...(await importOriginal()),
  requireAnonymousSession: mocks.requireAnonymousSession,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkRateLimit: mocks.checkRateLimit,
}));

import { POST } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/playground-chat identity", () => {
  it("uses a verified user quota after sign-in", async () => {
    mocks.getOptionalAiBuilderUserId.mockResolvedValue("user_123");
    mocks.checkRateLimit.mockResolvedValue(
      new Response("limited", { status: 429 }),
    );
    const request = new Request(
      "https://www.assistant-ui.com/api/playground-chat",
      { method: "POST" },
    );

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(request, "user:user_123");
    expect(mocks.requireAnonymousSession).not.toHaveBeenCalled();
  });

  it("keeps signed-out Playground requests anonymous", async () => {
    mocks.getOptionalAiBuilderUserId.mockResolvedValue(null);
    mocks.requireAnonymousSession.mockReturnValue({ id: "session_123" });
    mocks.checkRateLimit.mockResolvedValue(
      new Response("limited", { status: 429 }),
    );
    const request = new Request(
      "https://www.assistant-ui.com/api/playground-chat",
      { method: "POST" },
    );

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      request,
      "anonymous:session_123",
    );
  });
});
