import { describe, expect, it, vi } from "vitest";
import type { ChatModelRunResult } from "@assistant-ui/core";
import type { JoinStrategy } from "@assistant-ui/core/react";
import { RunAggregator, type RetainedMessageState } from "./run-aggregator";
import type { AgUiEvent } from "../types";

const setup = (joinStrategy?: JoinStrategy) => {
  const current: ChatModelRunResult[] = [];
  const retained: {
    update: ChatModelRunResult;
    state: RetainedMessageState;
  }[] = [];
  const aggregator = new RunAggregator({
    showThinking: true,
    joinStrategy,
    logger: { debug: vi.fn(), error: vi.fn() },
    emit: (update) => current.push(update),
    onRetainedMessage: (update, state) => retained.push({ update, state }),
    onTextMessageStart: () => {},
  });
  const send = (...events: AgUiEvent[]) => {
    for (const event of events) aggregator.handle(event);
  };
  send(
    { type: "RUN_STARTED", runId: "run" },
    { type: "TEXT_MESSAGE_START", messageId: "answer" },
    { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a1" },
    {
      type: "TOOL_CALL_START",
      toolCallId: "task",
      toolCallName: "task",
      parentMessageId: "answer",
    },
    {
      type: "SUBAGENT_STARTED",
      subagentRunId: "sub",
      name: "worker",
      parentToolCallId: "task",
    },
  );
  aggregator.rebaseMessage("other", "answer");
  aggregator.announceRetained();
  const lastRetained = () => retained.at(-1);
  const lastCurrent = () => current.at(-1)?.content ?? [];
  const retainedTask = () =>
    lastRetained()?.update.content?.find(
      (part) => part.type === "tool-call" && part.toolCallId === "task",
    );
  return {
    aggregator,
    send,
    current,
    retained,
    lastRetained,
    lastCurrent,
    retainedTask,
  };
};

describe("RunAggregator routing after the current message moves", () => {
  it("announces the moved-off message once with what is still open", () => {
    const { aggregator, retained } = setup();
    aggregator.announceRetained();

    expect(retained).toHaveLength(1);
    expect(retained[0]?.state).toEqual({
      messageId: "answer",
      streaming: true,
      openToolCallIds: ["task"],
    });
    expect(aggregator.isRetained("answer")).toBe(true);
    expect(aggregator.hasToolCall("task")).toBe(true);
  });

  it("routes root text naming the moved-off message to it", () => {
    const { send, lastRetained, current } = setup();
    const emitted = current.length;
    send({ type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a2" });

    expect(lastRetained()?.update.content?.[0]).toEqual({
      type: "text",
      text: "a1a2",
    });
    expect(current).toHaveLength(emitted);
  });

  it("closes the text frame on TEXT_MESSAGE_END", () => {
    const { send, lastRetained } = setup();
    send({ type: "TEXT_MESSAGE_END", messageId: "answer" });

    expect(lastRetained()?.state.streaming).toBe(true);
    send(
      { type: "SUBAGENT_FINISHED", subagentRunId: "sub" },
      {
        type: "TOOL_CALL_RESULT",
        messageId: "tool",
        toolCallId: "task",
        content: "done",
      },
    );
    expect(lastRetained()?.state).toEqual({
      messageId: "answer",
      streaming: false,
      openToolCallIds: [],
    });
  });

  it("routes TOOL_CALL_START by parentMessageId, and to the current message without one", () => {
    const { send, lastRetained, lastCurrent } = setup();
    send(
      {
        type: "TOOL_CALL_START",
        toolCallId: "late",
        toolCallName: "late",
        parentMessageId: "answer",
      },
      { type: "TOOL_CALL_START", toolCallId: "next", toolCallName: "next" },
    );

    expect(lastRetained()?.state.openToolCallIds).toEqual(["task", "late"]);
    expect(
      lastCurrent().filter((part) => part.type === "tool-call"),
    ).toMatchObject([{ toolCallId: "next" }]);
  });

  it("routes TOOL_CALL_ARGS, END, and RESULT by the call they name", () => {
    const { send, retainedTask, current } = setup();
    const emitted = current.length;
    send(
      { type: "TOOL_CALL_ARGS", toolCallId: "task", delta: '{"q":1}' },
      { type: "TOOL_CALL_END", toolCallId: "task" },
      {
        type: "TOOL_CALL_RESULT",
        messageId: "tool",
        toolCallId: "task",
        content: "done",
      },
    );

    expect(retainedTask()).toMatchObject({ args: { q: 1 }, result: "done" });
    expect(current).toHaveLength(emitted);
  });

  it("routes sub-agent events by run id and nests a new run under its call", () => {
    const { send, retainedTask, current } = setup();
    const emitted = current.length;
    send(
      {
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "s1",
        delta: "working",
        subagentRunId: "sub",
      },
      {
        type: "SUBAGENT_STARTED",
        subagentRunId: "sub2",
        name: "helper",
        parentToolCallId: "task",
      },
      { type: "SUBAGENT_ERROR", subagentRunId: "sub2", message: "boom" },
      { type: "SUBAGENT_FINISHED", subagentRunId: "sub" },
    );

    const task = retainedTask();
    expect(task?.type === "tool-call" && task.messages).toMatchObject([
      {
        id: "sub",
        status: { type: "complete" },
        content: [{ type: "text", text: "working" }],
      },
      { id: "sub2", status: { type: "incomplete", reason: "error" } },
    ]);
    expect(current).toHaveLength(emitted);
  });

  it("routes an MCP app snapshot by its tool call", () => {
    const { send, retainedTask } = setup();
    send({
      type: "ACTIVITY_SNAPSHOT",
      messageId: "act",
      activityType: "mcp-apps",
      content: { toolCallId: "task", resourceUri: "ui://app/view" },
    } as AgUiEvent);

    expect(retainedTask()).toMatchObject({
      mcp: { app: { resourceUri: "ui://app/view" } },
    });
  });

  it("routes reasoning and activity deltas to the message that holds them", () => {
    const { aggregator, send, lastRetained, current } = setup();
    aggregator.rebaseMessage("answer", "other");
    send(
      { type: "REASONING_MESSAGE_START", messageId: "r" },
      { type: "REASONING_MESSAGE_CONTENT", messageId: "r", delta: "think" },
      {
        type: "ACTIVITY_SNAPSHOT",
        messageId: "act",
        activityType: "progress",
        content: { step: 1 },
      } as AgUiEvent,
    );
    aggregator.rebaseMessage("other", "answer");
    const emitted = current.length;
    send({ type: "REASONING_MESSAGE_CONTENT", messageId: "r", delta: "ing" }, {
      type: "ACTIVITY_DELTA",
      messageId: "act",
      activityType: "progress",
      patch: [{ op: "replace", path: "/step", value: 2 }],
    } as AgUiEvent);

    expect(current).toHaveLength(emitted);
    expect(lastRetained()?.update.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "reasoning", text: "thinking" }),
        expect.objectContaining({ type: "data", data: { step: 2 } }),
      ]),
    );
  });

  it("replaces an activity snapshot on the message that holds it", () => {
    const { aggregator, send, lastRetained, current } = setup();
    aggregator.rebaseMessage("answer", "other");
    send({
      type: "ACTIVITY_SNAPSHOT",
      messageId: "act",
      activityType: "progress",
      content: { step: 1 },
    } as AgUiEvent);
    aggregator.rebaseMessage("other", "answer");
    const emitted = current.length;
    send({
      type: "ACTIVITY_SNAPSHOT",
      messageId: "act",
      activityType: "progress",
      content: { step: 2 },
    } as AgUiEvent);

    expect(
      lastRetained()?.update.content?.filter((part) => part.type === "data"),
    ).toEqual([expect.objectContaining({ data: { step: 2 } })]);
    expect(current).toHaveLength(emitted);
  });

  it("keeps parsing args a snapshot started", () => {
    const { send, retainedTask } = setup();
    send(
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          {
            id: "answer",
            role: "assistant",
            content: "a1",
            toolCalls: [
              {
                id: "task",
                type: "function",
                function: { name: "task", arguments: '{"q":' },
              },
            ],
          },
        ],
      },
      { type: "TOOL_CALL_ARGS", toolCallId: "task", delta: '"x"}' },
    );

    expect(retainedTask()).toMatchObject({
      argsText: '{"q":"x"}',
      args: { q: "x" },
    });
  });

  it("keeps root reasoning and custom events on the current message", () => {
    const { send, lastCurrent, retained } = setup();
    const announced = retained.length;
    send(
      { type: "REASONING_MESSAGE_START", messageId: "r" },
      { type: "REASONING_MESSAGE_CONTENT", messageId: "r", delta: "hmm" },
      { type: "CUSTOM", name: "note", value: 1 },
    );

    expect(lastCurrent().map((part) => part.type)).toEqual([
      "reasoning",
      "data",
    ]);
    expect(retained).toHaveLength(announced);
  });

  it("applies MESSAGES_SNAPSHOT text and args to every message", () => {
    const { send, retainedTask, lastRetained } = setup();
    send(
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          {
            id: "answer",
            role: "assistant",
            content: "a1 fixed",
            toolCalls: [
              {
                id: "task",
                type: "function",
                function: { name: "task", arguments: '{"q":2}' },
              },
            ],
          },
        ],
      },
      { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "!" },
    );

    expect(lastRetained()?.update.content?.[0]).toEqual({
      type: "text",
      text: "a1 fixed!",
    });
    expect(retainedTask()).toMatchObject({ argsText: '{"q":2}' });
  });

  it("settles running sub-agents on moved-off messages before the current emit", () => {
    const { send, retained, current, retainedTask } = setup();
    send({ type: "RUN_ERROR", message: "boom" });

    const task = retainedTask();
    expect(task?.type === "tool-call" && task.messages?.[0]?.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: "boom",
    });
    expect(retained.at(-1)?.update.status).toBeUndefined();
    expect(current.at(-1)?.status).toMatchObject({ type: "incomplete" });
  });

  it("resumes a moved-off message that becomes current again", () => {
    const { aggregator, send, lastCurrent } = setup();
    aggregator.rebaseMessage("answer", "other");
    send({ type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a2" });

    expect(lastCurrent()[0]).toEqual({ type: "text", text: "a1a2" });
    expect(aggregator.isRetained("other")).toBe(true);
  });

  it("forgets moved-off messages when a new run starts", () => {
    const { aggregator, send } = setup();
    send({ type: "RUN_STARTED", runId: "next" });

    expect(aggregator.isRetained("answer")).toBe(false);
    expect(aggregator.hasToolCall("task")).toBe(false);
  });

  it("control: concat-content routes everything to the current message", () => {
    const { send, lastCurrent, retained } = setup("concat-content");
    const announced = retained.length;
    send({ type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a2" });

    expect(retained).toHaveLength(announced);
    expect(lastCurrent()).toContainEqual({ type: "text", text: "a2" });
  });
});
