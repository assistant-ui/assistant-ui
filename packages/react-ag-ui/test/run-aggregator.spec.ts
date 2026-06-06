"use client";

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ChatModelRunResult } from "@assistant-ui/core";
import { RunAggregator } from "../src/runtime/adapter/run-aggregator";
import type { AgUiEvent } from "../src/runtime/types";

const makeLogger = () => ({
  debug: () => {},
  error: () => {},
});

describe("RunAggregator", () => {
  let results: ChatModelRunResult[];

  beforeEach(() => {
    results = [];
  });

  const createAggregator = (
    showThinking: boolean,
    onServerMessageId?: (id: string) => void,
  ) =>
    new RunAggregator({
      showThinking,
      logger: makeLogger(),
      emit: (update) => results.push(update),
      ...(onServerMessageId ? { onServerMessageId } : {}),
    });

  it("streams text content", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "Hello",
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: " world",
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AgUiEvent);

    const last = results.at(-1);
    expect(last?.status?.type).toBe("complete");
    const textPart = last?.content?.find((part) => part.type === "text");
    expect(textPart).toBeTruthy();
    expect((textPart as any).text).toBe("Hello world");
  });

  it("maps thinking events to reasoning part when enabled", () => {
    const aggregator = createAggregator(true);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({ type: "THINKING_TEXT_MESSAGE_START" } as AgUiEvent);
    aggregator.handle({
      type: "THINKING_TEXT_MESSAGE_CONTENT",
      delta: "Reasoning...",
    } as AgUiEvent);
    aggregator.handle({ type: "THINKING_TEXT_MESSAGE_END" } as AgUiEvent);

    const reasoningPart = results.at(-1)?.content?.[0];
    expect(reasoningPart?.type).toBe("reasoning");
    expect((reasoningPart as any).text).toBe("Reasoning...");
  });

  it("ignores thinking events when disabled", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "THINKING_TEXT_MESSAGE_CONTENT",
      delta: "hidden",
    } as AgUiEvent);

    const parts = results.at(-1)?.content ?? [];
    expect(parts.every((part) => part.type !== "reasoning")).toBe(true);
  });

  it("maps reasoning events to reasoning part when enabled", () => {
    const aggregator = createAggregator(true);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_START",
      messageId: "m-reason",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "m-reason",
      delta: "Reasoning...",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_END",
      messageId: "m-reason",
    } as AgUiEvent);

    const reasoningPart = results.at(-1)?.content?.[0];
    expect(reasoningPart?.type).toBe("reasoning");
    expect((reasoningPart as any).text).toBe("Reasoning...");
  });

  it("ignores reasoning events when disabled", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "m-reason",
      delta: "hidden",
    } as AgUiEvent);

    const parts = results.at(-1)?.content ?? [];
    expect(parts.every((part) => part.type !== "reasoning")).toBe(true);
  });

  it("tracks tool call lifecycle", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "search",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_ARGS",
      toolCallId: "tool1",
      delta: '{"query":"test"}',
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool1",
      content: '"result"',
    } as AgUiEvent);

    const last = results.at(-1);
    const toolPart = last?.content?.find((part) => part.type === "tool-call");
    expect(toolPart).toBeTruthy();
    expect((toolPart as any).toolName).toBe("search");
    expect((toolPart as any).argsText).toBe('{"query":"test"}');
    expect((toolPart as any).result).toBe("result");
  });

  it("stamps mcp app metadata onto the last resolved tool call", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "show_map",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_ARGS",
      toolCallId: "tool1",
      delta: '{"city":"sf"}',
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool1",
      content: '{"ok":true}',
      role: "tool",
    } as AgUiEvent);
    aggregator.handle({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "mcp-apps",
      content: {
        result: { ok: true },
        resourceUri: "ui://srv/mcp-app.html",
        serverHash: "h",
        serverId: "s",
        toolInput: { city: "sf" },
      },
    } as AgUiEvent);

    const last = results.at(-1);
    const toolPart = last?.content?.find((part) => part.type === "tool-call");
    expect(toolPart).toBeTruthy();
    expect((toolPart as any).mcp).toEqual({
      app: { resourceUri: "ui://srv/mcp-app.html" },
    });
    expect((toolPart as any).result).toEqual({ ok: true });
  });

  it("maps each snapshot to its own tool when multiple ui tools resolve", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "show_map",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool2",
      toolCallName: "show_chart",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool1",
      content: "{}",
      role: "tool",
    } as AgUiEvent);
    aggregator.handle({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "mcp-apps",
      content: { resourceUri: "ui://srv/map.html" },
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool2",
      content: "{}",
      role: "tool",
    } as AgUiEvent);
    aggregator.handle({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "mcp-apps",
      content: { resourceUri: "ui://srv/chart.html" },
    } as AgUiEvent);

    const last = results.at(-1);
    const parts = last?.content?.filter((part) => part.type === "tool-call");
    const tool1 = parts?.find((p) => (p as any).toolCallId === "tool1");
    const tool2 = parts?.find((p) => (p as any).toolCallId === "tool2");
    expect((tool1 as any).mcp).toEqual({
      app: { resourceUri: "ui://srv/map.html" },
    });
    expect((tool2 as any).mcp).toEqual({
      app: { resourceUri: "ui://srv/chart.html" },
    });
  });

  it("ignores mcp-apps snapshots with no resolved tool call", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "show_map",
    } as AgUiEvent);
    aggregator.handle({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "mcp-apps",
      content: { resourceUri: "ui://srv/mcp-app.html" },
    } as AgUiEvent);

    const last = results.at(-1);
    const toolPart = last?.content?.find((part) => part.type === "tool-call");
    expect((toolPart as any).mcp).toBeUndefined();
  });

  it("ignores activity snapshots with a different activityType", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "show_map",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool1",
      content: "{}",
      role: "tool",
    } as AgUiEvent);
    aggregator.handle({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "custom-activity",
      content: { resourceUri: "ui://srv/mcp-app.html" },
    } as AgUiEvent);

    const last = results.at(-1);
    const toolPart = last?.content?.find((part) => part.type === "tool-call");
    expect((toolPart as any).mcp).toBeUndefined();
  });

  it("sets requires-action status when tool calls lack results at RUN_FINISHED", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "search",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_ARGS",
      toolCallId: "tool1",
      delta: '{"q":"x"}',
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AgUiEvent);

    const last = results.at(-1);
    expect(last?.status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });
  });

  it("sets complete status when all tool calls have results at RUN_FINISHED", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "search",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool1",
      content: '"done"',
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AgUiEvent);

    const last = results.at(-1);
    expect(last?.status?.type).toBe("complete");
  });

  it("respects event ordering between tool calls and text", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "search",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool1",
      content: '"result"',
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "Final answer",
    } as AgUiEvent);

    const last = results.at(-1);
    const types = (last?.content ?? []).map((part) => part.type);
    expect(types).toEqual(["tool-call", "text"]);
  });

  it("creates additional text parts for subsequent assistant messages", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_START",
      messageId: "m1",
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m1",
      delta: "First",
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_END",
      messageId: "m1",
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_START",
      messageId: "m2",
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m2",
      delta: "Second",
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AgUiEvent);

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

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({ type: "RUN_CANCELLED" } as AgUiEvent);

    const last = results.at(-1);
    expect(last?.status).toMatchObject({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("parses tool call args into an object once JSON becomes valid", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "search",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_ARGS",
      toolCallId: "tool1",
      delta: '{"query":',
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_ARGS",
      toolCallId: "tool1",
      delta: '"pizza"}',
    } as AgUiEvent);

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

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({ type: "THINKING_TEXT_MESSAGE_START" } as AgUiEvent);
    aggregator.handle({
      type: "THINKING_TEXT_MESSAGE_CONTENT",
      delta: "Reasoning first",
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "Then answer",
    } as AgUiEvent);

    const last = results.at(-1);
    const types = (last?.content ?? []).map((part) => part.type);
    expect(types[0]).toBe("reasoning");
    expect(types[1]).toBe("text");
    expect((last!.content![0] as any).text).toBe("Reasoning first");
  });

  it("marks run errors with reason and message", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({ type: "RUN_ERROR", message: "boom" } as AgUiEvent);

    const last = results.at(-1);
    expect(last?.status).toMatchObject({
      type: "incomplete",
      reason: "error",
      error: "boom",
    });
  });

  it("emits requires-action.reason: interrupt with interrupts metadata", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "need approval",
    } as AgUiEvent);
    aggregator.handle({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: {
        type: "interrupt",
        interrupts: [
          { id: "int-1", reason: "tool_call", toolCallId: "call-1" },
        ],
      },
    } as AgUiEvent);

    const last = results.at(-1);
    expect(last?.status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
    expect(last?.metadata?.custom).toMatchObject({
      agui: {
        interrupts: [
          { id: "int-1", reason: "tool_call", toolCallId: "call-1" },
        ],
      },
    });
  });

  it("treats success outcome as complete even with pending tool calls", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tool1",
      toolCallName: "search",
    } as AgUiEvent);
    aggregator.handle({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: { type: "success" },
    } as AgUiEvent);

    const last = results.at(-1);
    expect(last?.status).toMatchObject({
      type: "complete",
      reason: "unknown",
    });
  });

  it("clears interrupts metadata when a fresh run starts", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: {
        type: "interrupt",
        interrupts: [{ id: "int-1", reason: "tool_call" }],
      },
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_STARTED", runId: "r2" } as AgUiEvent);
    aggregator.handle({
      type: "RUN_FINISHED",
      runId: "r2",
      outcome: { type: "success" },
    } as AgUiEvent);

    const last = results.at(-1);
    expect(last?.status).toMatchObject({ type: "complete" });
    expect(last?.metadata?.custom).toBeUndefined();
  });

  it("parses tool call results and defaults metadata", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool1",
      content: '{"ok":true}',
      role: "tool",
    } as AgUiEvent);

    const last = results.at(-1);
    const toolPart = last?.content?.find(
      (part) => part.type === "tool-call",
    ) as any;
    expect(toolPart).toBeTruthy();
    expect(toolPart.toolName).toBe("tool");
    expect(toolPart.result).toEqual({ ok: true });
    expect(toolPart.isError).toBe(false);
  });

  it("reports the first TEXT_MESSAGE_START.messageId exactly once per run", () => {
    const onServerMessageId = vi.fn();
    const aggregator = createAggregator(false, onServerMessageId);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_START",
      messageId: "srv-1",
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "srv-1",
      delta: "hi",
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_END",
      messageId: "srv-1",
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AgUiEvent);

    expect(onServerMessageId).toHaveBeenCalledTimes(1);
    expect(onServerMessageId).toHaveBeenCalledWith("srv-1");
  });

  it("ignores subsequent server messageIds within the same run", () => {
    const onServerMessageId = vi.fn();
    const aggregator = createAggregator(false, onServerMessageId);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_START",
      messageId: "srv-1",
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_END",
      messageId: "srv-1",
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_START",
      messageId: "srv-2",
    } as AgUiEvent);

    expect(onServerMessageId).toHaveBeenCalledTimes(1);
    expect(onServerMessageId).toHaveBeenCalledWith("srv-1");
  });

  it("re-arms server messageId reporting across runs", () => {
    const onServerMessageId = vi.fn();
    const aggregator = createAggregator(false, onServerMessageId);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_START",
      messageId: "srv-1",
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AgUiEvent);
    aggregator.handle({ type: "RUN_STARTED", runId: "r2" } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_START",
      messageId: "srv-2",
    } as AgUiEvent);

    expect(onServerMessageId).toHaveBeenCalledTimes(2);
    expect(onServerMessageId.mock.calls[0]?.[0]).toBe("srv-1");
    expect(onServerMessageId.mock.calls[1]?.[0]).toBe("srv-2");
  });

  it("falls back to TEXT_MESSAGE_CONTENT.messageId when START omits it", () => {
    const onServerMessageId = vi.fn();
    const aggregator = createAggregator(false, onServerMessageId);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "srv-3",
      delta: "hi",
    } as AgUiEvent);

    expect(onServerMessageId).toHaveBeenCalledWith("srv-3");
  });

  it("reports TOOL_CALL_START.parentMessageId for tool-only runs", () => {
    const onServerMessageId = vi.fn();
    const aggregator = createAggregator(false, onServerMessageId);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tc-1",
      toolCallName: "search",
      parentMessageId: "srv-parent",
    } as AgUiEvent);

    expect(onServerMessageId).toHaveBeenCalledWith("srv-parent");
  });

  it("does not fire when no event carries a messageId", () => {
    const onServerMessageId = vi.fn();
    const aggregator = createAggregator(false, onServerMessageId);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({ type: "TEXT_MESSAGE_START" } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "hi",
    } as AgUiEvent);

    expect(onServerMessageId).not.toHaveBeenCalled();
  });

  it("surfaces TOOL_CALL_RESULT.messageId as unstable_toolMessageId", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tc-1",
      toolCallName: "lookup",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tc-1",
      messageId: "tool-msg-7",
      content: '{"ok":true}',
      role: "tool",
    } as AgUiEvent);

    const last = results.at(-1);
    const toolPart = last?.content?.find(
      (part) => part.type === "tool-call",
    ) as any;
    expect(toolPart).toMatchObject({
      toolCallId: "tc-1",
      unstable_toolMessageId: "tool-msg-7",
    });
  });

  it("emits timing metadata in message metadata", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "Hello",
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: " world",
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AgUiEvent);

    const last = results.at(-1);
    expect(last?.metadata?.timing).toBeDefined();
    expect(last?.metadata?.timing?.totalChunks).toBeGreaterThan(0);
    expect(last?.metadata?.timing?.toolCallCount).toBe(0);
  });

  it("tracks tool calls in timing metadata", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "t1",
      toolCallName: "search",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_CHUNK",
      toolCallId: "t1",
      delta: '{"q":"test"}',
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AgUiEvent);

    const last = results.at(-1);
    expect(last?.metadata?.timing).toBeDefined();
    expect(last?.metadata?.timing?.toolCallCount).toBe(1);
  });

  it("emits multiple reasoning blocks as separate parts in chronological order", () => {
    const aggregator = createAggregator(true);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);

    // First reasoning block (before any text)
    aggregator.handle({
      type: "REASONING_MESSAGE_START",
      messageId: "reason-1",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "reason-1",
      delta: "First thought",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_END",
      messageId: "reason-1",
    } as AgUiEvent);

    // Tool call in between
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tc-1",
      toolCallName: "search",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tc-1",
      content: '"found"',
    } as AgUiEvent);

    // Second reasoning block (after tool result)
    aggregator.handle({
      type: "REASONING_MESSAGE_START",
      messageId: "reason-2",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "reason-2",
      delta: "Second thought",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_END",
      messageId: "reason-2",
    } as AgUiEvent);

    // Final text
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "Answer",
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AgUiEvent);

    const last = results.at(-1);
    const parts = last?.content ?? [];
    const types = parts.map((p) => p.type);

    // Expect: reasoning, tool-call, reasoning, text
    expect(types).toEqual(["reasoning", "tool-call", "reasoning", "text"]);
    expect((parts[0] as any).text).toBe("First thought");
    expect((parts[2] as any).text).toBe("Second thought");
  });

  it("merges content into the same reasoning block when messageId is reused", () => {
    const aggregator = createAggregator(true);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_START",
      messageId: "reason-1",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "reason-1",
      delta: "Part A",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_END",
      messageId: "reason-1",
    } as AgUiEvent);
    // START again with the same messageId — should not create a second slot
    aggregator.handle({
      type: "REASONING_MESSAGE_START",
      messageId: "reason-1",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "reason-1",
      delta: " Part B",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_END",
      messageId: "reason-1",
    } as AgUiEvent);

    const last = results.at(-1);
    const reasoningParts = (last?.content ?? []).filter(
      (p) => p.type === "reasoning",
    );
    expect(reasoningParts).toHaveLength(1);
    expect((reasoningParts[0] as any).text).toBe("Part A Part B");
  });

  it("reasoning arriving after text starts a new part at its chronological position", () => {
    const aggregator = createAggregator(true);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    // Text starts before reasoning
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "Answer",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_START",
      messageId: "reason-1",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "reason-1",
      delta: "Late reasoning",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_END",
      messageId: "reason-1",
    } as AgUiEvent);

    const last = results.at(-1);
    const types = (last?.content ?? []).map((p) => p.type);
    // Arrival order is preserved: text came first, then reasoning
    expect(types[0]).toBe("text");
    expect(types[1]).toBe("reasoning");
  });

  it("resets reasoning state on RUN_STARTED so blocks from the previous run do not leak", () => {
    const aggregator = createAggregator(true);

    // First run with a reasoning block
    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_START",
      messageId: "reason-1",
    } as AgUiEvent);
    aggregator.handle({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "reason-1",
      delta: "Old thought",
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AgUiEvent);

    // Second run with no reasoning
    aggregator.handle({ type: "RUN_STARTED", runId: "r2" } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "Clean slate",
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r2" } as AgUiEvent);

    const last = results.at(-1);
    const parts = last?.content ?? [];
    expect(parts.every((p) => p.type !== "reasoning")).toBe(true);
    expect((parts.find((p) => p.type === "text") as any)?.text).toBe(
      "Clean slate",
    );
  });

  it("creates a new anonymous text part after a tool call boundary", () => {
    const aggregator = createAggregator(false);

    aggregator.handle({ type: "RUN_STARTED", runId: "r1" } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "intro",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_START",
      toolCallId: "tc-1",
      toolCallName: "search",
    } as AgUiEvent);
    aggregator.handle({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tc-1",
      content: '"result"',
    } as AgUiEvent);
    aggregator.handle({
      type: "TEXT_MESSAGE_CONTENT",
      delta: "followup",
    } as AgUiEvent);
    aggregator.handle({ type: "RUN_FINISHED", runId: "r1" } as AgUiEvent);

    const last = results.at(-1);
    const parts = last?.content ?? [];
    const types = parts.map((p) => p.type);

    expect(types).toEqual(["text", "tool-call", "text"]);
    expect((parts[0] as any).text).toBe("intro");
    expect((parts[2] as any).text).toBe("followup");
  });
});
