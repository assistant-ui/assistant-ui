import { describe, expect, it } from "vitest";
import { HttpAgent } from "@ag-ui/client";
import type { AppendMessage } from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import { makeLogger } from "./logger";

const userMessage: AppendMessage = {
  role: "user",
  content: [{ type: "text", text: "hello" }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(0),
  parentId: null,
  sourceId: null,
  runConfig: {},
  startRun: true,
};

type Wire = { messages: unknown[] };

function createController(events: (wire: Wire) => object[]) {
  const agent = new HttpAgent({
    url: "https://example.invalid",
    fetch: async (_url: unknown, init: RequestInit) => {
      const wire = { messages: JSON.parse(init.body as string).messages ?? [] };
      return new Response(
        events(wire)
          .map((event) => `data: ${JSON.stringify(event)}\n\n`)
          .join(""),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
  });
  return new AgUiThreadController({
    agent,
    logger: makeLogger(),
    showThinking: false,
    onError: () => {},
  });
}

const start = { type: "RUN_STARTED", threadId: "thread", runId: "run" };
const answerText = [
  { type: "TEXT_MESSAGE_START", messageId: "answer", role: "assistant" },
  { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "Let me check." },
  { type: "TEXT_MESSAGE_END", messageId: "answer" },
];
const answerRecord = {
  id: "answer",
  role: "assistant",
  content: "Let me check.",
  toolCalls: [
    {
      id: "task",
      type: "function",
      function: { name: "task", arguments: "{}" },
    },
  ],
};
const otherRecord = { id: "other", role: "assistant", content: "Next step." };
const taskCallEvents = [
  { type: "TOOL_CALL_START", toolCallId: "task", toolCallName: "task" },
  { type: "TOOL_CALL_END", toolCallId: "task" },
];
const taskAndSubagentEvents = [
  ...taskCallEvents,
  {
    type: "SUBAGENT_STARTED",
    subagentRunId: "sub",
    name: "worker",
    parentToolCallId: "task",
  },
  {
    type: "TEXT_MESSAGE_START",
    messageId: "s1",
    role: "assistant",
    subagentRunId: "sub",
  },
  {
    type: "TEXT_MESSAGE_CONTENT",
    messageId: "s1",
    delta: "working",
    subagentRunId: "sub",
  },
  { type: "TEXT_MESSAGE_END", messageId: "s1", subagentRunId: "sub" },
];
const subFinished = { type: "SUBAGENT_FINISHED", subagentRunId: "sub" };
const taskResult = {
  type: "TOOL_CALL_RESULT",
  messageId: "tool-task",
  toolCallId: "task",
  content: "done",
};
const finished = { type: "RUN_FINISHED", threadId: "thread", runId: "run" };
const snapshot = (wire: Wire, ...rest: object[]) => ({
  type: "MESSAGES_SNAPSHOT",
  messages: [...wire.messages, answerRecord, ...rest],
});

function statuses(core: AgUiThreadController) {
  const answer = core.getMessages().find(({ id }) => id === "answer")!;
  const toolCall = answer.content.find(
    (part) => part.type === "tool-call" && part.toolCallId === "task",
  );
  const nested =
    toolCall?.type === "tool-call"
      ? toolCall.messages?.find((message) => message.id === "sub")
      : undefined;
  return { answer: answer.status?.type, subagent: nested?.status?.type };
}

function taskPartFor(core: AgUiThreadController, messageId: string) {
  const message = core.getMessages().find(({ id }) => id === messageId);
  if (message?.role !== "assistant") return undefined;
  return message.content.find(
    (part) => part.type === "tool-call" && part.toolCallId === "task",
  );
}

describe("AgUiThreadController snapshot head moves", () => {
  it("settles the moved-off answer when the snapshot has no tool call", async () => {
    const core = createController((wire) => [
      start,
      ...answerText,
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          ...wire.messages,
          { id: "answer", role: "assistant", content: "Let me check." },
          otherRecord,
        ],
      },
      finished,
    ]);
    await core.append(userMessage);
    expect(statuses(core).answer).toBe("complete");
  });

  it("settles the moved-off answer and sub-agent after the tool result", async () => {
    const core = createController((wire) => [
      start,
      ...answerText,
      ...taskAndSubagentEvents,
      snapshot(wire, otherRecord),
      subFinished,
      taskResult,
      finished,
    ]);
    await core.append(userMessage);
    expect(core.isRunning()).toBe(false);
    expect(statuses(core)).toEqual({
      answer: "complete",
      subagent: "complete",
    });
  });

  it("keeps a moved-off answer settled and owns the result after repeated snapshots", async () => {
    const core = createController((wire) => [
      start,
      ...answerText,
      ...taskCallEvents,
      snapshot(wire, otherRecord),
      snapshot(wire, otherRecord),
      taskResult,
      finished,
    ]);
    await core.append(userMessage);

    expect(core.isRunning()).toBe(false);
    expect(statuses(core).answer).toBe("complete");
    expect(
      core.getMessages().find(({ id }) => id === "other")?.status?.type,
    ).toBe("complete");
    expect(taskPartFor(core, "answer")).toMatchObject({ result: "done" });
    expect(taskPartFor(core, "other")).toBeUndefined();
    expect(
      core.getMessages().find(({ id }) => id === "answer")?.content,
    ).toEqual([
      { type: "text", text: "Let me check." },
      {
        type: "tool-call",
        toolCallId: "task",
        toolName: "task",
        args: {},
        argsText: "{}",
        result: "done",
        unstable_toolMessageId: "tool-task",
      },
    ]);
    expect(
      core.getMessages().find(({ id }) => id === "other")?.content,
    ).toEqual([{ type: "text", text: "Next step." }]);
  });

  it("preserves full content and settled statuses with a sub-agent after repeated snapshots", async () => {
    const core = createController((wire) => [
      start,
      ...answerText,
      ...taskAndSubagentEvents,
      snapshot(wire, otherRecord),
      snapshot(wire, otherRecord),
      subFinished,
      taskResult,
      finished,
    ]);
    await core.append(userMessage);

    expect(core.isRunning()).toBe(false);
    expect(statuses(core)).toEqual({
      answer: "complete",
      subagent: "complete",
    });
    expect(
      core.getMessages().find(({ id }) => id === "other")?.status?.type,
    ).toBe("complete");
    expect(
      core.getMessages().find(({ id }) => id === "answer")?.content,
    ).toEqual([
      { type: "text", text: "Let me check." },
      {
        type: "tool-call",
        toolCallId: "task",
        toolName: "task",
        args: {},
        argsText: "{}",
        result: "done",
        unstable_toolMessageId: "tool-task",
        messages: [
          expect.objectContaining({
            id: "sub",
            role: "assistant",
            status: { type: "complete", reason: "unknown" },
            content: [{ type: "text", text: "working" }],
          }),
        ],
      },
    ]);
    expect(
      core.getMessages().find(({ id }) => id === "other")?.content,
    ).toEqual([{ type: "text", text: "Next step." }]);
  });

  it.each([false, true])(
    "preserves current text when the moved result arrives during streaming: %s",
    async (duringStreaming) => {
      const core = createController((wire) => [
        start,
        ...answerText,
        ...taskCallEvents,
        snapshot(wire, otherRecord),
        snapshot(wire, otherRecord),
        ...(!duringStreaming ? [taskResult] : []),
        { type: "TEXT_MESSAGE_START", messageId: "other", role: "assistant" },
        { type: "TEXT_MESSAGE_CONTENT", messageId: "other", delta: " Before." },
        ...(duringStreaming ? [taskResult] : []),
        { type: "TEXT_MESSAGE_CONTENT", messageId: "other", delta: " After." },
        { type: "TEXT_MESSAGE_END", messageId: "other" },
        finished,
      ]);
      await core.append(userMessage);

      expect(core.isRunning()).toBe(false);
      expect(statuses(core).answer).toBe("complete");
      expect(
        core.getMessages().find(({ id }) => id === "answer")?.content,
      ).toEqual([
        { type: "text", text: "Let me check." },
        {
          type: "tool-call",
          toolCallId: "task",
          toolName: "task",
          args: {},
          argsText: "{}",
          result: "done",
          unstable_toolMessageId: "tool-task",
        },
      ]);
      expect(core.getMessages().find(({ id }) => id === "other")).toMatchObject(
        {
          status: { type: "complete" },
          content: [{ type: "text", text: "Next step. Before. After." }],
        },
      );
    },
  );

  it("does not show a complete answer with a running sub-agent after a result snapshot", async () => {
    const core = createController((wire) => [
      start,
      ...answerText,
      ...taskAndSubagentEvents,
      snapshot(wire, otherRecord),
      subFinished,
      taskResult,
      snapshot(
        wire,
        { id: "tool-task", role: "tool", toolCallId: "task", content: "done" },
        otherRecord,
      ),
      finished,
    ]);
    await core.append(userMessage);
    expect(statuses(core)).toEqual({
      answer: "complete",
      subagent: "complete",
    });
  });
});
