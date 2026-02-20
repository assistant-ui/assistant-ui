"use client";

import { describe, it, expect, beforeEach } from "vitest";
import type { ChatModelRunResult } from "@assistant-ui/react";
import { RunAggregator } from "../src/runtime/adapter/run-aggregator";
import type { AGUIEvent } from "../src/runtime/types";

const makeLogger = () => ({
  debug: () => {},
  error: () => {},
});

describe("RunAggregator", () => {
  let results: ChatModelRunResult[];

  beforeEach(() => {
    results = [];
  });

  const createAggregator = (showThinking: boolean) =>
    new RunAggregator({
      showThinking,
      logger: makeLogger(),
      emit: (update) => results.push(update),
    });

  it("streams text content", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "Hello",
    } as AGUIEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: " world",
    } as AGUIEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AGUIEvent);

    const last = results.at(-1);
    expect(last?.status?.type).toBe("complete");
    const textPart = last?.content?.find((part) => part.type === "text");
    expect(textPart).toBeTruthy();
    expect((textPart as any).text).toBe("Hello world");
  });

  it("maps thinking events to reasoning part when enabled", () => {
    const aggregator = createAggregator(true);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({ type: "THINKING_TEXT_MESSAGE_START" } as AGUIEvent);
    aggregator.handle({
      type: "THINKING_TEXT_MESSAGE_CONTENT",
      delta: "Reasoning...",
    } as AGUIEvent);
    aggregator.handle({ type: "THINKING_TEXT_MESSAGE_END" } as AGUIEvent);

    const reasoningPart = results.at(-1)?.content?.[0];
    expect(reasoningPart?.type).toBe("reasoning");
    expect((reasoningPart as any).text).toBe("Reasoning...");
  });

  it("ignores thinking events when disabled", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({
      type: "THINKING_TEXT_MESSAGE_CONTENT",
      delta: "hidden",
    } as AGUIEvent);

    const parts = results.at(-1)?.content ?? [];
    expect(parts.every((part) => part.type !== "reasoning")).toBe(true);
  });

  it("tracks tool call lifecycle", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "search",
    } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_ARGS",
      toolCallId: "tool1",
      delta: '{"query":"test"}',
    } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool1",
      content: '"result"',
    } as AGUIEvent);

    const last = results.at(-1);
    const toolPart = last?.content?.find((part) => part.type === "tool-call");
    expect(toolPart).toBeTruthy();
    expect((toolPart as any).toolName).toBe("search");
    expect((toolPart as any).argsText).toBe('{"query":"test"}');
    expect((toolPart as any).result).toBe("result");
  });

  it("sets requires-action status when tool calls lack results at RUN_FINISHED", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "search",
    } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_ARGS",
      toolCallId: "tool1",
      delta: '{"q":"x"}',
    } as AGUIEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AGUIEvent);

    const last = results.at(-1);
    expect(last?.status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });
  });

  it("sets complete status when all tool calls have results at RUN_FINISHED", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "search",
    } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool1",
      content: '"done"',
    } as AGUIEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AGUIEvent);

    const last = results.at(-1);
    expect(last?.status?.type).toBe("complete");
  });

  it("respects event ordering between tool calls and text", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "search",
    } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool1",
      content: '"result"',
    } as AGUIEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "Final answer",
    } as AGUIEvent);

    const last = results.at(-1);
    const types = (last?.content ?? []).map((part) => part.type);
    expect(types).toEqual(["tool-call", "text"]);
  });

  it("creates additional text parts for subsequent assistant messages", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_START",
      messageId: "m1",
    } as AGUIEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m1",
      delta: "First",
    } as AGUIEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_END",
      messageId: "m1",
    } as AGUIEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_START",
      messageId: "m2",
    } as AGUIEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m2",
      delta: "Second",
    } as AGUIEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AGUIEvent);

    const last = results.at(-1);
    const textParts = (last?.content ?? []).filter(
      (part) => part.type === "text",
    );
    expect(textParts).toHaveLength(2);
    expect((textParts[0] as any).text).toBe("First");
    expect((textParts[1] as any).text).toBe("Second");
  });

  it("marks status as cancelled", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({ type: "RUN_CANCELLED" } as AGUIEvent);

    const last = results.at(-1);
    expect(last?.status).toMatchObject({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("parses tool call args into an object once JSON becomes valid", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "search",
    } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_ARGS",
      toolCallId: "tool1",
      delta: '{"query":',
    } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_ARGS",
      toolCallId: "tool1",
      delta: '"pizza"}',
    } as AGUIEvent);

    const last = results.at(-1);
    const toolPart = last?.content?.find(
      (part) => part.type === "tool-call",
    ) as any;
    expect(toolPart).toBeTruthy();
    expect(toolPart.argsText).toBe('{"query":"pizza"}');
    expect(toolPart.args).toEqual({ query: "pizza" });
  });

  it("positions reasoning content before text when thinking is shown", () => {
    const aggregator = createAggregator(true);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({ type: "THINKING_TEXT_MESSAGE_START" } as AGUIEvent);
    aggregator.handle({
      type: "THINKING_TEXT_MESSAGE_CONTENT",
      delta: "Reasoning first",
    } as AGUIEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "Then answer",
    } as AGUIEvent);

    const last = results.at(-1);
    const types = (last?.content ?? []).map((part) => part.type);
    expect(types[0]).toBe("reasoning");
    expect(types[1]).toBe("text");
    expect((last?.content?.[0] as any).text).toBe("Reasoning first");
  });

  it("marks run errors with reason and message", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({ type: "RUN_ERROR", message: "boom" } as AGUIEvent);

    const last = results.at(-1);
    expect(last?.status).toMatchObject({
      type: "incomplete",
      reason: "error",
      error: "boom",
    });
  });

  it("parses tool call results and defaults metadata", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AGUIEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool1",
      content: '{"ok":true}',
      role: "tool",
    } as AGUIEvent);

    const last = results.at(-1);
    const toolPart = last?.content?.find(
      (part) => part.type === "tool-call",
    ) as any;
    expect(toolPart).toBeTruthy();
    expect(toolPart.toolName).toBe("tool");
    expect(toolPart.result).toEqual({ ok: true });
    expect(toolPart.isError).toBe(false);
  });
});
