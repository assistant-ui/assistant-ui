import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@/lib/anonymous-session", async (importOriginal) => ({
  ...(await importOriginal()),
  requirePublicAssistantSession: () => ({ id: "session_1234567890" }),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkFollowUpSuggestionRateLimit: async () => null,
}));

vi.mock("@/lib/posthog-server", async (importOriginal) => ({
  ...(await importOriginal()),
  getDistinctId: () => "distinct_1234567890",
}));

let POST: typeof import("./route").POST;

beforeAll(async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_BASE_URL", "https://gateway.test/v1");
  ({ POST } = await import("./route"));
});

beforeEach(() => {
  vi.stubGlobal("fetch", mocks.fetch);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

afterAll(() => vi.unstubAllEnvs());

const completion = {
  id: "chatcmpl-test",
  object: "chat.completion",
  created: 1_700_000_000,
  model: "deepseek-v4.1-flash",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content:
          "1. Explain the tradeoffs\n2. Draw a diagram\n3. Remember this preference",
      },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
};

const request = () =>
  new Request("https://www.assistant-ui.com/api/suggestions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "Suggest follow-ups about thread state" }),
  });

describe("POST /api/suggestions with the real OpenAI provider", () => {
  it.each([
    ["conventional", completion],
    ["wrapped", { success: true, data: completion }],
  ])("returns follow-ups from a %s completion", async (_name, payload) => {
    mocks.fetch.mockResolvedValue(Response.json(payload));

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      suggestions: [
        "Explain the tradeoffs",
        "Draw a diagram",
        "Remember this preference",
      ],
    });
    expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(mocks.fetch.mock.calls[0]![0]).toBe(
      "https://gateway.test/v1/chat/completions",
    );
  });

  it.each([
    ["malformed conventional choices", { choices: "invalid" }],
    [
      "malformed wrapped choices",
      { success: true, data: { choices: "invalid" } },
    ],
    [
      "invalid wrapped message",
      {
        success: true,
        data: { choices: [{ index: 0, message: { content: 42 } }] },
      },
    ],
    ["empty wrapped choices", { success: true, data: { choices: [] } }],
    ["missing wrapped data", { success: true }],
    ["failed envelope", { success: false, data: completion }],
    ["missing success flag", { data: completion }],
    ["non-boolean success flag", { success: "true", data: completion }],
    [
      "malformed top-level choices alongside valid data",
      { choices: "invalid", success: true, data: completion },
    ],
  ])("rejects %s instead of returning suggestions", async (_name, payload) => {
    mocks.fetch.mockResolvedValue(Response.json(payload));

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ suggestions: [] });
    expect(console.error).toHaveBeenCalledWith(
      "[api/suggestions] model call failed",
      expect.any(Error),
    );
  });

  it("rejects invalid JSON", async () => {
    mocks.fetch.mockResolvedValue(
      new Response("{not json", {
        headers: { "content-type": "application/json" },
      }),
    );

    expect(await (await POST(request())).json()).toEqual({ suggestions: [] });
  });

  it("preserves an upstream HTTP error even when its body resembles a success", async () => {
    mocks.fetch.mockResolvedValue(
      Response.json({ success: true, data: completion }, { status: 400 }),
    );

    expect(await (await POST(request())).json()).toEqual({ suggestions: [] });
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });

  it("returns no suggestions when the gateway is out of quota", async () => {
    mocks.fetch.mockImplementation(async () =>
      Response.json(
        { error: "You have reached your weekly Clinepass limit" },
        { status: 429, headers: { "retry-after-ms": "0" } },
      ),
    );

    const response = await POST(request());

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ suggestions: [] });
    expect(body).not.toMatch(/clinepass|gateway/i);
  });
});
