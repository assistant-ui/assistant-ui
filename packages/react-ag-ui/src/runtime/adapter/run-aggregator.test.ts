import type { ChatModelRunResult } from "@assistant-ui/core";
import { describe, expect, it } from "vitest";
import { makeLogger } from "../logger";
import type { AgUiEvent } from "../types";
import { RunAggregator } from "./run-aggregator";

function drive(events: AgUiEvent[]): ChatModelRunResult {
  let latest: ChatModelRunResult = { content: [] };
  const aggregator = new RunAggregator({
    showThinking: false,
    logger: makeLogger(),
    emit: (update) => {
      latest = update;
    },
  });
  for (const event of events) {
    aggregator.handle(event);
  }
  return latest;
}

function partTypes(result: ChatModelRunResult): string[] {
  return result.content.map((part) => part.type);
}

const ev = (event: Record<string, unknown>): AgUiEvent => event as AgUiEvent;

describe("RunAggregator part ordering", () => {
  it("anchors a tool call under its parent message even when its START arrives after later text", () => {
    // The messages and tool-call channels are not ordered relative to each
    // other on the wire: tc1 (spawned by message A) arrives only after message
    // B's text has started streaming. It must still render under A, not below B.
    const result = drive([
      ev({ type: "TEXT_MESSAGE_START", messageId: "mA", role: "assistant" }),
      ev({
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "mA",
        delta: "Let me look. ",
      }),
      ev({ type: "TEXT_MESSAGE_END", messageId: "mA" }),
      ev({ type: "TEXT_MESSAGE_START", messageId: "mB", role: "assistant" }),
      ev({
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "mB",
        delta: "Here it is.",
      }),
      ev({
        type: "TOOL_CALL_START",
        toolCallId: "tc1",
        toolCallName: "search",
        parentMessageId: "mA",
      }),
      ev({ type: "TOOL_CALL_ARGS", toolCallId: "tc1", delta: '{"q":"x"}' }),
      ev({ type: "TOOL_CALL_END", toolCallId: "tc1" }),
      ev({ type: "TEXT_MESSAGE_END", messageId: "mB" }),
    ]);

    expect(partTypes(result)).toEqual(["text", "tool-call", "text"]);
  });

  it("leaves an already in-order stream untouched", () => {
    const result = drive([
      ev({ type: "TEXT_MESSAGE_START", messageId: "mA", role: "assistant" }),
      ev({
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "mA",
        delta: "Let me look. ",
      }),
      ev({ type: "TEXT_MESSAGE_END", messageId: "mA" }),
      ev({
        type: "TOOL_CALL_START",
        toolCallId: "tc1",
        toolCallName: "search",
        parentMessageId: "mA",
      }),
      ev({ type: "TOOL_CALL_END", toolCallId: "tc1" }),
      ev({ type: "TEXT_MESSAGE_START", messageId: "mB", role: "assistant" }),
      ev({
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "mB",
        delta: "Here it is.",
      }),
      ev({ type: "TEXT_MESSAGE_END", messageId: "mB" }),
    ]);

    expect(partTypes(result)).toEqual(["text", "tool-call", "text"]);
  });

  it("keeps sibling tool calls of the same parent grouped and in arrival order", () => {
    const result = drive([
      ev({ type: "TEXT_MESSAGE_START", messageId: "mA", role: "assistant" }),
      ev({ type: "TEXT_MESSAGE_CONTENT", messageId: "mA", delta: "Working. " }),
      ev({ type: "TEXT_MESSAGE_END", messageId: "mA" }),
      ev({ type: "TEXT_MESSAGE_START", messageId: "mB", role: "assistant" }),
      ev({ type: "TEXT_MESSAGE_CONTENT", messageId: "mB", delta: "Done." }),
      ev({
        type: "TOOL_CALL_START",
        toolCallId: "tcA",
        toolCallName: "search",
        parentMessageId: "mA",
      }),
      ev({ type: "TOOL_CALL_END", toolCallId: "tcA" }),
      ev({
        type: "TOOL_CALL_START",
        toolCallId: "tcB",
        toolCallName: "fetch",
        parentMessageId: "mA",
      }),
      ev({ type: "TOOL_CALL_END", toolCallId: "tcB" }),
      ev({ type: "TEXT_MESSAGE_END", messageId: "mB" }),
    ]);

    expect(partTypes(result)).toEqual([
      "text",
      "tool-call",
      "tool-call",
      "text",
    ]);
    const toolIds = result.content
      .filter((part) => part.type === "tool-call")
      .map((part) => (part as { toolCallId: string }).toolCallId);
    expect(toolIds).toEqual(["tcA", "tcB"]);
  });

  it("appends a tool call with no parentMessageId in arrival order", () => {
    const result = drive([
      ev({ type: "TEXT_MESSAGE_START", messageId: "mA", role: "assistant" }),
      ev({ type: "TEXT_MESSAGE_CONTENT", messageId: "mA", delta: "Hi." }),
      ev({ type: "TEXT_MESSAGE_END", messageId: "mA" }),
      ev({
        type: "TOOL_CALL_START",
        toolCallId: "tc1",
        toolCallName: "search",
      }),
      ev({ type: "TOOL_CALL_END", toolCallId: "tc1" }),
    ]);

    expect(partTypes(result)).toEqual(["text", "tool-call"]);
  });
});
