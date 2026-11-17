import { describe, expect, it, vi } from "vitest";
import type { AbstractAgent } from "@ag-ui/client";
import type { AppendMessage } from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import { makeLogger } from "./logger";

type Subscriber = Record<
  string,
  ((payload: { event: unknown }) => void) | undefined
>;

type Event = Record<string, unknown>;

const emit = (subscriber: Subscriber, event: Event) => {
  const handlerName = `on${String(event.type)
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join("")}Event`;
  subscriber[handlerName]?.({ event });
};

const sendText = (subscriber: Subscriber, messageId: string, text: string) => {
  emit(subscriber, {
    type: "TEXT_MESSAGE_START",
    messageId,
    role: "assistant",
  });
  emit(subscriber, {
    type: "TEXT_MESSAGE_CONTENT",
    messageId,
    delta: text,
  });
  emit(subscriber, { type: "TEXT_MESSAGE_END", messageId });
};

const userMessage = (text: string) =>
  ({
    parentId: null,
    role: "user",
    content: [{ type: "text", text }],
    startRun: true,
  }) as unknown as AppendMessage;

const createCore = (runAgent: AbstractAgent["runAgent"]) =>
  new AgUiThreadController({
    agent: { runAgent, abortRun: vi.fn() } as unknown as AbstractAgent,
    logger: makeLogger(),
    showThinking: true,
  });

const call = (id: string, name: string) => ({
  id,
  type: "function",
  function: { name, arguments: "{}" },
});

describe("AgUiThreadController sequential runs in one response", () => {
  it("completes the answer after the second RUN_FINISHED", async () => {
    let core: AgUiThreadController;
    let secondStartStatus: string | undefined;
    const runAgent = vi.fn(async (_input: unknown, subscriber: Subscriber) => {
      emit(subscriber, { type: "RUN_STARTED", runId: "first" });
      sendText(subscriber, "first-answer", "first answer");
      emit(subscriber, { type: "RUN_FINISHED", runId: "first" });
      emit(subscriber, { type: "RUN_STARTED", runId: "second" });
      secondStartStatus = core
        .getMessages()
        .filter((m) => m.role === "assistant")
        .at(-1)?.status?.type;
      sendText(subscriber, "second-answer", "second answer");
      emit(subscriber, { type: "RUN_FINISHED", runId: "second" });
    });
    core = createCore(runAgent as unknown as AbstractAgent["runAgent"]);

    await core.append(userMessage("question"));

    const assistant = core
      .getMessages()
      .filter((m) => m.role === "assistant")
      .at(-1);
    expect(secondStartStatus).toBe("running");
    expect(assistant?.status?.type).toBe("complete");
    expect(
      assistant?.content.some(
        (part) => part.type === "text" && part.text.includes("second answer"),
      ),
    ).toBe(true);
  });

  it("settles a second-run subagent call when the response closes", async () => {
    const runAgent = vi.fn(
      async (input: { messages: unknown[] }, subscriber: Subscriber) => {
        emit(subscriber, { type: "RUN_STARTED", runId: "first" });
        sendText(subscriber, "answer", "first answer");
        emit(subscriber, { type: "RUN_FINISHED", runId: "first" });
        emit(subscriber, { type: "RUN_STARTED", runId: "second" });
        emit(subscriber, {
          type: "TOOL_CALL_START",
          toolCallId: "task",
          toolCallName: "task",
          parentMessageId: "answer",
        });
        emit(subscriber, { type: "TOOL_CALL_END", toolCallId: "task" });
        emit(subscriber, {
          type: "SUBAGENT_STARTED",
          subagentRunId: "subagent",
          name: "worker",
          parentToolCallId: "task",
        });
        emit(subscriber, {
          type: "TOOL_CALL_START",
          toolCallId: "nested-call",
          toolCallName: "search",
          subagentRunId: "subagent",
        });
        emit(subscriber, {
          type: "TOOL_CALL_END",
          toolCallId: "nested-call",
          subagentRunId: "subagent",
        });
        emit(subscriber, {
          type: "SUBAGENT_FINISHED",
          subagentRunId: "subagent",
        });
        emit(subscriber, {
          type: "MESSAGES_SNAPSHOT",
          messages: [
            ...input.messages,
            {
              id: "answer",
              role: "assistant",
              content: "second answer",
              toolCalls: [call("task", "task")],
            },
            {
              id: "subagent-message",
              role: "assistant",
              content: "",
              subagentRunId: "subagent",
              toolCalls: [call("nested-call", "search")],
            },
            {
              id: "task-result",
              role: "tool",
              toolCallId: "task",
              content: '"done"',
            },
          ],
        });
      },
    );
    const core = createCore(runAgent as unknown as AbstractAgent["runAgent"]);

    await core.append(userMessage("question"));

    const answer = core.getMessages().find((m) => m.id === "answer");
    const task =
      answer?.role === "assistant"
        ? answer.content.find(
            (part) => part.type === "tool-call" && part.toolCallId === "task",
          )
        : undefined;
    const subagent =
      task?.type === "tool-call"
        ? task.messages?.find((message) => message.id === "subagent")
        : undefined;

    expect(subagent?.status, JSON.stringify(core.getMessages())).toMatchObject({
      type: "incomplete",
      reason: "error",
    });
  });
});
