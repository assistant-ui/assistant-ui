import { describe, expect, it } from "vitest";
import type { UIMessage } from "@ai-sdk/react";
import { extractRunTelemetry } from "./extractRunTelemetry";

function msg(
  role: UIMessage["role"],
  parts: UIMessage["parts"],
  metadata?: Record<string, unknown>,
): UIMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 8)}`,
    role,
    parts,
    ...(metadata ? { metadata } : undefined),
  } as UIMessage;
}

function assistantMsg(
  id: string,
  parts: UIMessage["parts"],
  metadata?: Record<string, unknown>,
): UIMessage {
  return {
    id,
    role: "assistant" as const,
    parts,
    ...(metadata ? { metadata } : undefined),
  } as UIMessage;
}

describe("extractRunTelemetry", () => {
  it("returns null when no assistant message exists", () => {
    expect(extractRunTelemetry([])).toBeNull();
    expect(
      extractRunTelemetry([msg("user", [{ type: "text", text: "hello" }])]),
    ).toBeNull();
  });

  it("determines status from presence of text parts", () => {
    const completed = extractRunTelemetry([
      assistantMsg("m-1", [{ type: "text", text: "Hello" }]),
    ])!;
    expect(completed.status).toBe("completed");
    expect(completed.outputText).toBe("Hello");

    const incomplete = extractRunTelemetry([
      assistantMsg("m-2", [{ type: "step-start" }]),
    ])!;
    expect(incomplete.status).toBe("incomplete");
    expect(incomplete.outputText).toBeUndefined();
  });

  it("extracts typed tool call with name derived from part type", () => {
    const result = extractRunTelemetry([
      assistantMsg("m-1", [
        {
          type: "tool-search",
          toolCallId: "tc-1",
          state: "output-available",
          input: { query: "test" },
          output: { results: ["a", "b"] },
        } as unknown as UIMessage["parts"][number],
      ]),
    ])!;
    expect(result.toolCalls).toEqual([
      {
        tool_name: "search",
        tool_call_id: "tc-1",
        tool_args: '{"query":"test"}',
        tool_result: '{"results":["a","b"]}',
      },
    ]);
  });

  it("marks dynamic-tool parts as mcp source", () => {
    const result = extractRunTelemetry([
      assistantMsg("m-1", [
        {
          type: "dynamic-tool",
          toolName: "mcp-tool",
          toolCallId: "tc-2",
          state: "output-available",
          input: { x: 1 },
          output: { y: 2 },
        } as unknown as UIMessage["parts"][number],
      ]),
    ])!;
    expect(result.toolCalls![0]!.tool_name).toBe("mcp-tool");
    expect(result.toolCalls![0]!.tool_source).toBe("mcp");
  });

  it("omits tool_args/tool_result when input/output not yet available", () => {
    const result = extractRunTelemetry([
      assistantMsg("m-1", [
        {
          type: "tool-noop",
          toolCallId: "tc-3",
          state: "input-available",
        } as unknown as UIMessage["parts"][number],
      ]),
    ])!;
    expect(result.toolCalls).toEqual([
      { tool_name: "noop", tool_call_id: "tc-3" },
    ]);
  });

  it("sets assistantMessageId and extracts from last assistant", () => {
    const result = extractRunTelemetry([
      assistantMsg("m-1", [{ type: "text", text: "first" }]),
      msg("user", [{ type: "text", text: "follow up" }]),
      assistantMsg("m-2", [{ type: "text", text: "second" }]),
    ])!;
    expect(result.assistantMessageId).toBe("m-2");
    expect(result.outputText).toBe("second");
  });

  it("truncates output text at 50k chars", () => {
    const result = extractRunTelemetry([
      assistantMsg("m-1", [{ type: "text", text: "x".repeat(60_000) }]),
    ])!;
    expect(result.outputText!.length).toBe(50_000);
  });

  it("summarizes base64 data in MCP tool results", () => {
    const b64 = "A".repeat(200);
    const result = extractRunTelemetry([
      assistantMsg("m-1", [
        {
          type: "dynamic-tool",
          toolName: "screen",
          toolCallId: "tc-4",
          state: "output-available",
          input: {},
          output: [{ type: "image", data: b64 }],
        } as unknown as UIMessage["parts"][number],
      ]),
    ])!;
    expect(result.toolCalls![0]!.tool_result).toContain("[image:");
    expect(result.toolCalls![0]!.tool_result).not.toContain(b64);
  });

  it("normalizes prompt/completion token aliases from metadata usage", () => {
    const result = extractRunTelemetry([
      assistantMsg("m-1", [{ type: "text", text: "ok" }], {
        usage: { promptTokens: 12, completionTokens: 7 },
      }),
    ])!;

    expect(result.inputTokens).toBe(12);
    expect(result.outputTokens).toBe(7);
  });

  it("extracts reasoning and cached input tokens from metadata usage", () => {
    const result = extractRunTelemetry([
      assistantMsg("m-1", [{ type: "text", text: "ok" }], {
        usage: {
          inputTokens: 12,
          outputTokens: 7,
          reasoningTokens: 3,
          cachedInputTokens: 2,
        },
      }),
    ])!;

    expect(result.inputTokens).toBe(12);
    expect(result.outputTokens).toBe(7);
    expect(result.reasoningTokens).toBe(3);
    expect(result.cachedInputTokens).toBe(2);
  });
});
