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
    await expect(parseAdkRequest(req)).rejects.toThrow();
  });

  it("throws on non-object body", async () => {
    await expect(parseAdkRequest(makeRequest([1, 2, 3]))).rejects.toThrow(
      "Request body must be a JSON object",
    );
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
