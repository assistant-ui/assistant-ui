import { describe, expect, it } from "vitest";
import {
  createToolCallCancellationStub,
  scanPendingToolCalls,
} from "./pending-tool-calls";

type Message =
  | { type: "assistant"; toolCalls: { id: string; name: string }[] }
  | { type: "tool"; toolCallId: string };

const getPendingToolCalls = (messages: readonly Message[]) =>
  scanPendingToolCalls(
    messages,
    (message) =>
      message.type === "assistant"
        ? { toolCalls: message.toolCalls }
        : { toolCallId: message.toolCallId },
    (toolCall) => toolCall.id,
  );

describe("scanPendingToolCalls", () => {
  it("returns tool calls without matching results in history order", () => {
    expect(
      getPendingToolCalls([
        {
          type: "assistant",
          toolCalls: [
            { id: "call-1", name: "first" },
            { id: "call-2", name: "second" },
          ],
        },
        { type: "tool", toolCallId: "call-1" },
        {
          type: "assistant",
          toolCalls: [{ id: "call-3", name: "third" }],
        },
      ]),
    ).toEqual([
      { id: "call-2", name: "second" },
      { id: "call-3", name: "third" },
    ]);
  });
});

describe("createToolCallCancellationStub", () => {
  it("creates an error tool result with the cancellation payload", () => {
    expect(
      createToolCallCancellationStub({ id: "call-1", name: "lookup" }),
    ).toEqual({
      type: "tool",
      name: "lookup",
      tool_call_id: "call-1",
      content: JSON.stringify({ cancelled: true }),
      status: "error",
    });
  });
});
