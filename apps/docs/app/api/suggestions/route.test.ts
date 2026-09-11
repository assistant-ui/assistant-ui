import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODEL_ID } from "@/lib/model";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  checkRateLimit: vi.fn(),
  getModel: vi.fn(),
  getDistinctId: vi.fn(),
  generateText: vi.fn(),
}));

vi.mock("@/lib/anonymous-session", async (importOriginal) => ({
  ...(await importOriginal()),
  requirePublicAssistantSession: mocks.requireSession,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkFollowUpSuggestionRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/lib/ai/provider", async (importOriginal) => ({
  ...(await importOriginal()),
  getModel: mocks.getModel,
}));

vi.mock("@/lib/posthog-server", async (importOriginal) => ({
  ...(await importOriginal()),
  getDistinctId: mocks.getDistinctId,
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal()),
  generateText: mocks.generateText,
}));

import { POST } from "./route";

const request = (prompt: unknown) =>
  new Request("https://www.assistant-ui.com/api/suggestions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/suggestions", () => {
  it("returns the session guard response unchanged", async () => {
    const denied = new Response("website required", { status: 403 });
    mocks.requireSession.mockReturnValue(denied);

    expect(await POST(request("Hello"))).toBe(denied);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.getModel).not.toHaveBeenCalled();
  });

  it("rejects a prompt that is missing or blank", async () => {
    mocks.requireSession.mockReturnValue({
      id: "session_1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);

    const response = await POST(request("   "));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid prompt");
    expect(mocks.getModel).not.toHaveBeenCalled();
  });

  it("rejects a malformed body without failing as a server error", async () => {
    mocks.requireSession.mockReturnValue({
      id: "session_1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ not json",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.getModel).not.toHaveBeenCalled();
  });

  it("keeps the task instruction and the newest turns of a long transcript", async () => {
    mocks.requireSession.mockReturnValue({
      id: "session_1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.getModel.mockReturnValue({});
    mocks.getDistinctId.mockReturnValue("distinct_1234567890");
    mocks.generateText.mockResolvedValue({ text: "One" });

    const prompt = `HEAD${"x".repeat(30_000)}TAIL`;
    const response = await POST(request(prompt));

    expect(response.status).toBe(200);
    const sent = mocks.generateText.mock.calls[0]![0].prompt as string;
    expect(sent.startsWith("HEAD")).toBe(true);
    expect(sent.endsWith("TAIL")).toBe(true);
    expect(sent.length).toBeLessThan(prompt.length);
  });

  it("returns three trimmed suggestions", async () => {
    const model = {};
    mocks.requireSession.mockReturnValue({
      id: "session_1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.getModel.mockReturnValue(model);
    mocks.getDistinctId.mockReturnValue("distinct_1234567890");
    mocks.generateText.mockResolvedValue({
      text: " - \"Ask a deeper question\"\n2. “Draw a diagram”\n• 'Remember this preference'",
    });

    const response = await POST(request("Explain thread state"));

    expect(await response.json()).toEqual({
      suggestions: [
        "Ask a deeper question",
        "Draw a diagram",
        "Remember this preference",
      ],
    });
    expect(mocks.getModel).toHaveBeenCalledWith(DEFAULT_MODEL_ID);
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model,
        prompt: "Explain thread state",
        maxOutputTokens: 160,
      }),
    );
  });
});
