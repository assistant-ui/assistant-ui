import { describe, it, expect } from "vitest";
import { AssistantMessageAccumulator } from "./assistant-message-accumulator";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import type { AssistantMessage } from "../utils/types";

const collectStream = async (
  chunks: AssistantStreamChunk[],
): Promise<AssistantMessage[]> => {
  const accumulator = new AssistantMessageAccumulator();
  const messages: AssistantMessage[] = [];

  const source = new ReadableStream<AssistantStreamChunk>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  await source.pipeThrough(accumulator).pipeTo(
    new WritableStream({
      write(message) {
        messages.push(message);
      },
    }),
  );

  return messages;
};

describe("AssistantMessageAccumulator timing", () => {
  it("should include timing on message-finish", async () => {
    const chunks: AssistantStreamChunk[] = [
      { type: "step-start", path: [], messageId: "msg-1" },
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "text-delta", path: [0], textDelta: "Hello " },
      { type: "text-delta", path: [0], textDelta: "world" },
      { type: "part-finish", path: [0] },
      {
        type: "step-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
        isContinued: false,
      },
      {
        type: "message-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    expect(last.metadata.timing).toBeDefined();
    const timing = last.metadata.timing!;
    expect(timing.streamStartTime).toBeTypeOf("number");
    expect(timing.totalChunks).toBe(7);
    expect(timing.toolCallCount).toBe(0);
    expect(timing.tokenCount).toBe(5);
    expect(timing.firstTokenTime).toBeTypeOf("number");
    expect(timing.totalStreamTime).toBeTypeOf("number");
    expect(timing.totalStreamTime).toBeGreaterThanOrEqual(0);
  });

  it("should track tool calls in timing", async () => {
    const chunks: AssistantStreamChunk[] = [
      {
        type: "part-start",
        path: [0],
        part: {
          type: "tool-call",
          toolCallId: "tc-1",
          toolName: "search",
        },
      },
      { type: "text-delta", path: [0], textDelta: '{"q":"test"}' },
      { type: "tool-call-args-text-finish", path: [0] },
      {
        type: "result",
        path: [0],
        result: "found",
        isError: false,
      },
      { type: "part-finish", path: [0] },
      {
        type: "message-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    expect(last.metadata.timing).toBeDefined();
    expect(last.metadata.timing!.toolCallCount).toBe(1);
  });

  it("should include timing on flush when stream closes without message-finish", async () => {
    const chunks: AssistantStreamChunk[] = [
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "text-delta", path: [0], textDelta: "partial" },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    // flush should have produced a message with timing
    expect(last.metadata.timing).toBeDefined();
    expect(last.metadata.timing!.totalChunks).toBe(2);
  });

  it("should estimate tokens from text when no usage provided", async () => {
    const chunks: AssistantStreamChunk[] = [
      { type: "part-start", path: [0], part: { type: "text" } },
      {
        type: "text-delta",
        path: [0],
        textDelta: "1234567890123456789012345678901234567890",
      }, // 40 chars
      { type: "part-finish", path: [0] },
      {
        type: "message-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    expect(last.metadata.timing!.tokenCount).toBe(10); // 40/4
  });

  it("should record firstTokenTime on text-delta", async () => {
    const chunks: AssistantStreamChunk[] = [
      {
        type: "part-start",
        path: [0],
        part: {
          type: "tool-call",
          toolCallId: "tc-1",
          toolName: "search",
        },
      },
      { type: "text-delta", path: [0], textDelta: "{}" },
      { type: "tool-call-args-text-finish", path: [0] },
      {
        type: "result",
        path: [0],
        result: "ok",
        isError: false,
      },
      { type: "part-finish", path: [0] },
      {
        type: "message-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    // text-delta on tool-call args still records first token
    expect(last.metadata.timing).toBeDefined();
    expect(last.metadata.timing!.firstTokenTime).toBeTypeOf("number");
  });
});

describe("AssistantMessageAccumulator update-state sequencing", () => {
  it("drops stale component updates when seq regresses", async () => {
    const chunks: AssistantStreamChunk[] = [
      {
        type: "update-state",
        path: [],
        operations: [
          {
            type: "set",
            path: ["components", "card_1", "seq"],
            value: 2,
          },
          {
            type: "set",
            path: ["components", "card_1", "lifecycle"],
            value: "active",
          },
        ],
      },
      {
        type: "update-state",
        path: [],
        operations: [
          {
            type: "set",
            path: ["components", "card_1", "seq"],
            value: 1,
          },
          {
            type: "set",
            path: ["components", "card_1", "lifecycle"],
            value: "complete",
          },
        ],
      },
      {
        type: "message-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    expect(last.metadata.unstable_state).toEqual({
      components: {
        card_1: {
          seq: 2,
          lifecycle: "active",
        },
      },
    });
  });

  it("applies newer component instances while dropping stale ones in the same patch", async () => {
    const chunks: AssistantStreamChunk[] = [
      {
        type: "update-state",
        path: [],
        operations: [
          {
            type: "set",
            path: ["components", "card_1", "seq"],
            value: 2,
          },
          {
            type: "set",
            path: ["components", "card_1", "lifecycle"],
            value: "active",
          },
        ],
      },
      {
        type: "update-state",
        path: [],
        operations: [
          {
            type: "set",
            path: ["components", "card_1", "seq"],
            value: 1,
          },
          {
            type: "set",
            path: ["components", "card_1", "lifecycle"],
            value: "complete",
          },
          {
            type: "set",
            path: ["components", "card_2", "seq"],
            value: 1,
          },
          {
            type: "set",
            path: ["components", "card_2", "lifecycle"],
            value: "active",
          },
        ],
      },
      {
        type: "message-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    expect(last.metadata.unstable_state).toEqual({
      components: {
        card_1: {
          seq: 2,
          lifecycle: "active",
        },
        card_2: {
          seq: 1,
          lifecycle: "active",
        },
      },
    });
  });

  it("drops stale append-text operations for regressed component seq", async () => {
    const chunks: AssistantStreamChunk[] = [
      {
        type: "update-state",
        path: [],
        operations: [
          {
            type: "set",
            path: ["components", "card_1", "seq"],
            value: 2,
          },
          {
            type: "set",
            path: ["components", "card_1", "lifecycle"],
            value: "active",
          },
        ],
      },
      {
        type: "update-state",
        path: [],
        operations: [
          {
            type: "set",
            path: ["components", "card_1", "seq"],
            value: 1,
          },
          {
            type: "append-text",
            path: ["components", "card_1", "lifecycle"],
            value: "-stale",
          },
        ],
      },
      {
        type: "message-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    expect(last.metadata.unstable_state).toEqual({
      components: {
        card_1: {
          seq: 2,
          lifecycle: "active",
        },
      },
    });
  });
});
