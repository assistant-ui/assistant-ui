import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  aiSDKV6FormatAdapter,
  extractAISDKRunTelemetry,
  type AISDKMessageLike,
} from "./index";

const assistant = (
  parts: UIMessage["parts"],
  metadata?: Record<string, unknown>,
  id = "a1",
): UIMessage =>
  ({
    id,
    role: "assistant",
    parts,
    ...(metadata ? { metadata } : {}),
  }) as UIMessage;

describe("aiSDKV6FormatAdapter", () => {
  it("stores a message without its id and restores it from the row", () => {
    const message = assistant([{ type: "text", text: "hi" }], { a: 1 });
    const content = aiSDKV6FormatAdapter.encode({ parentId: null, message });
    expect(content).toEqual({
      role: "assistant",
      parts: [{ type: "text", text: "hi" }],
      metadata: { a: 1 },
    });
    expect(
      aiSDKV6FormatAdapter.decode({
        id: "a1",
        parent_id: "u1",
        format: "ai-sdk/v6",
        content,
      }),
    ).toEqual({ parentId: "u1", message });
    expect(aiSDKV6FormatAdapter.getId(message)).toBe("a1");
  });
});

describe("extractAISDKRunTelemetry", () => {
  it("returns null without an assistant message", () => {
    expect(
      extractAISDKRunTelemetry([
        { role: "user", parts: [{ type: "text", text: "q" }] },
      ]),
    ).toBeNull();
  });

  it("reads tool calls, steps and usage from one streamed message", () => {
    const message = assistant(
      [
        { type: "step-start" },
        {
          type: "tool-weather",
          toolCallId: "call_1",
          state: "output-available",
          input: { city: "Oslo" },
          output: { temp: 3 },
        } as UIMessage["parts"][number],
        { type: "step-start" },
        {
          type: "dynamic-tool",
          toolName: "search",
          toolCallId: "call_2",
          state: "output-available",
          input: { q: "x" },
          output: [{ type: "text", text: "found" }],
        } as UIMessage["parts"][number],
        { type: "step-start" },
        { type: "text", text: "Cold." },
      ],
      {
        usage: { inputTokens: 10, outputTokens: 5 },
        steps: [
          { usage: { promptTokens: 4, completionTokens: 1 } },
          { usage: { inputTokens: 6, outputTokens: 4 } },
          {},
        ],
        samplingCalls: { call_2: [{ duration_ms: 20 }] },
        modelId: "gpt-5.6-luna",
      },
    );

    expect(extractAISDKRunTelemetry([message])).toEqual({
      assistantMessageId: "a1",
      status: "completed",
      toolCalls: [
        {
          tool_name: "weather",
          tool_call_id: "call_1",
          tool_args: '{"city":"Oslo"}',
          tool_result: '{"temp":3}',
          tool_source: "frontend",
        },
        {
          tool_name: "search",
          tool_call_id: "call_2",
          tool_args: '{"q":"x"}',
          tool_result: '[{"type":"text","text":"found"}]',
          tool_source: "mcp",
          sampling_calls: [{ duration_ms: 20 }],
        },
      ],
      steps: [
        {
          usage: { promptTokens: 4, completionTokens: 1 },
          toolCalls: [expect.objectContaining({ tool_call_id: "call_1" })],
          finishReason: "tool-calls",
        },
        {
          usage: { inputTokens: 6, outputTokens: 4 },
          toolCalls: [expect.objectContaining({ tool_call_id: "call_2" })],
          finishReason: "tool-calls",
        },
        {},
      ],
      totalSteps: 3,
      outputText: "Cold.",
      usage: { inputTokens: 10, outputTokens: 5 },
      modelId: "gpt-5.6-luna",
      metadata: message.metadata,
    });
  });

  it("sums usage over stored rows without ids and reads legacy tool fields", () => {
    const rows: AISDKMessageLike[] = [
      {
        role: "assistant",
        parts: [
          { type: "step-start" },
          {
            type: "tool-lookup",
            toolCallId: "call_1",
            state: "output-available",
            args: { id: 1 },
            result: "ok",
          } as unknown as UIMessage["parts"][number],
        ],
        metadata: { steps: [{ usage: { inputTokens: 2, outputTokens: 1 } }] },
      },
      {
        role: "assistant",
        parts: [{ type: "step-start" }, { type: "text", text: "done" }],
        metadata: {
          steps: [{ usage: { inputTokens: 3, reasoningTokens: 7 } }],
        },
      },
    ];
    const result = extractAISDKRunTelemetry(rows);
    expect(result?.assistantMessageId).toBeUndefined();
    expect(result?.status).toBe("completed");
    expect(result?.totalSteps).toBe(2);
    expect(result?.usage).toEqual({
      inputTokens: 5,
      outputTokens: 1,
      reasoningTokens: 7,
    });
    expect(result?.toolCalls).toEqual([
      {
        tool_name: "lookup",
        tool_call_id: "call_1",
        tool_args: '{"id":1}',
        tool_result: '"ok"',
        tool_source: "frontend",
      },
    ]);
  });

  it("attaches sampling calls from the row that made the tool call", () => {
    const rows: AISDKMessageLike[] = [
      {
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "search",
            toolCallId: "call_1",
            state: "output-available",
            input: {},
            output: "x",
          } as UIMessage["parts"][number],
        ],
        metadata: { samplingCalls: { call_1: [{ duration_ms: 5 }] } },
      },
      {
        role: "assistant",
        parts: [{ type: "text", text: "done" }],
        metadata: { samplingCalls: {} },
      },
    ];
    expect(extractAISDKRunTelemetry(rows)?.toolCalls).toEqual([
      expect.objectContaining({
        tool_call_id: "call_1",
        tool_source: "mcp",
        sampling_calls: [{ duration_ms: 5 }],
      }),
    ]);
  });

  it("reads incomplete without text and no steps without step markers", () => {
    const result = extractAISDKRunTelemetry([
      assistant([
        {
          type: "tool-search",
          toolCallId: "c",
          state: "input-available",
          input: {},
        } as UIMessage["parts"][number],
      ]),
    ]);
    expect(result?.status).toBe("incomplete");
    expect(result?.steps).toBeUndefined();
    expect(result?.totalSteps).toBeUndefined();
    expect(result?.outputText).toBeUndefined();
  });

  it("reads completed for a tool only run once every call is answered", () => {
    const call = (
      toolCallId: string,
      state: string,
      rest: Record<string, unknown> = {},
    ) =>
      ({
        type: "tool-search",
        toolCallId,
        state,
        input: {},
        ...rest,
      }) as UIMessage["parts"][number];
    const statusOf = (parts: UIMessage["parts"]) =>
      extractAISDKRunTelemetry([assistant(parts)])?.status;

    expect(statusOf([call("a", "output-available", { output: [] })])).toBe(
      "completed",
    );
    expect(statusOf([call("a", "output-error", { errorText: "boom" })])).toBe(
      "completed",
    );
    expect(
      statusOf([
        call("a", "output-available", { output: [] }),
        call("b", "input-available"),
      ]),
    ).toBe("incomplete");
  });

  it("skips a stored part without a type", () => {
    const result = extractAISDKRunTelemetry([
      {
        role: "assistant",
        parts: [
          null,
          { toolCallId: "a" },
          { type: "text", text: "hi" },
        ] as never,
      },
    ]);
    expect(result?.outputText).toBe("hi");
    expect(result?.toolCalls).toBeUndefined();
  });
});
