import { describe, expect, it } from "vitest";
import { parseMessage, parsePart, parsePartStatus, partKey } from "./parse";

describe("parsePartStatus", () => {
  it("reads type and reason", () => {
    expect(parsePartStatus({ type: "incomplete", reason: "error" })).toEqual({
      type: "incomplete",
      reason: "error",
    });
  });

  it("returns undefined for non-records and typeless values", () => {
    expect(parsePartStatus(undefined)).toBeUndefined();
    expect(parsePartStatus({ reason: "error" })).toBeUndefined();
  });
});

describe("parsePart", () => {
  it("parses a text part with status", () => {
    const part = parsePart({
      type: "text",
      text: "hello",
      status: { type: "complete" },
    });
    expect(part).toEqual({
      type: "text",
      text: "hello",
      status: { type: "complete" },
    });
  });

  it("parses a completed tool-call with result", () => {
    const part = parsePart({
      type: "tool-call",
      toolCallId: "call_1",
      toolName: "search",
      args: { query: "weather" },
      argsText: '{"query":"weather"}',
      result: { temperature: 20 },
      status: { type: "complete" },
    });
    expect(part).toMatchObject({
      type: "tool-call",
      toolName: "search",
      toolCallId: "call_1",
      result: { temperature: 20 },
      argsText: '{"query":"weather"}',
      subMessageCount: 0,
    });
  });

  it("surfaces a pending approval gate", () => {
    const part = parsePart({
      type: "tool-call",
      toolCallId: "call_2",
      toolName: "deleteFile",
      args: {},
      approval: { id: "appr_1" },
      status: { type: "requires-action", reason: "interrupt" },
    });
    expect(part.type).toBe("tool-call");
    if (part.type !== "tool-call") return;
    expect(part.approval).toEqual({ id: "appr_1" });
    expect(part.approval?.approved).toBeUndefined();
    expect(part.status).toEqual({
      type: "requires-action",
      reason: "interrupt",
    });
  });

  it("surfaces a human interrupt payload and error result", () => {
    const part = parsePart({
      type: "tool-call",
      toolCallId: "call_3",
      toolName: "askUser",
      args: {},
      isError: true,
      result: "boom",
      interrupt: { type: "human", payload: { question: "name?" } },
    });
    if (part.type !== "tool-call") throw new Error("expected tool-call");
    expect(part.isError).toBe(true);
    expect(part.result).toBe("boom");
    expect(part.interrupt).toEqual({
      type: "human",
      payload: { question: "name?" },
    });
  });

  it("counts nested sub-agent messages", () => {
    const part = parsePart({
      type: "tool-call",
      toolCallId: "call_4",
      toolName: "subAgent",
      args: {},
      messages: [{ role: "assistant" }, { role: "user" }],
    });
    if (part.type !== "tool-call") throw new Error("expected tool-call");
    expect(part.subMessageCount).toBe(2);
  });

  it("falls back to unknown for unrecognized part types", () => {
    const part = parsePart({ type: "mystery", foo: 1 });
    expect(part.type).toBe("unknown");
    if (part.type !== "unknown") return;
    expect(part.rawType).toBe("mystery");
  });

  it("drops empty interrupt/approval objects so completed calls do not look pending", () => {
    const part = parsePart({
      type: "tool-call",
      toolCallId: "c0",
      toolName: "done",
      args: {},
      result: {},
      interrupt: {},
      approval: {},
      status: { type: "complete" },
    });
    if (part.type !== "tool-call") throw new Error("expected tool-call");
    expect(part.interrupt).toBeUndefined();
    expect(part.approval).toBeUndefined();
  });

  it("preserves an empty argsText for finished zero-argument tool calls", () => {
    const part = parsePart({
      type: "tool-call",
      toolCallId: "c5",
      toolName: "noArgs",
      args: {},
      argsText: "",
      status: { type: "complete" },
    });
    if (part.type !== "tool-call") throw new Error("expected tool-call");
    expect(part.argsText).toBe("");
  });
});

describe("partKey", () => {
  it("keys tool-calls by toolCallId and other parts by index", () => {
    expect(
      partKey(
        {
          type: "tool-call",
          toolCallId: "abc",
          toolName: "x",
          args: {},
          subMessageCount: 0,
        },
        3,
      ),
    ).toBe("tc:abc");
    expect(partKey({ type: "text", text: "hi" }, 3)).toBe("p:3");
  });
});

describe("parseMessage", () => {
  it("parses an enriched assistant message end to end", () => {
    const message = parseMessage(
      {
        id: "msg_1",
        role: "assistant",
        createdAt: "2026-06-08T10:00:00.000Z",
        status: { type: "complete", reason: "stop" },
        branchNumber: 2,
        branchCount: 3,
        index: 1,
        isLast: true,
        parts: [
          { type: "reasoning", text: "thinking", status: { type: "complete" } },
          {
            type: "tool-call",
            toolCallId: "c1",
            toolName: "search",
            args: {},
            result: {},
            status: { type: "complete" },
          },
          { type: "text", text: "done", status: { type: "complete" } },
        ],
        metadata: {
          timing: {
            streamStartTime: 1000,
            firstTokenTime: 1200,
            totalStreamTime: 800,
            tokenCount: 40,
            tokensPerSecond: 50,
            totalChunks: 12,
            toolCallCount: 1,
          },
          steps: [
            { usage: { inputTokens: 100, outputTokens: 20 } },
            { usage: { inputTokens: 30, outputTokens: 10 } },
          ],
          isOptimistic: false,
          custom: {},
        },
      },
      0,
    );

    expect(message).not.toBeNull();
    if (!message) return;
    expect(message.id).toBe("msg_1");
    expect(message.role).toBe("assistant");
    expect(message.parts).toHaveLength(3);
    expect(message.parts.map((p) => p.type)).toEqual([
      "reasoning",
      "tool-call",
      "text",
    ]);
    expect(message.status).toEqual({ type: "complete", reason: "stop" });
    expect(message.branchNumber).toBe(2);
    expect(message.branchCount).toBe(3);
    expect(message.index).toBe(1);
    expect(message.timing?.firstTokenTime).toBe(1200);
    expect(message.usage).toEqual({
      inputTokens: 130,
      outputTokens: 30,
      stepCount: 2,
    });
  });

  it("falls back to content[] when parts[] is absent (raw user message)", () => {
    const message = parseMessage(
      {
        id: "msg_2",
        role: "user",
        createdAt: "2026-06-08T10:01:00.000Z",
        content: [{ type: "text", text: "hi" }],
        attachments: [{ name: "photo.png" }],
        metadata: { custom: {} },
      },
      0,
    );
    if (!message) return;
    expect(message.parts).toHaveLength(1);
    expect(message.parts[0]?.type).toBe("text");
    expect(message.attachments).toEqual([
      expect.objectContaining({ name: "photo.png" }),
    ]);
    expect(message.status).toBeUndefined();
    expect(message.usage).toBeUndefined();
  });

  it("captures an incomplete message error", () => {
    const message = parseMessage(
      {
        id: "msg_3",
        role: "assistant",
        status: { type: "incomplete", reason: "error", error: "rate limited" },
        parts: [],
        metadata: { custom: {} },
      },
      0,
    );
    if (!message) return;
    expect(message.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: "rate limited",
    });
  });

  it("returns null for non-records", () => {
    expect(parseMessage(null, 0)).toBeNull();
    expect(parseMessage("nope", 0)).toBeNull();
  });
});
