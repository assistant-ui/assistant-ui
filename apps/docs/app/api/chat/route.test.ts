import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  checkRateLimit: vi.fn(),
  resolveChatModel: vi.fn(),
  docsToolkit: {},
  resolveDemoIdentity: vi.fn(),
  claimConversation: vi.fn(),
  streamDocsChat: vi.fn(),
  getSession: vi.fn(async (): Promise<{ user: { id: string } } | null> => null),
  checkChatRateLimit: vi.fn(async (): Promise<Response | null> => null),
  recordChatTokens: vi.fn(async () => {}),
  reserveChatTokens: vi.fn(async (): Promise<Response | null> => null),
  captureTurn: vi.fn(async () => {}),
  captureRefusal: vi.fn(async () => {}),
}));

vi.mock("@/lib/accounts-auth", () => ({ getSession: mocks.getSession }));

vi.mock("@/lib/anonymous-session", async (importOriginal) => ({
  ...(await importOriginal()),
  requirePublicAssistantSession: mocks.requireSession,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkPublicAssistantRateLimit: mocks.checkRateLimit,
  checkChatRateLimit: mocks.checkChatRateLimit,
  recordChatTokens: mocks.recordChatTokens,
  reserveChatTokens: mocks.reserveChatTokens,
}));

vi.mock("@/lib/ai/telemetry", async (importOriginal) => ({
  ...(await importOriginal()),
  captureChatTurn: mocks.captureTurn,
  captureChatRefusal: mocks.captureRefusal,
}));

vi.mock("@/lib/ai/provider", async (importOriginal) => ({
  ...(await importOriginal()),
  resolveChatModel: mocks.resolveChatModel,
}));

// @/lib/docs-toolkit's UI component graph does not resolve in the test
// environment, so this mock fully replaces the module (its only export)
// instead of spreading importOriginal().
vi.mock("@/lib/docs-toolkit", () => ({ default: mocks.docsToolkit }));

// demo-usage reaches the accounts session and Upstash behind a server-only
// guard, so this mock replaces the module rather than spreading it.
vi.mock("@/lib/demo-usage", () => ({
  resolveDemoIdentity: mocks.resolveDemoIdentity,
  claimConversation: mocks.claimConversation,
}));

// The model call is replaced so a test can read the system prompt and tools
// the route hands it.
vi.mock("@/lib/ai/chat-route", async (importOriginal) => ({
  ...(await importOriginal()),
  streamDocsChat: mocks.streamDocsChat,
}));

import { POST } from "./route";

describe("POST /api/chat access boundary", () => {
  it("rejects a direct request before model selection", async () => {
    mocks.requireSession.mockReturnValue(
      Response.json({ error: "website required" }, { status: 403 }),
    );

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
  });

  it("stops before model selection when a generous quota is exhausted", async () => {
    mocks.requireSession.mockReturnValue({
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
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
  });

  it("rejects oversized frontend tools before model selection", async () => {
    mocks.requireSession.mockReturnValue({
      id: "session_1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              id: "user-message",
              role: "user",
              parts: [{ type: "text", text: "Search the docs" }],
            },
          ],
          tools: {
            search: {
              description: "x".repeat(96_000),
              parameters: { type: "object", properties: {} },
            },
          },
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Tools too large");
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
  });

  it("rejects malformed frontend tools before model selection", async () => {
    mocks.requireSession.mockReturnValue({
      id: "session_1234567890",
      expiresAt: Date.now() + 60_000,
    });
    mocks.checkRateLimit.mockResolvedValue(null);

    const response = await POST(
      new Request("https://www.assistant-ui.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              id: "user-message",
              role: "user",
              parts: [{ type: "text", text: "Search the docs" }],
            },
          ],
          tools: "search",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Invalid tools format");
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
  });
});

// The claim sits after model resolution and the reserved-tool check, so the
// request has to survive that far to reach it.
const allowed = () => {
  mocks.requireSession.mockReturnValue({
    id: "session_1234567890",
    expiresAt: Date.now() + 60_000,
  });
  mocks.checkRateLimit.mockResolvedValue(null);
  mocks.resolveChatModel.mockReturnValue({
    model: {},
    providerOptions: {},
    reasoning: undefined,
  });
};

// A valid message, because the claim now sits after input validation and a
// rejected request must not spend a slot.
const message = {
  id: "m1",
  role: "user",
  parts: [{ type: "text", text: "hello" }],
};

const send = (
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) =>
  POST(
    new Request("https://www.assistant-ui.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );

const sameOrigin = { "sec-fetch-site": "same-origin" };

describe("POST /api/chat conversation budget", () => {
  it("does not spend a slot on a request the route rejects", async () => {
    allowed();

    const response = await send({
      messages: [],
      id: "thread_1",
      countConversations: true,
    });

    expect(response.status).toBe(400);
    expect(mocks.claimConversation).not.toHaveBeenCalled();
  });

  it("leaves every surface that does not opt in out of the budget", async () => {
    allowed();

    await send({ messages: [message], id: "thread_1" }).catch(() => null);

    expect(mocks.claimConversation).not.toHaveBeenCalled();
  });

  it("claims the thread under the visitor's identity when it opts in", async () => {
    allowed();
    mocks.resolveDemoIdentity.mockResolvedValue({
      identity: "anon:session_1234567890",
      signedIn: false,
      limit: 3,
    });
    mocks.claimConversation.mockResolvedValue({
      allowed: true,
      usage: { used: 1, limit: 3, remaining: 2, resetAt: Date.now() + 60_000 },
    });

    await send(
      {
        messages: [message],
        id: "thread_1",
        countConversations: true,
      },
      {
        "x-vercel-forwarded-for": "203.0.113.7",
        "x-forwarded-for": "198.51.100.1",
      },
    ).catch(() => null);

    expect(mocks.resolveDemoIdentity).toHaveBeenCalledWith(
      "session_1234567890",
    );
    expect(mocks.claimConversation).toHaveBeenCalledWith(
      { identity: "anon:session_1234567890", signedIn: false, limit: 3 },
      "thread_1",
      "203.0.113.7",
    );
  });

  it("refuses a new conversation once the day is spent", async () => {
    allowed();
    mocks.resolveDemoIdentity.mockResolvedValue({
      identity: "anon:session_1234567890",
      signedIn: false,
      limit: 3,
    });
    mocks.claimConversation.mockResolvedValue({
      allowed: false,
      usage: { used: 3, limit: 3, remaining: 0, resetAt: Date.now() + 60_000 },
    });

    const response = await send({
      messages: [message],
      id: "thread_4",
      countConversations: true,
    });

    expect(response.status).toBe(429);
    expect(await response.text()).toBe("Daily conversation limit reached");
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(mocks.captureRefusal).toHaveBeenCalledWith(
      "rate_limited",
      "home_demo",
    );
  });
});

describe("POST /api/chat generative UI", () => {
  const streamed = () =>
    mocks.streamDocsChat.mockReturnValue({
      result: {
        toUIMessageStream: () =>
          new ReadableStream({ start: (controller) => controller.close() }),
      },
      messageMetadata: () => undefined,
    });
  const claimAllowed = () => {
    mocks.resolveDemoIdentity.mockResolvedValue({
      identity: "anon:session_1234567890",
      signedIn: false,
      limit: 3,
    });
    mocks.claimConversation.mockResolvedValue({
      allowed: true,
      usage: { used: 1, limit: 3, remaining: 2, resetAt: Date.now() + 60_000 },
    });
  };
  const modelOptions = (call: number) =>
    mocks.streamDocsChat.mock.calls[call]![3] as {
      system?: string;
      tools: Record<string, unknown>;
    };

  it("passes account session status to model selection", async () => {
    allowed();
    streamed();
    mocks.getSession.mockResolvedValueOnce({ user: { id: "user_1" } });

    await (
      await send({
        messages: [message],
        config: { modelName: "gpt-6-luna" },
      })
    ).text();

    expect(mocks.resolveChatModel).toHaveBeenCalledWith(
      { modelName: "gpt-6-luna" },
      { signedIn: true },
    );
  });

  it("selects the model as signed out without an account session", async () => {
    allowed();
    streamed();

    await (
      await send({
        messages: [message],
        config: { modelName: "gpt-6-luna" },
      })
    ).text();

    expect(mocks.resolveChatModel).toHaveBeenCalledWith(
      { modelName: "gpt-6-luna" },
      { signedIn: false },
    );
  });

  it("selects the model as signed out when the account session read fails", async () => {
    allowed();
    streamed();
    mocks.getSession.mockRejectedValueOnce(new Error("accounts unavailable"));

    const response = await send({
      messages: [message],
      config: { modelName: "gpt-6-luna" },
    });
    await response.text();

    expect(response.status).toBe(200);
    expect(mocks.resolveChatModel).toHaveBeenCalledWith(
      { modelName: "gpt-6-luna" },
      { signedIn: false },
    );
  });

  it("gives image search only to a client that renders specs", async () => {
    allowed();
    streamed();
    const renderSpec = {
      description: "Shows a spec.",
      parameters: { type: "object", properties: {} },
    };

    await (
      await send({ messages: [message], tools: { render_spec: renderSpec } })
    ).text();
    await (await send({ messages: [message] })).text();

    expect(modelOptions(0).tools).toHaveProperty("search_images");
    expect(modelOptions(1).tools).not.toHaveProperty("search_images");
  });

  it("keeps a longer system prompt only on the landing page demo", async () => {
    allowed();
    streamed();
    claimAllowed();
    const system = "x".repeat(10_000);

    await (
      await send(
        {
          messages: [message],
          system,
          id: "thread_1",
          countConversations: true,
        },
        sameOrigin,
      )
    ).text();
    await (await send({ messages: [message], system }, sameOrigin)).text();

    expect(modelOptions(0).system).toBe(system);
    expect(modelOptions(1)).not.toHaveProperty("system");
  });

  it("bounds only what the user types on the landing page demo", async () => {
    allowed();
    streamed();
    claimAllowed();
    const answer = {
      id: "a1",
      role: "assistant",
      parts: [{ type: "text", text: "x".repeat(60_000) }],
    };
    const pasted = {
      ...message,
      parts: [{ type: "text", text: "x".repeat(20_000) }],
    };

    const demo = await send(
      {
        messages: [message, answer],
        id: "thread_1",
        countConversations: true,
      },
      sameOrigin,
    );
    const docs = await send({ messages: [message, answer] }, sameOrigin);
    const typed = await send(
      { messages: [pasted], id: "thread_1", countConversations: true },
      sameOrigin,
    );

    expect(demo.status).toBe(200);
    expect(docs.status).toBe(400);
    expect(await docs.text()).toBe("Single message too long");
    expect(typed.status).toBe(400);
    expect(await typed.text()).toBe("Single message too long");
  });

  it("prunes earlier tool calls from what the landing page demo sends the model", async () => {
    allowed();
    streamed();
    claimAllowed();
    const history = [
      message,
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "step-start" },
          {
            type: "tool-search_images",
            toolCallId: "c1",
            state: "output-available",
            input: { queries: ["Big Sur"] },
            output: { results: [] },
          },
          { type: "step-start" },
          { type: "text", text: "Here is the plan." },
        ],
      },
      { ...message, id: "m2" },
    ];
    const toolCallsIn = (call: number) =>
      (
        mocks.streamDocsChat.mock.calls[call]![3] as {
          messages: { content: unknown }[];
        }
      ).messages.flatMap((entry) =>
        Array.isArray(entry.content)
          ? entry.content.filter(
              (part: { type?: string }) => part.type === "tool-call",
            )
          : [],
      );

    await (
      await send(
        { messages: history, id: "thread_1", countConversations: true },
        sameOrigin,
      )
    ).text();
    await (await send({ messages: history }, sameOrigin)).text();

    expect(toolCallsIn(0)).toEqual([]);
    expect(toolCallsIn(1)).toHaveLength(1);
  });

  it("keeps the general limits for a budgeted request from another site", async () => {
    allowed();
    streamed();
    claimAllowed();
    const long = {
      ...message,
      parts: [{ type: "text", text: "x".repeat(20_000) }],
    };

    const response = await send(
      { messages: [long], id: "thread_1", countConversations: true },
      { "sec-fetch-site": "cross-site" },
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Single message too long");
  });
});

describe("POST /api/chat model provider failures", () => {
  it("streams the usage limit notice instead of the provider's error", async () => {
    const { APICallError, streamText } = await import("ai");
    const { MockLanguageModelV4 } = await import("ai/test");
    const { MODEL_PROVIDER_LIMIT_MESSAGE } =
      await import("@/lib/public-assistant-errors");
    allowed();
    mocks.streamDocsChat.mockImplementation(() => ({
      result: streamText({
        model: new MockLanguageModelV4({
          doStream: async () => {
            throw new APICallError({
              message: "Error 429: You have reached your weekly plan limit.",
              url: "https://gateway.example.test/v1/responses",
              requestBodyValues: {},
              statusCode: 429,
            });
          },
        }),
        prompt: "hello",
        maxRetries: 0,
        onError: () => {},
      }),
      messageMetadata: () => undefined,
    }));

    const body = await (await send({ messages: [message] })).text();

    expect(body).toContain(JSON.stringify(MODEL_PROVIDER_LIMIT_MESSAGE));
    expect(body).not.toMatch(/plan limit|gateway\.example/i);
    expect(body).not.toContain("An error occurred.");
  });
});

describe("POST /api/chat hardening", () => {
  const streamed = () =>
    mocks.streamDocsChat.mockReturnValue({
      result: {
        toUIMessageStream: () =>
          new ReadableStream({ start: (controller) => controller.close() }),
      },
      messageMetadata: () => undefined,
    });
  type Usage = { inputTokens?: number; outputTokens?: number };
  type Step = { finishReason: string; usage: Usage };
  type StepOptions = {
    prepareStep: (step: { stepNumber: number }) => unknown;
    system?: string;
    tools: Record<string, Record<string, unknown>>;
    onStepStart: (event: { steps: Step[] }) => Promise<void>;
    onStepEnd: (step: Step) => Promise<void>;
    onEnd: (event: { steps: Step[]; totalUsage: Usage }) => Promise<void>;
    onAbort: (event: { steps: Step[] }) => Promise<void>;
    onError: (event: { error: unknown }) => Promise<void>;
  };
  const options = (call = 0) =>
    mocks.streamDocsChat.mock.calls[call]![3] as StepOptions;
  const toolChoices = (call = 0, steps = 10) =>
    Array.from(
      { length: steps },
      (_, stepNumber) =>
        (options(call).prepareStep({ stepNumber }) as { toolChoice?: string })
          ?.toolChoice,
    );
  const continuing = (steps: number) => [
    message,
    {
      id: "a1",
      role: "assistant",
      parts: Array.from({ length: steps }, (_, i) => [
        { type: "step-start" },
        {
          type: "tool-get_weather",
          toolCallId: `c${i}`,
          state: "output-available",
          input: { location: "SF" },
          output: { temperature: 18 },
        },
      ]).flat(),
    },
  ];

  it("makes the last step of a request answer without tools", async () => {
    allowed();
    streamed();

    await (await send({ messages: [message] })).text();

    expect(toolChoices()).toEqual([...Array(9).fill(undefined), "none"]);
  });

  it("gives a continued turn only the steps it has left", async () => {
    allowed();
    streamed();

    await (await send({ messages: continuing(17) })).text();
    await (await send({ messages: continuing(25) })).text();

    // 20 steps per turn: 3 left, the third answers.
    expect(toolChoices(0, 3)).toEqual([undefined, undefined, "none"]);
    // Spent: one step, which answers.
    expect(toolChoices(1, 1)).toEqual(["none"]);
  });

  it("stops at the daily limits before reading the body or choosing a model", async () => {
    allowed();
    mocks.checkChatRateLimit.mockResolvedValueOnce(
      new Response("Daily usage limit exceeded", { status: 429 }),
    );

    const response = await send({ messages: [message] });

    expect(response.status).toBe(429);
    expect(mocks.checkChatRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      "session_1234567890",
    );
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
    expect(mocks.captureRefusal).toHaveBeenCalledWith(
      "rate_limited",
      "no_referrer",
    );
  });

  const charged = () =>
    (mocks.recordChatTokens.mock.calls as unknown as [Request, number][]).map(
      ([, tokens]) => tokens,
    );
  const reserved = () =>
    (
      mocks.reserveChatTokens.mock.calls as unknown as [Request, number][]
    )[0]![1];

  it("reserves the first prompt and refuses a request the budgets cannot cover", async () => {
    allowed();
    streamed();
    mocks.reserveChatTokens.mockResolvedValueOnce(
      new Response("Daily usage limit exceeded", { status: 429 }),
    );

    const response = await send({ messages: [message] });

    expect(response.status).toBe(429);
    expect(reserved()).toBeGreaterThan(0);
    expect(mocks.streamDocsChat).not.toHaveBeenCalled();
    expect(mocks.captureRefusal).toHaveBeenCalledWith(
      "rate_limited",
      "no_referrer",
    );
  });

  it("charges each step as it runs, net of the reserved first prompt", async () => {
    allowed();
    streamed();

    await (await send({ messages: [message] })).text();
    const first = {
      finishReason: "tool-calls",
      usage: { inputTokens: 1234, outputTokens: 56 },
    };
    await options().onStepStart({ steps: [] });
    await options().onStepEnd(first);
    await options().onStepStart({ steps: [first] });
    await options().onStepEnd({
      finishReason: "stop",
      usage: { inputTokens: 1300, outputTokens: 40 },
    });

    // Step 1 less its reservation, step 2's prompt as it starts, then the rest.
    expect(charged()).toEqual([1290 - reserved(), 1234, 1340 - 1234]);
  });

  it("still charges a step that an abort cuts off", async () => {
    allowed();
    streamed();

    await (await send({ messages: [message] })).text();
    const first = {
      finishReason: "tool-calls",
      usage: { inputTokens: 1000, outputTokens: 50 },
    };
    await options().onStepEnd(first);
    await options().onStepStart({ steps: [first] });
    await options().onAbort({ steps: [first] });

    // The first step in full (with its reservation) and the second's prompt.
    expect(reserved() + charged().reduce((sum, n) => sum + n, 0)).toBe(2050);
    expect(mocks.captureTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "aborted",
        input_tokens: 1000,
        output_tokens: 50,
      }),
    );
  });

  it("charges the completed steps of a turn that ends in an error", async () => {
    allowed();
    streamed();
    vi.spyOn(console, "error").mockImplementation(() => {});

    await (await send({ messages: [message] })).text();
    const first = {
      finishReason: "tool-calls",
      usage: { inputTokens: 1000, outputTokens: 50 },
    };
    await options().onStepEnd(first);
    await options().onError({ error: new Error("provider down") });
    // A later step failing during setup still ends the stream with no usage.
    await options().onEnd({ steps: [first], totalUsage: {} });

    expect(reserved() + charged().reduce((sum, n) => sum + n, 0)).toBe(1050);
    expect(mocks.captureTurn).toHaveBeenCalledTimes(1);
    expect(mocks.captureTurn).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "error", input_tokens: 1000 }),
    );
  });

  it("logs a refusal of the reserved search_docs tool", async () => {
    allowed();

    const response = await send(
      {
        messages: [message],
        searchDocs: true,
        tools: {
          search_docs: { parameters: { type: "object", properties: {} } },
        },
      },
      sameOrigin,
    );

    expect(response.status).toBe(400);
    expect(mocks.captureRefusal).toHaveBeenCalledWith(
      "invalid_tool",
      "no_referrer",
    );
  });

  it("refuses a body outside the schema before choosing a model", async () => {
    allowed();

    const response = await send({
      messages: [{ id: "s1", role: "system", parts: [] }, message],
    });

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Unsupported message role");
    expect(mocks.resolveChatModel).not.toHaveBeenCalled();
    expect(mocks.captureRefusal).toHaveBeenCalledWith(
      "unsupported_role",
      "no_referrer",
    );
  });

  it("keeps a page's own tools but not their provider options", async () => {
    allowed();
    streamed();

    await (
      await send({
        messages: [message],
        tools: {
          get_weather: {
            description: "Weather for a place.",
            parameters: { type: "object", properties: {} },
            providerOptions: { openai: { strict: false } },
          },
        },
      })
    ).text();

    expect(options().tools).toHaveProperty("get_weather");
    expect(options().tools.get_weather).not.toHaveProperty("providerOptions");
  });

  it("logs each turn with a surface label and counts, never the text", async () => {
    allowed();
    streamed();

    await (
      await send(
        {
          messages: [message],
          system: "Remember: the user likes short answers.",
          tools: {
            get_weather: {
              parameters: { type: "object", properties: {} },
            },
          },
        },
        { referer: "https://www.assistant-ui.com/docs/guides/tools?q=secret" },
      )
    ).text();
    const step = {
      finishReason: "tool-calls",
      usage: { inputTokens: 900, outputTokens: 20 },
    };
    await options().onStepEnd(step);
    await options().onEnd({ steps: [step], totalUsage: step.usage });

    expect(mocks.captureTurn).toHaveBeenCalledWith({
      surface: "docs",
      model: "unknown",
      outcome: "client_tool",
      steps: 1,
      step_budget: 10,
      continuation: 0,
      client_tools: 1,
      client_system: 1,
      input_tokens: 900,
      output_tokens: 20,
    });
    const logged = JSON.stringify(mocks.captureTurn.mock.calls);
    expect(logged).not.toContain("hello");
    expect(logged).not.toContain("short answers");
    expect(logged).not.toContain("secret");
  });

  it("counts only the client's own system text, not the docs instruction", async () => {
    allowed();
    streamed();

    await (
      await send({ messages: [message], searchDocs: true }, sameOrigin)
    ).text();
    expect(options().system).toContain("search_docs");
    await options().onEnd({ steps: [], totalUsage: {} });

    expect(mocks.captureTurn).toHaveBeenCalledWith(
      expect.objectContaining({ client_system: 0 }),
    );
  });
});
