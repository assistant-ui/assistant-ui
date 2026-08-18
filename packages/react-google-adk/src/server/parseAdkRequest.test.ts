import { describe, it, expect } from "vitest";
import { parseAdkRequest, toAdkContent } from "./parseAdkRequest";

const makeRequest = (body: unknown) =>
  new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("parseAdkRequest", () => {
  it("parses a simple message request", async () => {
    const result = await parseAdkRequest(makeRequest({ message: "Hello" }));
    expect(result).toMatchObject({ type: "message", text: "Hello" });
  });

  it("parses a message request with runConfig and checkpointId", async () => {
    const result = await parseAdkRequest(
      makeRequest({
        message: "Hello",
        runConfig: { temperature: 0.5 },
        checkpointId: "cp-123",
      }),
    );
    expect(result.config).toMatchObject({
      runConfig: { temperature: 0.5 },
      checkpointId: "cp-123",
    });
  });

  it("parses a message request with stateDelta", async () => {
    const result = await parseAdkRequest(
      makeRequest({ message: "Hello", stateDelta: { count: 1 } }),
    );
    expect(result).toMatchObject({ stateDelta: { count: 1 } });
  });

  it("parses a message request with parts (multimodal)", async () => {
    const result = await parseAdkRequest(
      makeRequest({
        message: "Look at this",
        parts: [
          { text: "Look" },
          { inlineData: { mimeType: "image/png", data: "abc" } },
        ],
      }),
    );
    if (result.type !== "message") throw new Error("Expected message type");
    expect(result.parts).toHaveLength(2);
  });

  it("parses each supported ADK part shape", async () => {
    const parts = [
      { text: "Hello", thought: true },
      { functionCall: { name: "search", id: "call-1", args: {} } },
      {
        functionResponse: {
          name: "search",
          id: "call-1",
          response: null,
        },
      },
      { executableCode: { code: "print('hello')", language: "python" } },
      { codeExecutionResult: { output: "hello", outcome: "ok" } },
      { inlineData: { mimeType: "image/png", data: "abc" } },
      {
        fileData: {
          fileUri: "https://example.com/file",
          mimeType: "text/plain",
        },
      },
    ];

    await expect(
      parseAdkRequest(makeRequest({ parts })),
    ).resolves.toMatchObject({ parts });
  });

  it("parses a tool-result request", async () => {
    const result = await parseAdkRequest(
      makeRequest({
        type: "tool-result",
        toolCallId: "tc-1",
        toolName: "search",
        result: { data: "found" },
        isError: false,
      }),
    );
    expect(result).toMatchObject({
      type: "tool-result",
      toolCallId: "tc-1",
      toolName: "search",
      result: { data: "found" },
      isError: false,
    });
  });

  it("defaults isError to false when missing", async () => {
    const result = await parseAdkRequest(
      makeRequest({
        type: "tool-result",
        toolCallId: "tc-1",
        toolName: "search",
        result: {},
      }),
    );
    if (result.type !== "tool-result") throw new Error("Expected tool-result");
    expect(result.isError).toBe(false);
  });

  it("throws on invalid JSON", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: "not json",
    });
    await expect(parseAdkRequest(req)).rejects.toThrow(
      'Invalid JSON in Google ADK proxy request body. Expected a JSON object like {"message":"Hello"} or {"type":"tool-result",...}.',
    );
  });

  it("throws on non-object body", async () => {
    await expect(parseAdkRequest(makeRequest([1, 2, 3]))).rejects.toThrow(
      "Google ADK proxy request body must be a JSON object",
    );
  });

  it.each([
    [{ message: 42 }, 'field "message"'],
    [{ parts: {} }, 'field "parts"'],
    [{ parts: [null] }, 'field "parts"'],
    [{ type: "unknown", message: "hello" }, 'field "type"'],
    [{ message: "hello", checkpointId: 42 }, 'field "checkpointId"'],
    [{ message: "hello", stateDelta: [] }, 'field "stateDelta"'],
  ])("rejects malformed message requests %#", async (body, error) => {
    await expect(parseAdkRequest(makeRequest(body))).rejects.toThrow(error);
  });

  it.each([
    [{ parts: [{}] }, 'field "parts[0]"'],
    [{ parts: [{ text: 42 }] }, 'field "parts[0].text"'],
    [
      { parts: [{ inlineData: { mimeType: "image/png", data: 42 } }] },
      'field "parts[0].inlineData.data"',
    ],
    [
      { parts: [{ functionCall: { name: "search", args: [] } }] },
      'field "parts[0].functionCall.args"',
    ],
    [
      { parts: [{ functionResponse: { name: 42 } }] },
      'field "parts[0].functionResponse.name"',
    ],
  ])("rejects malformed nested ADK parts %#", async (body, error) => {
    await expect(parseAdkRequest(makeRequest(body))).rejects.toThrow(error);
  });

  it("accepts exclude_none and unknown part shapes", async () => {
    const parts = [
      { functionCall: { name: "get_time", id: "call-1" } },
      { functionResponse: { name: "search", id: "call-1" } },
      { text: "hi", inlineData: { mimeType: "image/png", data: "abc" } },
      { videoMetadata: { fps: 1 } },
      { text: "hello", thoughtSignature: "sig" },
    ];

    await expect(
      parseAdkRequest(makeRequest({ parts })),
    ).resolves.toMatchObject({ parts });
  });

  it("requires message content", async () => {
    await expect(parseAdkRequest(makeRequest({}))).rejects.toThrow(
      'expected a "message" string or a "parts" array',
    );
  });

  it.each([
    [
      { type: "message", message: "hello" },
      { type: "message", text: "hello", config: {} },
    ],
    [{ parts: [] }, { type: "message", text: "", parts: [], config: {} }],
  ])(
    "preserves supported empty and explicit message shapes %#",
    async (body, expected) => {
      await expect(parseAdkRequest(makeRequest(body))).resolves.toEqual(
        expected,
      );
    },
  );

  it("accepts empty tool identifiers emitted by id-less ADK calls", async () => {
    await expect(
      parseAdkRequest(
        makeRequest({
          type: "tool-result",
          toolCallId: "",
          toolName: "",
          result: {},
        }),
      ),
    ).resolves.toMatchObject({
      type: "tool-result",
      toolCallId: "",
      toolName: "",
    });
  });

  it.each([
    [
      { type: "tool-result", toolName: "search", result: {} },
      'field "toolCallId"',
    ],
    [
      { type: "tool-result", toolCallId: "tc-1", result: {} },
      'field "toolName"',
    ],
    [
      { type: "tool-result", toolCallId: 42, toolName: "search", result: {} },
      'field "toolCallId"',
    ],
    [
      {
        type: "tool-result",
        toolCallId: "tc-1",
        toolName: "search",
        result: {},
        isError: "false",
      },
      'field "isError"',
    ],
    [
      { type: "tool-result", toolCallId: "tc-1", toolName: "search" },
      'field "result"',
    ],
  ])("rejects malformed tool-result requests %#", async (body, error) => {
    await expect(parseAdkRequest(makeRequest(body))).rejects.toThrow(error);
  });
});

describe("toAdkContent", () => {
  it("converts a text message to user content with text part", () => {
    const content = toAdkContent({
      type: "message",
      text: "Hello",
      config: {},
    });
    expect(content).toEqual({
      role: "user",
      parts: [{ text: "Hello" }],
    });
  });

  it("converts a multimodal message using raw parts", () => {
    const content = toAdkContent({
      type: "message",
      text: "",
      parts: [
        { text: "Look" },
        { inlineData: { mimeType: "image/png", data: "abc" } },
      ],
      config: {},
    });
    expect(content).toEqual({
      role: "user",
      parts: [
        { text: "Look" },
        { inlineData: { mimeType: "image/png", data: "abc" } },
      ],
    });
  });

  it("converts a tool-result to user content with functionResponse part", () => {
    const content = toAdkContent({
      type: "tool-result",
      toolCallId: "tc-1",
      toolName: "search",
      result: { found: true },
      isError: false,
      config: {},
    });
    expect(content).toEqual({
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
  });
});
