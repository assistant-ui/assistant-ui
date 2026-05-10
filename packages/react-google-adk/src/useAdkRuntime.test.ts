import { describe, it, expect } from "vitest";
import {
  getMessageContent,
  getPendingCancellations,
  getPendingToolCalls,
} from "./useAdkRuntime";
import type { AppendMessage } from "@assistant-ui/core";
import type { AdkMessage } from "./types";

const makeAppendMessage = (content: AppendMessage["content"]): AppendMessage =>
  ({
    role: "user",
    content,
    attachments: [],
    parentId: null,
    sourceId: null,
    runConfig: undefined,
    metadata: { custom: {} },
  }) as unknown as AppendMessage;

const aiWithToolCalls = (
  id: string,
  toolCalls: Array<{ id: string; name: string }>,
): AdkMessage => ({
  id,
  type: "ai",
  content: [],
  tool_calls: toolCalls.map((tc) => ({
    id: tc.id,
    name: tc.name,
    args: {},
    argsText: "{}",
  })),
});

const toolResponse = (
  id: string,
  toolCallId: string,
  name: string,
): AdkMessage => ({
  id,
  type: "tool",
  tool_call_id: toolCallId,
  name,
  content: JSON.stringify({ ok: true }),
  status: "success",
});

describe("getPendingToolCalls", () => {
  it("returns tool calls without matching tool responses", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [
        { id: "tc-1", name: "tool_a" },
        { id: "tc-2", name: "tool_b" },
      ]),
    ];
    expect(getPendingToolCalls(messages)).toEqual([
      { id: "tc-1", name: "tool_a", args: {}, argsText: "{}" },
      { id: "tc-2", name: "tool_b", args: {}, argsText: "{}" },
    ]);
  });

  it("excludes tool calls that have a matching tool response", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [
        { id: "tc-1", name: "tool_a" },
        { id: "tc-2", name: "tool_b" },
      ]),
      toolResponse("t-1", "tc-1", "tool_a"),
    ];
    expect(getPendingToolCalls(messages)).toEqual([
      { id: "tc-2", name: "tool_b", args: {}, argsText: "{}" },
    ]);
  });

  it("returns empty for threads with no ai messages", () => {
    expect(getPendingToolCalls([])).toEqual([]);
  });
});

describe("getPendingCancellations", () => {
  it("emits a {cancelled:true} tool message for every pending tool call", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [{ id: "tc-1", name: "tool_a" }]),
    ];
    const result = getPendingCancellations(messages, []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: "tool",
      name: "tool_a",
      tool_call_id: "tc-1",
      content: JSON.stringify({ cancelled: true }),
      status: "error",
    });
  });

  it("skips tool calls whose id is in longRunningToolIds", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [
        { id: "lrt-1", name: "adk_request_input" },
        { id: "tc-2", name: "regular_tool" },
      ]),
    ];
    const result = getPendingCancellations(messages, ["lrt-1"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: "tool",
      name: "regular_tool",
      tool_call_id: "tc-2",
    });
  });

  it("skips all three HITL interrupt types", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [
        { id: "lrt-1", name: "adk_request_input" },
        { id: "lrt-2", name: "adk_request_confirmation" },
        { id: "lrt-3", name: "adk_request_credential" },
      ]),
    ];
    const result = getPendingCancellations(messages, [
      "lrt-1",
      "lrt-2",
      "lrt-3",
    ]);
    expect(result).toEqual([]);
  });

  it("returns empty when no tool calls are pending", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [{ id: "tc-1", name: "tool_a" }]),
      toolResponse("t-1", "tc-1", "tool_a"),
    ];
    expect(getPendingCancellations(messages, [])).toEqual([]);
  });

  it("cancels regular tool calls even when HITL interrupts are resolved", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [
        { id: "lrt-1", name: "adk_request_input" },
        { id: "tc-2", name: "regular_tool" },
      ]),
      toolResponse("t-1", "lrt-1", "adk_request_input"),
    ];
    // lrt-1 lingering in longRunningToolIds is harmless because
    // getPendingToolCalls already excluded it via the tool response.
    const result = getPendingCancellations(messages, ["lrt-1"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      tool_call_id: "tc-2",
      name: "regular_tool",
    });
  });
});

describe("getMessageContent", () => {
  it("preserves file part data and mimeType end-to-end", () => {
    const result = getMessageContent(
      makeAppendMessage([
        { type: "text", text: "see attached" },
        {
          type: "file",
          mimeType: "application/pdf",
          data: "JVBERi0xLjQK",
          filename: "report.pdf",
        },
      ]),
    );
    expect(result).toEqual([
      { type: "text", text: "see attached" },
      {
        type: "file",
        mimeType: "application/pdf",
        data: "JVBERi0xLjQK",
        filename: "report.pdf",
      },
    ]);
  });

  it("keeps file-only content as an array (does not collapse to a text marker)", () => {
    const result = getMessageContent(
      makeAppendMessage([
        {
          type: "file",
          mimeType: "image/png",
          data: "AAAA",
          filename: "x.png",
        },
      ]),
    );
    expect(result).toEqual([
      {
        type: "file",
        mimeType: "image/png",
        data: "AAAA",
        filename: "x.png",
      },
    ]);
  });

  it("omits filename when not provided", () => {
    const result = getMessageContent(
      makeAppendMessage([
        { type: "file", mimeType: "application/pdf", data: "AAAA" },
      ]),
    );
    expect(result).toEqual([
      { type: "file", mimeType: "application/pdf", data: "AAAA" },
    ]);
  });
});
