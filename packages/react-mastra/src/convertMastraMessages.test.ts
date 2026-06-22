import { describe, expect, it } from "vitest";
import { convertMastraMessage } from "./convertMastraMessages";
import type { MastraMessage } from "./types";

const metadata = {};

describe("convertMastraMessage", () => {
  it("converts human text messages to user messages", () => {
    expect(
      convertMastraMessage(
        { id: "m1", type: "human", content: "hello" },
        metadata,
      ),
    ).toMatchObject({
      role: "user",
      id: "m1",
      content: [{ type: "text", text: "hello" }],
    });
  });

  it("preserves assistant reasoning and tool calls", () => {
    const message: MastraMessage = {
      id: "m2",
      type: "assistant",
      status: "running",
      content: [
        { type: "reasoning", text: "thinking" },
        {
          type: "tool_call",
          tool_call: {
            id: "call-1",
            name: "lookup",
            arguments: { q: "assistant-ui" },
          },
        },
      ],
    };

    expect(convertMastraMessage(message, metadata)).toMatchObject({
      role: "assistant",
      id: "m2",
      status: { type: "running" },
      content: [
        { type: "reasoning", text: "thinking" },
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "lookup",
          args: { q: "assistant-ui" },
        },
      ],
    });
  });

  it("converts tool result messages", () => {
    expect(
      convertMastraMessage(
        {
          id: "tool-1",
          type: "tool",
          tool_call_id: "call-1",
          name: "lookup",
          content: [
            {
              type: "tool_result",
              tool_result: {
                tool_call_id: "call-1",
                name: "lookup",
                result: { ok: true },
              },
            },
          ],
        },
        metadata,
      ),
    ).toMatchObject({
      role: "tool",
      toolCallId: "call-1",
      toolName: "lookup",
      result: { ok: true },
      isError: false,
    });
  });
});
