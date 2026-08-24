import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  checkRateLimit: vi.fn(),
  getModel: vi.fn(),
}));

vi.mock("@/lib/anonymous-session", async (importOriginal) => ({
  ...(await importOriginal()),
  requirePublicAssistantSession: mocks.requireSession,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkPublicAssistantRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/lib/ai/provider", async (importOriginal) => ({
  ...(await importOriginal()),
  getModel: mocks.getModel,
}));

// @/lib/source and @/lib/llm-components import the build-generated
// "fumadocs-mdx:collections/server" module, which does not resolve in the test
// environment, so these two mocks fully replace the modules instead of
// spreading importOriginal().
vi.mock("@/lib/llm-components", () => ({ LLM_COMPONENTS: {} }));

vi.mock("@/lib/source", () => {
  const emptySource = {
    pageTree: { children: [] },
    getPage: vi.fn(),
  };
  return {
    source: emptySource,
    examples: emptySource,
    tapDocs: emptySource,
    getTapDocsPage: vi.fn(),
  };
});

import { POST } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/doc/chat access boundary", () => {
  it("rejects a direct request before rate limiting or model selection", async () => {
    mocks.requireSession.mockReturnValue(
      Response.json({ error: "website required" }, { status: 403 }),
    );

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/doc/chat", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.getModel).not.toHaveBeenCalled();
  });

  it("lets a valid session reach ordinary input validation", async () => {
    mocks.requireSession.mockReturnValue({
      id: "session_1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/doc/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      "session_1234567890",
    );
    expect(mocks.getModel).not.toHaveBeenCalled();
  });
});
