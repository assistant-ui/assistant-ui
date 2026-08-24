import { describe, expect, it } from "vitest";
import {
  createRunTelemetryToolCall,
  normalizeRunTelemetryUsage,
  truncateRunTelemetryText,
} from "./runTelemetry";

const MAX = 50_000;

describe("truncateRunTelemetryText", () => {
  it("passes text at or under the cap through unchanged", () => {
    expect(truncateRunTelemetryText("hello")).toBe("hello");
    const exact = "a".repeat(MAX);
    expect(truncateRunTelemetryText(exact)).toBe(exact);
  });

  it("clamps text over the cap", () => {
    expect(truncateRunTelemetryText("a".repeat(MAX + 1))).toHaveLength(MAX);
  });
});

describe("createRunTelemetryToolCall", () => {
  it("serializes args and omits tool_source when the caller gives none", () => {
    expect(
      createRunTelemetryToolCall({
        toolName: "calculator",
        toolCallId: "call-1",
        args: { a: 1 },
        result: { sum: 1 },
      }),
    ).toEqual({
      tool_name: "calculator",
      tool_call_id: "call-1",
      tool_args: '{"a":1}',
      tool_result: '{"sum":1}',
    });
  });

  it("clamps serialized args and results", () => {
    const call = createRunTelemetryToolCall({
      toolName: "t",
      toolCallId: "call-1",
      args: { blob: "a".repeat(MAX) },
      result: { blob: "a".repeat(MAX) },
    });
    expect(call.tool_args).toHaveLength(MAX);
    expect(call.tool_result).toHaveLength(MAX);
  });

  it("clamps pre-serialized argsText to the cap", () => {
    const argsText = "a".repeat(MAX + 10);
    const call = createRunTelemetryToolCall({
      toolName: "t",
      toolCallId: "call-1",
      argsText,
      args: { ignored: true },
    });
    expect(call.tool_args).toBe(argsText.slice(0, MAX));
  });

  it("omits fields whose value cannot be serialized", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(
      createRunTelemetryToolCall({
        toolName: "t",
        toolCallId: "call-1",
        args: circular,
        result: undefined,
      }),
    ).toEqual({ tool_name: "t", tool_call_id: "call-1" });
  });

  it("summarizes base64 image and audio blocks in an mcp result", () => {
    const call = createRunTelemetryToolCall({
      toolName: "t",
      toolCallId: "call-1",
      toolSource: "mcp",
      result: [
        { type: "text", text: "keep me" },
        { type: "image", data: "A".repeat(4096) },
      ],
    });
    expect(call.tool_source).toBe("mcp");
    expect(call.tool_result).toContain("keep me");
    expect(call.tool_result).toContain("[image: 3.0KB]");
    expect(call.tool_result).not.toContain("A".repeat(200));
  });

  it("leaves a non-mcp result unsummarized", () => {
    const result = [{ type: "image", data: "A".repeat(4096) }];
    const call = createRunTelemetryToolCall({
      toolName: "t",
      toolCallId: "call-1",
      toolSource: "frontend",
      result,
    });
    expect(call.tool_source).toBe("frontend");
    expect(call.tool_result).toBe(JSON.stringify(result));
  });
});

describe("normalizeRunTelemetryUsage", () => {
  it("prefers the current names over the legacy ones", () => {
    expect(
      normalizeRunTelemetryUsage({
        inputTokens: 1,
        outputTokens: 2,
        promptTokens: 90,
        completionTokens: 90,
      }),
    ).toEqual({ inputTokens: 1, outputTokens: 2 });
  });

  it("falls back to the legacy prompt and completion names", () => {
    expect(
      normalizeRunTelemetryUsage({ promptTokens: 3, completionTokens: 4 }),
    ).toEqual({ inputTokens: 3, outputTokens: 4 });
  });

  it("keeps a zero count and omits an absent one", () => {
    expect(
      normalizeRunTelemetryUsage({ inputTokens: 0, cachedInputTokens: 5 }),
    ).toEqual({ inputTokens: 0, cachedInputTokens: 5 });
  });

  it("returns undefined when no count is present", () => {
    expect(normalizeRunTelemetryUsage({})).toBeUndefined();
  });
});
