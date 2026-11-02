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

function createController(events: object[]) {
  const agent = new HttpAgent({
    url: "https://example.invalid",
    fetch: async () =>
      new Response(
        events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  });
  return new AgUiThreadController({
    agent,
    logger: makeLogger(),
    showThinking: false,
  });
}

const start = { type: "RUN_STARTED", threadId: "thread", runId: "run" };
const text = [
  { type: "TEXT_MESSAGE_START", messageId: "answer", role: "assistant" },
  {
    type: "TEXT_MESSAGE_CONTENT",
    messageId: "answer",
    delta: "partial answer",
  },
];

describe("AgUiThreadController HTTP stream closure", () => {
  it.each([false, true])(
    "settles a partial answer when EOF arrives without RUN_FINISHED (text ended: %s)",
    async (textEnded) => {
      const events = [
        start,
        ...text,
        ...(textEnded
          ? [{ type: "TEXT_MESSAGE_END", messageId: "answer" }]
          : []),
      ];
      const core = createController(events);

      await core.append(userMessage);

      expect(core.isRunning()).toBe(false);
      expect(core.getMessages().at(-1)).toMatchObject({
        id: "answer",
        content: [{ type: "text", text: "partial answer" }],
        status: { type: "incomplete", reason: "error" },
      });

      events.splice(
        0,
        events.length,
        start,
        { type: "TEXT_MESSAGE_START", messageId: "next", role: "assistant" },
        {
          type: "TEXT_MESSAGE_CONTENT",
          messageId: "next",
          delta: "next answer",
        },
        { type: "TEXT_MESSAGE_END", messageId: "next" },
        {
          type: "RUN_FINISHED",
          threadId: "thread",
          runId: "run",
        },
      );
      await core.append({
        ...userMessage,
        parentId: core.getMessages().at(-1)!.id,
      });
      expect(core.isRunning()).toBe(false);
      expect(core.getMessages().at(-1)).toMatchObject({
        id: "next",
        content: [{ type: "text", text: "next answer" }],
        status: { type: "complete" },
      });
    },
  );

  it("continues from authoritative snapshot text before completing", async () => {
    const core = createController([
      start,
      ...text,
      { type: "CUSTOM", name: "before", value: { retained: true } },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          { id: "answer", role: "assistant", content: "snapshot answer" },
        ],
      },
      {
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "answer",
        delta: " continued",
      },
      { type: "CUSTOM", name: "after", value: { retained: true } },
      { type: "TEXT_MESSAGE_END", messageId: "answer" },
      { type: "RUN_FINISHED", threadId: "thread", runId: "run" },
    ]);

    await core.append(userMessage);

    expect(core.getMessages().at(-1)).toMatchObject({
      id: "answer",
      content: [
        { type: "text", text: "snapshot answer continued" },
        { type: "data", name: "before", data: { retained: true } },
        { type: "data", name: "after", data: { retained: true } },
      ],
      status: { type: "complete" },
    });
  });

  it("appends text after a snapshot that precedes the text stream", async () => {
    const core = createController([
      start,
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          { id: "answer", role: "assistant", content: "snapshot answer" },
        ],
      },
      { type: "TEXT_MESSAGE_START", messageId: "answer", role: "assistant" },
      {
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "answer",
        delta: " continued",
      },
      { type: "TEXT_MESSAGE_END", messageId: "answer" },
      { type: "RUN_FINISHED", threadId: "thread", runId: "run" },
    ]);

    await core.append(userMessage);

    expect(core.getMessages().at(-1)).toMatchObject({
      id: "answer",
      content: [{ type: "text", text: "snapshot answer continued" }],
      status: { type: "complete" },
    });
  });

  it("settles a nested assistant when EOF follows a snapshot", async () => {
    const core = createController([
      start,
      ...text,
      { type: "TOOL_CALL_START", toolCallId: "task", toolCallName: "task" },
      {
        type: "SUBAGENT_STARTED",
        subagentRunId: "sub",
        name: "worker",
        parentToolCallId: "task",
      },
      {
        type: "TEXT_MESSAGE_START",
        messageId: "sub-answer",
        role: "assistant",
        subagentRunId: "sub",
      },
      {
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "sub-answer",
        delta: "working",
        subagentRunId: "sub",
      },
      { type: "TOOL_CALL_END", toolCallId: "task" },
      {
        type: "TOOL_CALL_RESULT",
        messageId: "task-result",
        toolCallId: "task",
        content: "started",
        role: "tool",
      },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          {
            id: "answer",
            role: "assistant",
            content: "snapshot answer",
            toolCalls: [
              {
                id: "task",
                type: "function",
                function: { name: "task", arguments: "{}" },
              },
            ],
          },
          {
            id: "task-result",
            role: "tool",
            toolCallId: "task",
            content: "started",
          },
        ],
      },
    ]);

    await core.append(userMessage);

    expect(core.getMessages().at(-1)).toMatchObject({
      id: "answer",
      status: { type: "incomplete", reason: "error" },
      content: [
        { type: "text", text: "snapshot answer" },
        {
          type: "tool-call",
          toolCallId: "task",
          messages: [
            {
              id: "sub",
              status: { type: "incomplete", reason: "error" },
              content: [{ type: "text", text: "working" }],
            },
          ],
        },
      ],
    });
  });

  it("settles a nested assistant when a snapshot advances past its step", async () => {
    const core = createController([
      start,
      ...text,
      { type: "TOOL_CALL_START", toolCallId: "task", toolCallName: "task" },
      {
        type: "SUBAGENT_STARTED",
        subagentRunId: "sub",
        name: "worker",
        parentToolCallId: "task",
      },
      {
        type: "TEXT_MESSAGE_START",
        messageId: "sub-answer",
        role: "assistant",
        subagentRunId: "sub",
      },
      {
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "sub-answer",
        delta: "working",
        subagentRunId: "sub",
      },
      { type: "TOOL_CALL_END", toolCallId: "task" },
      {
        type: "TOOL_CALL_RESULT",
        messageId: "task-result",
        toolCallId: "task",
        content: "started",
        role: "tool",
      },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          {
            id: "answer",
            role: "assistant",
            content: "snapshot answer",
            toolCalls: [
              {
                id: "task",
                type: "function",
                function: { name: "task", arguments: "{}" },
              },
            ],
          },
          {
            id: "task-result",
            role: "tool",
            toolCallId: "task",
            content: "started",
          },
          { id: "next", role: "assistant", content: "next step" },
        ],
      },
    ]);

    await core.append(userMessage);

    const answer = core.getMessages().find(({ id }) => id === "answer");
    expect(answer?.status?.type).toBe("complete");
    expect(answer?.content[1]).toMatchObject({
      type: "tool-call",
      toolCallId: "task",
      messages: [{ id: "sub", status: { type: "complete" } }],
    });
  });

  it("retains snapshot tool calls when later events emit before RUN_FINISHED", async () => {
    const core = createController([
      start,
      ...text,
      { type: "TEXT_MESSAGE_END", messageId: "answer" },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          {
            id: "answer",
            role: "assistant",
            content: "snapshot answer",
            toolCalls: [
              {
                id: "lookup",
                type: "function",
                function: { name: "lookup", arguments: "{}" },
              },
            ],
          },
          {
            id: "lookup-result",
            role: "tool",
            toolCallId: "lookup",
            content: "ok",
          },
        ],
      },
      { type: "CUSTOM", name: "after", value: { retained: true } },
      { type: "RUN_FINISHED", threadId: "thread", runId: "run" },
    ]);

    await core.append(userMessage);

    expect(core.getMessages().at(-1)).toMatchObject({
      id: "answer",
      content: [
        { type: "text", text: "snapshot answer" },
        { type: "tool-call", toolCallId: "lookup", result: "ok" },
        { type: "data", name: "after", data: { retained: true } },
      ],
      status: { type: "complete" },
    });
  });

  it.each(["eof", "finished", "error"])(
    "preserves snapshot content when the stream closes (%s)",
    async (terminal) => {
      const core = createController([
        start,
        ...text,
        { type: "TEXT_MESSAGE_END", messageId: "answer" },
        {
          type: "MESSAGES_SNAPSHOT",
          messages: [
            { id: "history", role: "assistant", content: "previous answer" },
            { id: "answer", role: "assistant", content: "snapshot answer" },
          ],
        },
        ...(terminal === "finished"
          ? [{ type: "RUN_FINISHED", threadId: "thread", runId: "run" }]
          : terminal === "error"
            ? [{ type: "RUN_ERROR", message: "provider failed" }]
            : []),
      ]);

      const run = core.append(userMessage);
      if (terminal === "error")
        await expect(run).rejects.toThrow("provider failed");
      else await run;

      expect(core.isRunning()).toBe(false);
      expect(core.getMessages().at(-1)).toMatchObject({
        id: "answer",
        content: [{ type: "text", text: "snapshot answer" }],
        status:
          terminal === "finished"
            ? { type: "complete" }
            : { type: "incomplete", reason: "error" },
      });
      expect(
        core.getMessages().find((message) => message.id === "history")?.status,
      ).toMatchObject({ type: "complete" });
    },
  );
});
