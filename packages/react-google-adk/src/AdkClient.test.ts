import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdkStream } from "./AdkClient";
import type { AdkEvent, AdkMessage, AdkSendMessageConfig } from "./types";

// ── Helpers ──

const makeConfig = (
  overrides: Partial<
    AdkSendMessageConfig & {
      abortSignal: AbortSignal;
      initialize: () => Promise<{
        remoteId: string;
        externalId: string | undefined;
      }>;
    }
  > = {},
) => ({
  abortSignal: new AbortController().signal,
  initialize: vi.fn().mockResolvedValue({
    remoteId: "r1",
    externalId: "session-1",
  }),
  ...overrides,
});

/** Encode SSE text into a ReadableStream of Uint8Array chunks. */
const sseBody = (text: string): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
};

const mockFetch =
  vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

// ── Proxy mode ──

describe("createAdkStream - proxy mode", () => {
  it("POSTs to the api URL directly", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({ api: "/api/adk" });
    const messages: AdkMessage[] = [
      { id: "m1", type: "human", content: "Hello" },
    ];
    const gen = await stream(messages, makeConfig());
    // drain
    for await (const _ of gen) {
      /* noop */
    }

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe("/api/adk");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({ message: "Hello" });
  });

  it("sends runConfig and checkpointId in proxy body", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({ api: "/api/adk" });
    const gen = await stream(
      [{ id: "m1", type: "human", content: "Hi" }],
      makeConfig({ runConfig: { temp: 0.5 }, checkpointId: "cp-1" }),
    );
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.runConfig).toEqual({ temp: 0.5 });
    expect(body.checkpointId).toBe("cp-1");
  });

  it("sends a tool-result body when message type is tool", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({ api: "/api/adk" });
    const messages: AdkMessage[] = [
      {
        id: "t1",
        type: "tool",
        content: '{"ok":true}',
        tool_call_id: "tc-1",
        name: "search",
        status: "success",
      },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.type).toBe("tool-result");
    expect(body.toolCallId).toBe("tc-1");
    expect(body.toolName).toBe("search");
    expect(body.result).toEqual({ ok: true });
    expect(body.isError).toBe(false);
  });

  it("sends parts when message has multimodal content", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({ api: "/api/adk" });
    const messages: AdkMessage[] = [
      {
        id: "m1",
        type: "human",
        content: [
          { type: "text", text: "Look" },
          { type: "image", mimeType: "image/png", data: "abc" },
        ],
      },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.parts).toHaveLength(2);
    expect(body.parts[0]).toEqual({ text: "Look" });
    expect(body.parts[1]).toEqual({
      inlineData: { mimeType: "image/png", data: "abc" },
    });
  });

  it("sends file parts as inlineData in proxy mode", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({ api: "/api/adk" });
    const messages: AdkMessage[] = [
      {
        id: "m1",
        type: "human",
        content: [
          { type: "text", text: "see attached" },
          {
            type: "file",
            mimeType: "application/pdf",
            data: "JVBERi0xLjQK",
            filename: "report.pdf",
          },
        ],
      },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.parts).toHaveLength(2);
    expect(body.parts[1]).toEqual({
      inlineData: { mimeType: "application/pdf", data: "JVBERi0xLjQK" },
    });
  });

  it("sends parts array when multiple messages are provided", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({ api: "/api/adk" });
    const messages: AdkMessage[] = [
      {
        id: "t1",
        type: "tool",
        content: '{"cancelled":true}',
        tool_call_id: "tc-0",
        name: "cancel",
        status: "error",
      },
      { id: "m1", type: "human", content: "Hello" },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.parts).toBeDefined();
    expect(Array.isArray(body.parts)).toBe(true);
  });

  it("marks isError=true when tool status is error", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({ api: "/api/adk" });
    const messages: AdkMessage[] = [
      {
        id: "t1",
        type: "tool",
        content: "failed",
        tool_call_id: "tc-1",
        name: "search",
        status: "error",
      },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.isError).toBe(true);
  });
});

// ── Direct mode ──

describe("createAdkStream - direct mode", () => {
  it("POSTs to /run_sse with ADK-native body", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "my-app",
      userId: "user-1",
    });
    const gen = await stream(
      [{ id: "m1", type: "human", content: "Hello" }],
      makeConfig(),
    );
    for await (const _ of gen) {
      /* noop */
    }

    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe("http://localhost:8000/run_sse");

    const body = JSON.parse(init?.body as string);
    expect(body.appName).toBe("my-app");
    expect(body.userId).toBe("user-1");
    expect(body.sessionId).toBe("session-1");
    expect(body.streaming).toBe(true);
    expect(body.newMessage).toMatchObject({
      role: "user",
      parts: [{ text: "Hello" }],
    });
  });

  it("calls config.initialize() to get the sessionId", async () => {
    const initialize = vi
      .fn()
      .mockResolvedValue({ remoteId: "r1", externalId: "s-42" });
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "u",
    });
    const gen = await stream(
      [{ id: "m1", type: "human", content: "Hi" }],
      makeConfig({ initialize }),
    );
    for await (const _ of gen) {
      /* noop */
    }

    expect(initialize).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.sessionId).toBe("s-42");
  });

  it("converts tool messages to functionResponse parts", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "u",
    });
    const messages: AdkMessage[] = [
      {
        id: "t1",
        type: "tool",
        content: '{"result":"ok"}',
        tool_call_id: "tc-1",
        name: "search",
      },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.newMessage.parts[0]).toMatchObject({
      functionResponse: {
        name: "search",
        id: "tc-1",
        response: { result: "ok" },
      },
    });
  });

  it("falls back to raw string when tool content is not valid JSON", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "u",
    });
    const messages: AdkMessage[] = [
      {
        id: "t1",
        type: "tool",
        content: "not-json",
        tool_call_id: "tc-1",
        name: "search",
      },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.newMessage.parts[0].functionResponse.response).toBe("not-json");
  });

  it("sends empty text part when no messages provided", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "u",
    });
    const gen = await stream([], makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.newMessage.parts).toEqual([{ text: "" }]);
  });
});

// ── SSE parsing ──

describe("createAdkStream - SSE parsing", () => {
  it("parses data lines into AdkEvent objects", async () => {
    const events: AdkEvent[] = [
      { id: "e1", content: { parts: [{ text: "hello" }] } },
      { id: "e2", content: { parts: [{ text: "world" }] } },
    ];
    const text = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
    mockFetch.mockResolvedValueOnce(
      new Response(sseBody(text), { status: 200 }),
    );

    const stream = createAdkStream({ api: "/api/adk" });
    const gen = await stream(
      [{ id: "m1", type: "human", content: "Hi" }],
      makeConfig(),
    );
    const collected: AdkEvent[] = [];
    for await (const evt of gen) {
      collected.push(evt);
    }

    expect(collected).toHaveLength(2);
    expect(collected[0]!.id).toBe("e1");
    expect(collected[1]!.id).toBe("e2");
  });

  it("skips :ok SSE comments", async () => {
    const text = `:ok\n\ndata: ${JSON.stringify({ id: "e1" })}\n\n`;
    mockFetch.mockResolvedValueOnce(
      new Response(sseBody(text), { status: 200 }),
    );

    const stream = createAdkStream({ api: "/api/adk" });
    const gen = await stream(
      [{ id: "m1", type: "human", content: "Hi" }],
      makeConfig(),
    );
    const collected: AdkEvent[] = [];
    for await (const evt of gen) {
      collected.push(evt);
    }

    expect(collected).toHaveLength(1);
    expect(collected[0]!.id).toBe("e1");
  });

  it("handles partial chunks that split across reads", async () => {
    const event = { id: "e1", content: { parts: [{ text: "split" }] } };
    const fullText = `data: ${JSON.stringify(event)}\n\n`;
    const mid = Math.floor(fullText.length / 2);
    const chunk1 = fullText.slice(0, mid);
    const chunk2 = fullText.slice(mid);

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(chunk1));
        controller.enqueue(encoder.encode(chunk2));
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce(new Response(body, { status: 200 }));

    const stream = createAdkStream({ api: "/api/adk" });
    const gen = await stream(
      [{ id: "m1", type: "human", content: "Hi" }],
      makeConfig(),
    );
    const collected: AdkEvent[] = [];
    for await (const evt of gen) {
      collected.push(evt);
    }

    expect(collected).toHaveLength(1);
    expect(collected[0]!.id).toBe("e1");
  });

  it("handles remaining buffer at end of stream", async () => {
    // No trailing \n\n
    const event = { id: "e1" };
    const text = `data: ${JSON.stringify(event)}\n`;
    mockFetch.mockResolvedValueOnce(
      new Response(sseBody(text), { status: 200 }),
    );

    const stream = createAdkStream({ api: "/api/adk" });
    const gen = await stream(
      [{ id: "m1", type: "human", content: "Hi" }],
      makeConfig(),
    );
    const collected: AdkEvent[] = [];
    for await (const evt of gen) {
      collected.push(evt);
    }

    expect(collected).toHaveLength(1);
    expect(collected[0]!.id).toBe("e1");
  });
});

// ── Error handling ──

describe("createAdkStream - error handling", () => {
  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Not found", { status: 404, statusText: "Not Found" }),
    );

    const stream = createAdkStream({ api: "/api/adk" });
    await expect(async () => {
      const gen = await stream(
        [{ id: "m1", type: "human", content: "Hi" }],
        makeConfig(),
      );
      for await (const _ of gen) {
        /* noop */
      }
    }).rejects.toThrow("ADK request failed: 404 Not Found");
  });
});

// ── Headers ──

describe("createAdkStream - headers", () => {
  it("sends static headers", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "/api/adk",
      headers: { Authorization: "Bearer tok" },
    });
    const gen = await stream(
      [{ id: "m1", type: "human", content: "Hi" }],
      makeConfig(),
    );
    for await (const _ of gen) {
      /* noop */
    }

    const headers = mockFetch.mock.calls[0]![1]?.headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe("Bearer tok");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("resolves dynamic headers from a function", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "/api/adk",
      headers: () => ({ "X-Custom": "dynamic" }),
    });
    const gen = await stream(
      [{ id: "m1", type: "human", content: "Hi" }],
      makeConfig(),
    );
    for await (const _ of gen) {
      /* noop */
    }

    const headers = mockFetch.mock.calls[0]![1]?.headers as Record<
      string,
      string
    >;
    expect(headers["X-Custom"]).toBe("dynamic");
  });

  it("resolves async dynamic headers", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "/api/adk",
      headers: async () => ({ "X-Async": "yes" }),
    });
    const gen = await stream(
      [{ id: "m1", type: "human", content: "Hi" }],
      makeConfig(),
    );
    for await (const _ of gen) {
      /* noop */
    }

    const headers = mockFetch.mock.calls[0]![1]?.headers as Record<
      string,
      string
    >;
    expect(headers["X-Async"]).toBe("yes");
  });

  it("sends no extra headers when headers option is undefined", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({ api: "/api/adk" });
    const gen = await stream(
      [{ id: "m1", type: "human", content: "Hi" }],
      makeConfig(),
    );
    for await (const _ of gen) {
      /* noop */
    }

    const headers = mockFetch.mock.calls[0]![1]?.headers as Record<
      string,
      string
    >;
    expect(Object.keys(headers)).toEqual(["Content-Type"]);
  });
});

// ── AbortSignal ──

describe("createAdkStream - AbortSignal", () => {
  it("forwards the AbortSignal to fetch", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const controller = new AbortController();
    const stream = createAdkStream({ api: "/api/adk" });
    const gen = await stream(
      [{ id: "m1", type: "human", content: "Hi" }],
      makeConfig({ abortSignal: controller.signal }),
    );
    for await (const _ of gen) {
      /* noop */
    }

    expect(mockFetch.mock.calls[0]![1]?.signal).toBe(controller.signal);
  });
});

// ── Content conversion helpers ──

describe("createAdkStream - content conversion", () => {
  it("converts reasoning content parts to thought parts in direct mode", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "u",
    });
    const messages: AdkMessage[] = [
      {
        id: "m1",
        type: "human",
        content: [{ type: "reasoning", text: "thinking..." }],
      },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.newMessage.parts[0]).toEqual({
      text: "thinking...",
      thought: true,
    });
  });

  it("converts image_url content parts to fileData in direct mode", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "u",
    });
    const messages: AdkMessage[] = [
      {
        id: "m1",
        type: "human",
        content: [{ type: "image_url", url: "https://example.com/img.png" }],
      },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.newMessage.parts[0]).toEqual({
      fileData: { fileUri: "https://example.com/img.png" },
    });
  });

  it("converts file content parts to inlineData in direct mode", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "u",
    });
    const messages: AdkMessage[] = [
      {
        id: "m1",
        type: "human",
        content: [
          {
            type: "file",
            mimeType: "application/pdf",
            data: "JVBERi0xLjQK",
            filename: "report.pdf",
          },
        ],
      },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.newMessage.parts[0]).toEqual({
      inlineData: { mimeType: "application/pdf", data: "JVBERi0xLjQK" },
    });
  });

  it("converts file_url content parts to fileData with mimeType in direct mode", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "u",
    });
    const messages: AdkMessage[] = [
      {
        id: "m1",
        type: "human",
        content: [
          {
            type: "file_url",
            url: "gs://bucket/report.pdf",
            mimeType: "application/pdf",
          },
        ],
      },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.newMessage.parts[0]).toEqual({
      fileData: {
        fileUri: "gs://bucket/report.pdf",
        mimeType: "application/pdf",
      },
    });
  });

  it("converts code content parts to executableCode", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "u",
    });
    const messages: AdkMessage[] = [
      {
        id: "m1",
        type: "human",
        content: [{ type: "code", code: "print(1)", language: "python" }],
      },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.newMessage.parts[0]).toEqual({
      executableCode: { code: "print(1)", language: "python" },
    });
  });

  it("converts code_result content parts to codeExecutionResult", async () => {
    mockFetch.mockResolvedValueOnce(new Response(sseBody(""), { status: 200 }));

    const stream = createAdkStream({
      api: "http://localhost:8000",
      appName: "app",
      userId: "u",
    });
    const messages: AdkMessage[] = [
      {
        id: "m1",
        type: "human",
        content: [{ type: "code_result", output: "1", outcome: "OUTCOME_OK" }],
      },
    ];
    const gen = await stream(messages, makeConfig());
    for await (const _ of gen) {
      /* noop */
    }

    const body = JSON.parse(mockFetch.mock.calls[0]![1]?.body as string);
    expect(body.newMessage.parts[0]).toEqual({
      codeExecutionResult: { output: "1", outcome: "OUTCOME_OK" },
    });
  });
});
