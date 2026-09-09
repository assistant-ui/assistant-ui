import { describe, expect, it } from "vitest";
import {
  createRunReport,
  createRunTelemetryToolCall,
  deriveRunOutcome,
  extractRunTelemetryModelId,
  normalizeRunTelemetryUsage,
  truncateRunTelemetryText,
} from "./runTelemetry";

const MAX = 50_000;

describe("deriveRunOutcome", () => {
  it.each([
    [{ isError: true }, { status: "error" }],
    [{ isAbort: true }, { status: "incomplete", outcome: "aborted" }],
    [{ isDisconnect: true }, { status: "incomplete", outcome: "disconnected" }],
    [{ finishReason: "length" }, { status: "incomplete", outcome: "length" }],
    [
      { finishReason: "content-filter" },
      { status: "incomplete", outcome: "content_filter" },
    ],
    [
      { finishReason: "content_filter" },
      { status: "incomplete", outcome: "content_filter" },
    ],
    [
      { finishReason: "cancelled" },
      { status: "incomplete", outcome: "aborted" },
    ],
    [{ finishReason: "stop" }, { status: "completed" }],
    [{ finishReason: "tool-calls" }, { status: "completed" }],
    [{}, { status: "completed" }],
    [{ finishReason: "other" }, { status: "completed" }],
  ])("maps %o", (input, expected) => {
    expect(deriveRunOutcome(input)).toEqual(expected);
  });
});

describe("createRunReport", () => {
  const toolCall = {
    tool_name: "weather",
    tool_call_id: "call-1",
    tool_args: '{"city":"Singapore"}',
  };

  it("creates the full aui/v0 report", () => {
    expect(
      createRunReport({
        threadId: "aui-thread",
        status: "incomplete",
        outcome: "length",
        errorCode: "model_limit",
        error: "response cut off",
        messageId: "cloud-message",
        traceId: "AABBCCDDEEFF00112233445566778899",
        modelId: "provider/model",
        provider: "openai",
        usage: {
          promptTokens: 11,
          completionTokens: 7,
          reasoningTokens: 3,
          cachedInputTokens: 2,
        },
        steps: [
          {
            usage: { inputTokens: 5, outputTokens: 4 },
            toolCalls: [toolCall],
            startMs: 10,
            endMs: 20,
            finishReason: "tool-calls",
          },
          {
            usage: { inputTokens: 6, outputTokens: 3, reasoningTokens: 3 },
            startMs: 21,
            endMs: 42,
            finishReason: "length".repeat(8),
          },
        ],
        toolCalls: [toolCall],
        durationMs: 42.5,
        firstTokenMs: -4,
        outputText: "hello from aui/v0",
        metadata: { tenant: "acme" },
        telemetry: {
          environment: "production",
          release: "web-2026.09.09",
          tags: [" region:sg ", "region:sg", "tier:paid"],
        },
      }),
    ).toEqual({
      thread_id: "aui-thread",
      status: "incomplete",
      outcome_type: "length",
      error_code: "model_limit",
      error: "response cut off",
      message_id: "cloud-message",
      trace_id: "aabbccddeeff00112233445566778899",
      model_id: "provider/model",
      provider: "openai",
      provider_type: "openai",
      input_tokens: 11,
      output_tokens: 7,
      reasoning_tokens: 3,
      cached_input_tokens: 2,
      steps: [
        {
          input_tokens: 5,
          output_tokens: 4,
          tool_calls: [toolCall],
          start_ms: 10,
          end_ms: 20,
          finish_reason: "tool-calls",
        },
        {
          input_tokens: 6,
          output_tokens: 3,
          reasoning_tokens: 3,
          start_ms: 21,
          end_ms: 42,
          finish_reason: "lengthlengthlengthlengthlengthle",
        },
      ],
      total_steps: 2,
      tool_calls: [toolCall],
      duration_ms: 43,
      first_token_ms: 0,
      output_text: "hello from aui/v0",
      metadata: { tenant: "acme" },
      environment: "production",
      release: "web-2026.09.09",
      tags: ["region:sg", "tier:paid"],
    });
  });

  it("creates the full ai-sdk/v6 report", () => {
    expect(
      createRunReport({
        threadId: "ai-sdk-thread",
        status: "completed",
        traceId: "00112233445566778899aabbccddeeff",
        modelId: "gpt-5.6-terra",
        provider: "gateway",
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          inputTokenDetails: { cacheReadTokens: 10 },
          outputTokenDetails: { reasoningTokens: 20 },
        },
        steps: [
          {
            usage: {
              inputTokens: 100,
              outputTokens: 50,
              inputTokenDetails: { cacheReadTokens: 10 },
              outputTokenDetails: { reasoningTokens: 20 },
            },
            finishReason: "stop",
          },
        ],
        durationMs: 125.2,
        firstTokenMs: 12.6,
        outputText: "hello from ai-sdk/v6",
        telemetry: { tags: ["sdk:v6"] },
      }),
    ).toEqual({
      thread_id: "ai-sdk-thread",
      status: "completed",
      trace_id: "00112233445566778899aabbccddeeff",
      model_id: "gpt-5.6-terra",
      provider: "gateway",
      provider_type: "gateway",
      input_tokens: 100,
      output_tokens: 50,
      reasoning_tokens: 20,
      cached_input_tokens: 10,
      steps: [
        {
          input_tokens: 100,
          output_tokens: 50,
          reasoning_tokens: 20,
          cached_input_tokens: 10,
          finish_reason: "stop",
        },
      ],
      total_steps: 1,
      duration_ms: 125,
      first_token_ms: 13,
      output_text: "hello from ai-sdk/v6",
      tags: ["sdk:v6"],
    });
  });

  it("normalizes tags and limits them to twenty 64-character values", () => {
    const longTag = "a".repeat(70);
    const tags = [" one ", "", "one", longTag];
    for (let index = 0; index < 24; index++) tags.push(`tag:${index}`);

    const report = createRunReport({
      threadId: "thread",
      status: "completed",
      telemetry: { tags },
    });

    expect(report.tags).toEqual([
      "one",
      "a".repeat(64),
      ...Array.from({ length: 18 }, (_, index) => `tag:${index}`),
    ]);
  });

  it("lowercases valid trace IDs, omits invalid IDs, and omits undefined keys", () => {
    expect(
      createRunReport({
        threadId: "thread",
        status: "completed",
        traceId: "AABBCCDDEEFF00112233445566778899",
      }).trace_id,
    ).toBe("aabbccddeeff00112233445566778899");
    expect(
      createRunReport({
        threadId: "thread",
        status: "completed",
        traceId: "aabbccdd",
      }),
    ).toEqual({ thread_id: "thread", status: "completed" });
    expect(
      createRunReport({
        threadId: "thread",
        status: "completed",
      }),
    ).toEqual({ thread_id: "thread", status: "completed" });
  });
});

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

  it("reads the AI SDK v7 token detail objects", () => {
    expect(
      normalizeRunTelemetryUsage({
        inputTokens: 12,
        outputTokens: 7,
        inputTokenDetails: { cacheReadTokens: 5 },
        outputTokenDetails: { reasoningTokens: 3 },
      }),
    ).toEqual({
      inputTokens: 12,
      outputTokens: 7,
      reasoningTokens: 3,
      cachedInputTokens: 5,
    });
  });

  it("prefers the top-level detail counts over the nested ones", () => {
    expect(
      normalizeRunTelemetryUsage({
        reasoningTokens: 3,
        cachedInputTokens: 5,
        inputTokenDetails: { cacheReadTokens: 90 },
        outputTokenDetails: { reasoningTokens: 90 },
      }),
    ).toEqual({ reasoningTokens: 3, cachedInputTokens: 5 });
  });

  it("returns a usage object when only the nested counts are present", () => {
    expect(
      normalizeRunTelemetryUsage({
        inputTokenDetails: { cacheReadTokens: 5 },
      }),
    ).toEqual({ cachedInputTokens: 5 });
  });

  it("returns undefined when no count is present", () => {
    expect(normalizeRunTelemetryUsage({})).toBeUndefined();
    expect(
      normalizeRunTelemetryUsage({
        inputTokenDetails: {},
        outputTokenDetails: {},
      }),
    ).toBeUndefined();
  });
});

describe("extractRunTelemetryModelId", () => {
  it("prefers an explicit model ID over every fallback", () => {
    expect(
      extractRunTelemetryModelId({
        modelId: "explicit",
        custom: { modelId: "custom" },
        steps: [{ response: { modelId: "step" } }],
      }),
    ).toBe("explicit");
  });

  it("falls back to the custom bag before the steps", () => {
    expect(
      extractRunTelemetryModelId({
        custom: { modelId: "custom" },
        steps: [{ response: { modelId: "step" } }],
      }),
    ).toBe("custom");
  });

  it("reads the first step that carries a response model ID", () => {
    expect(
      extractRunTelemetryModelId({
        steps: [{ usage: { inputTokens: 1 } }, { response: { modelId: "b" } }],
      }),
    ).toBe("b");
  });

  it("returns undefined when no channel carries one", () => {
    expect(extractRunTelemetryModelId(undefined)).toBeUndefined();
    expect(extractRunTelemetryModelId({})).toBeUndefined();
    expect(
      extractRunTelemetryModelId({
        modelId: 7,
        custom: { modelId: null },
        steps: [null, "step", { response: null }, { response: { modelId: 7 } }],
      }),
    ).toBeUndefined();
  });
});
