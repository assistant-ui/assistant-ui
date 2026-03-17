import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module mocks ──

vi.mock("./parseAdkRequest", () => ({
  parseAdkRequest: vi.fn(),
  toAdkContent: vi.fn(),
}));

vi.mock("./adkEventStream", () => ({
  adkEventStream: vi.fn(),
}));

import { createAdkApiRoute } from "./createAdkApiRoute";
import { parseAdkRequest, toAdkContent } from "./parseAdkRequest";
import { adkEventStream } from "./adkEventStream";

const mockParseAdkRequest = vi.mocked(parseAdkRequest);
const mockToAdkContent = vi.mocked(toAdkContent);
const mockAdkEventStream = vi.mocked(adkEventStream);

const makeRequest = (body: unknown = { message: "Hello" }) =>
  new Request("http://localhost/api/adk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const makeRunner = () => ({
  runAsync: vi.fn().mockReturnValue(
    (async function* () {
      yield { id: "e1" };
    })(),
  ),
});

beforeEach(() => {
  vi.clearAllMocks();
  mockParseAdkRequest.mockResolvedValue({
    type: "message",
    text: "Hello",
    config: {},
  });
  mockToAdkContent.mockReturnValue({
    role: "user",
    parts: [{ text: "Hello" }],
  });
  mockAdkEventStream.mockReturnValue(new Response("stream", { status: 200 }));
});

// ── Basic flow ──

describe("createAdkApiRoute - basic flow", () => {
  it("calls parseAdkRequest with the request", async () => {
    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: "session-1",
    });

    const req = makeRequest();
    await handler(req);

    expect(mockParseAdkRequest).toHaveBeenCalledOnce();
    expect(mockParseAdkRequest).toHaveBeenCalledWith(req);
  });

  it("calls toAdkContent with the parsed request", async () => {
    const parsed = { type: "message" as const, text: "Hi", config: {} };
    mockParseAdkRequest.mockResolvedValue(parsed);

    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: "session-1",
    });

    await handler(makeRequest());

    expect(mockToAdkContent).toHaveBeenCalledOnce();
    expect(mockToAdkContent).toHaveBeenCalledWith(parsed);
  });

  it("calls runner.runAsync with the correct arguments", async () => {
    const newMessage = { role: "user", parts: [{ text: "Hi" }] };
    mockToAdkContent.mockReturnValue(newMessage);

    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: "session-1",
    });

    await handler(makeRequest());

    expect(runner.runAsync).toHaveBeenCalledOnce();
    expect(runner.runAsync).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: "session-1",
      newMessage,
    });
  });

  it("passes runner.runAsync result to adkEventStream and returns its response", async () => {
    const runner = makeRunner();
    const expectedResponse = new Response("ok", { status: 200 });
    mockAdkEventStream.mockReturnValue(expectedResponse);

    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: "session-1",
    });

    const result = await handler(makeRequest());

    expect(mockAdkEventStream).toHaveBeenCalledOnce();
    expect(result).toBe(expectedResponse);
  });
});

// ── userId and sessionId as functions ──

describe("createAdkApiRoute - dynamic userId/sessionId", () => {
  it("resolves userId from a function", async () => {
    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: (req) => new URL(req.url).searchParams.get("user") ?? "default",
      sessionId: "session-1",
    });

    const req = new Request("http://localhost/api/adk?user=alice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hi" }),
    });
    await handler(req);

    expect(runner.runAsync).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "alice" }),
    );
  });

  it("resolves sessionId from a function", async () => {
    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: (req) =>
        new URL(req.url).searchParams.get("session") ?? "default",
    });

    const req = new Request("http://localhost/api/adk?session=s42", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hi" }),
    });
    await handler(req);

    expect(runner.runAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "s42" }),
    );
  });

  it("resolves async userId function", async () => {
    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: async () => "async-user",
      sessionId: "session-1",
    });

    await handler(makeRequest());

    expect(runner.runAsync).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "async-user" }),
    );
  });

  it("resolves async sessionId function", async () => {
    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: async () => "async-session",
    });

    await handler(makeRequest());

    expect(runner.runAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "async-session" }),
    );
  });
});

// ── stateDelta passthrough ──

describe("createAdkApiRoute - stateDelta", () => {
  it("passes stateDelta to runner.runAsync when present", async () => {
    mockParseAdkRequest.mockResolvedValue({
      type: "message",
      text: "Hello",
      config: {},
      stateDelta: { count: 1 },
    });

    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: "session-1",
    });

    await handler(makeRequest());

    expect(runner.runAsync).toHaveBeenCalledWith(
      expect.objectContaining({ stateDelta: { count: 1 } }),
    );
  });

  it("does not include stateDelta when it is null/undefined", async () => {
    mockParseAdkRequest.mockResolvedValue({
      type: "message",
      text: "Hello",
      config: {},
    });

    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: "session-1",
    });

    await handler(makeRequest());

    const callArgs = runner.runAsync.mock.calls[0]![0];
    expect(callArgs).not.toHaveProperty("stateDelta");
  });
});

// ── runConfig passthrough ──

describe("createAdkApiRoute - runConfig", () => {
  it("passes runConfig to runner.runAsync when present", async () => {
    mockParseAdkRequest.mockResolvedValue({
      type: "message",
      text: "Hello",
      config: { runConfig: { temperature: 0.5 } },
    });

    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: "session-1",
    });

    await handler(makeRequest());

    expect(runner.runAsync).toHaveBeenCalledWith(
      expect.objectContaining({ runConfig: { temperature: 0.5 } }),
    );
  });

  it("does not include runConfig when it is null/undefined", async () => {
    mockParseAdkRequest.mockResolvedValue({
      type: "message",
      text: "Hello",
      config: {},
    });

    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: "session-1",
    });

    await handler(makeRequest());

    const callArgs = runner.runAsync.mock.calls[0]![0];
    expect(callArgs).not.toHaveProperty("runConfig");
  });
});

// ── onError passthrough ──

describe("createAdkApiRoute - onError", () => {
  it("passes onError to adkEventStream", async () => {
    const onError = vi.fn();
    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: "session-1",
      onError,
    });

    await handler(makeRequest());

    expect(mockAdkEventStream).toHaveBeenCalledWith(expect.anything(), {
      onError,
    });
  });

  it("does not pass onError when not provided", async () => {
    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: "session-1",
    });

    await handler(makeRequest());

    expect(mockAdkEventStream).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
    );
  });
});

// ── tool-result flow ──

describe("createAdkApiRoute - tool-result flow", () => {
  it("handles tool-result requests", async () => {
    const toolParsed = {
      type: "tool-result" as const,
      toolCallId: "tc-1",
      toolName: "search",
      result: { found: true },
      isError: false,
      config: {},
    };
    mockParseAdkRequest.mockResolvedValue(toolParsed);
    mockToAdkContent.mockReturnValue({
      role: "user",
      parts: [
        {
          functionResponse: {
            name: "search",
            id: "tc-1",
            response: { found: true },
          },
        },
      ],
    });

    const runner = makeRunner();
    const handler = createAdkApiRoute({
      runner,
      userId: "user-1",
      sessionId: "session-1",
    });

    await handler(makeRequest());

    expect(mockToAdkContent).toHaveBeenCalledWith(toolParsed);
    expect(runner.runAsync).toHaveBeenCalledOnce();
    const callArgs = runner.runAsync.mock.calls[0]![0];
    expect(callArgs.newMessage.parts[0]).toMatchObject({
      functionResponse: { name: "search", id: "tc-1" },
    });
  });
});
