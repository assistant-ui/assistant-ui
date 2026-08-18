import { describe, expect, it } from "vitest";
import {
  getPendingToolCallGroups,
  getPendingToolCalls,
  pendingToolCallGroupKey,
} from "./messageHelpers";
import type { LangChainMessage } from "./types";

const ai = (
  id: string | undefined,
  toolCalls: { id: string; name: string }[],
): LangChainMessage => ({
  ...(id !== undefined && { id }),
  type: "ai",
  content: "",
  tool_calls: toolCalls.map((toolCall) => ({
    id: toolCall.id,
    name: toolCall.name,
    args: {},
  })),
});

const tool = (toolCallId: string): LangChainMessage => ({
  type: "tool",
  content: "{}",
  tool_call_id: toolCallId,
  name: "my_tool",
  status: "success",
});

describe("getPendingToolCallGroups", () => {
  it("keeps parallel calls from one AI message in a single group", () => {
    expect(
      getPendingToolCallGroups([
        ai("ai-1", [
          { id: "tc-1", name: "a" },
          { id: "tc-2", name: "b" },
        ]),
      ]),
    ).toEqual([
      {
        key: "message:ai-1",
        toolCalls: [
          { id: "tc-1", name: "a", args: {} },
          { id: "tc-2", name: "b", args: {} },
        ],
      },
    ]);
  });

  it("splits pending calls from different AI messages", () => {
    expect(
      getPendingToolCallGroups([
        ai("ai-1", [{ id: "tc-1", name: "a" }]),
        ai("ai-2", [{ id: "tc-2", name: "b" }]),
      ]),
    ).toEqual([
      {
        key: "message:ai-1",
        toolCalls: [{ id: "tc-1", name: "a", args: {} }],
      },
      {
        key: "message:ai-2",
        toolCalls: [{ id: "tc-2", name: "b", args: {} }],
      },
    ]);
  });

  it("drops a call once a tool result arrives", () => {
    expect(
      getPendingToolCallGroups([
        ai("ai-1", [{ id: "tc-1", name: "a" }]),
        ai("ai-2", [{ id: "tc-2", name: "b" }]),
        tool("tc-1"),
      ]),
    ).toEqual([
      {
        key: "message:ai-2",
        toolCalls: [{ id: "tc-2", name: "b", args: {} }],
      },
    ]);
  });

  it("uses a custom group key resolver when provided", () => {
    expect(
      getPendingToolCallGroups(
        [
          ai("ai-1", [{ id: "tc-1", name: "a" }]),
          ai("ai-2", [{ id: "tc-2", name: "b" }]),
        ],
        (message) =>
          message.id === "ai-1" || message.id === "ai-2"
            ? "run:shared"
            : pendingToolCallGroupKey(message),
      ),
    ).toEqual([
      {
        key: "run:shared",
        toolCalls: [
          { id: "tc-1", name: "a", args: {} },
          { id: "tc-2", name: "b", args: {} },
        ],
      },
    ]);
  });

  it("falls back to the first tool id when the AI message has no id", () => {
    expect(
      getPendingToolCallGroups([
        ai(undefined, [
          { id: "tc-1", name: "a" },
          { id: "tc-2", name: "b" },
        ]),
      ]),
    ).toEqual([
      {
        key: "tool:tc-1",
        toolCalls: [
          { id: "tc-1", name: "a", args: {} },
          { id: "tc-2", name: "b", args: {} },
        ],
      },
    ]);
  });
});

describe("getPendingToolCalls", () => {
  it("flattens groups in history order", () => {
    expect(
      getPendingToolCalls([
        ai("ai-1", [{ id: "tc-1", name: "a" }]),
        ai("ai-2", [{ id: "tc-2", name: "b" }]),
      ]),
    ).toEqual([
      { id: "tc-1", name: "a", args: {} },
      { id: "tc-2", name: "b", args: {} },
    ]);
  });
});
