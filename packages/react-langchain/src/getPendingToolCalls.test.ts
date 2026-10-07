import { describe, expect, it } from "vitest";
import type { LangChainBaseMessage } from "./types";
import { getPendingToolCalls } from "./useStreamRuntime";

const aiWithNullToolCall = {
  id: "ai-1",
  _getType: () => "ai",
  content: "",
  tool_calls: [null, { id: "call-1", name: "lookup", args: {} }],
} as unknown as LangChainBaseMessage;

describe("getPendingToolCalls", () => {
  it("skips a null tool_calls entry and returns the remaining pending call", () => {
    expect(
      getPendingToolCalls([
        { id: "human-1", _getType: () => "human", content: "look it up" },
        aiWithNullToolCall,
      ]),
    ).toEqual([{ id: "call-1", name: "lookup", args: {} }]);
  });

  it("treats a call answered by a tool message as settled next to a null entry", () => {
    expect(
      getPendingToolCalls([
        aiWithNullToolCall,
        {
          id: "tool-1",
          _getType: () => "tool",
          content: "done",
          tool_call_id: "call-1",
        } as LangChainBaseMessage,
      ]),
    ).toEqual([]);
  });
});
