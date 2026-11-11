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
  it("reopens a settled snapshot-only assistant when a later snapshot adds a tool call", async () => {
    const answer = {
      id: "m1",
      role: "assistant",
      content: "Let me ask.",
    };
    const core = createController((wire) => [
      start,
      { type: "MESSAGES_SNAPSHOT", messages: [...wire.messages, answer] },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          ...wire.messages,
          {
            ...answer,
            toolCalls: [
              {
                id: "ask",
                type: "function",
                function: { name: "ask_user", arguments: "{}" },
              },
            ],
          },
        ],
      },
      finished,
    ]);

    await core.append(userMessage);

    expect(
      core.getMessages().find(({ id }) => id === "m1")?.status,
    ).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });
  });

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

const question = { id: "question", role: "user", content: "hello" };
const moveRecords = [
  question,
  { id: "answer", role: "assistant", content: "a1" },
  { id: "other", role: "assistant", content: "o" },
];
const openAnswer = [
  start,
  { type: "TEXT_MESSAGE_START", messageId: "answer", role: "assistant" },
  { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a1" },
];
const moveSnapshot = { type: "MESSAGES_SNAPSHOT", messages: moveRecords };
const answerEnd = { type: "TEXT_MESSAGE_END", messageId: "answer" };

const message = (core: AgUiThreadController, id: string) =>
  core.getMessages().find((entry) => entry.id === id);

async function sampleBetween(
  head: object[],
  tail: object[],
  sample: (core: AgUiThreadController) => unknown,
) {
  const encode = (events: object[]) =>
    new TextEncoder().encode(
      events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
    );
  let releaseTail = () => {};
  const tailReleased = new Promise<void>((resolve) => {
    releaseTail = resolve;
  });
  let headDelivered = () => {};
  const headSent = new Promise<void>((resolve) => {
    headDelivered = resolve;
  });
  const agent = new HttpAgent({
    url: "https://example.invalid",
    fetch: async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          async start(controller) {
            controller.enqueue(encode(head));
            headDelivered();
            await tailReleased;
            controller.enqueue(encode(tail));
            controller.close();
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  });
  const core = new AgUiThreadController({
    agent,
    logger: makeLogger(),
    showThinking: false,
    onError: () => {},
  });
  const run = core.append(userMessage);
  await headSent;
  for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0));
  const sampled = sample(core);
  releaseTail();
  await run;
  return { core, sampled };
}

describe("AgUiThreadController events after a snapshot moves the head", () => {
  it("appends later deltas to the answer they name (#10426)", async () => {
    const core = createController(() => [
      ...openAnswer,
      moveSnapshot,
      { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a2" },
      answerEnd,
      finished,
    ]);
    await core.append(userMessage);

    expect(message(core, "answer")).toMatchObject({
      content: [{ type: "text", text: "a1a2" }],
      status: { type: "complete" },
    });
    expect(message(core, "other")).toMatchObject({
      content: [{ type: "text", text: "o" }],
      status: { type: "complete" },
    });
  });

  it("finishes an answer whose events follow the snapshot that introduced it", async () => {
    const core = createController(() => [
      start,
      moveSnapshot,
      { type: "TEXT_MESSAGE_START", messageId: "answer", role: "assistant" },
      { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a2" },
      answerEnd,
      finished,
    ]);
    await core.append(userMessage);

    expect(
      core.getMessages().map(({ id, status }) => [id, status?.type ?? null]),
    ).toEqual([
      ["question", null],
      ["answer", "complete"],
      ["other", "complete"],
    ]);
    expect(message(core, "answer")?.content).toEqual([
      { type: "text", text: "a1a2" },
    ]);
  });

  it("keeps snapshot text on an answer that a later tool call names", async () => {
    const core = createController(() => [
      start,
      moveSnapshot,
      {
        type: "TOOL_CALL_START",
        toolCallId: "lookup",
        toolCallName: "lookup",
        parentMessageId: "answer",
      },
      { type: "TOOL_CALL_ARGS", toolCallId: "lookup", delta: "{}" },
      { type: "TOOL_CALL_END", toolCallId: "lookup" },
      {
        type: "TOOL_CALL_RESULT",
        messageId: "tool-lookup",
        toolCallId: "lookup",
        content: "found",
      },
      finished,
    ]);
    await core.append(userMessage);

    expect(message(core, "answer")).toMatchObject({
      status: { type: "complete" },
      content: [
        { type: "text", text: "a1" },
        { type: "tool-call", toolCallId: "lookup", result: "found" },
      ],
    });
  });

  it("does not continue the run for a result the snapshot delivered", async () => {
    let requests = 0;
    const agent = new HttpAgent({
      url: "https://example.invalid",
      fetch: async (_url: unknown, init: RequestInit) => {
        requests++;
        const wire = JSON.parse(init.body as string).messages ?? [];
        const events =
          requests > 1
            ? [start, finished]
            : [
                start,
                ...answerText,
                {
                  type: "TOOL_CALL_START",
                  toolCallId: "task",
                  toolCallName: "task",
                  parentMessageId: "answer",
                },
                { type: "TOOL_CALL_ARGS", toolCallId: "task", delta: "{}" },
                { type: "TOOL_CALL_END", toolCallId: "task" },
                snapshot(
                  { messages: wire },
                  {
                    id: "tool-task",
                    role: "tool",
                    toolCallId: "task",
                    content: "done",
                  },
                  otherRecord,
                ),
                finished,
              ];
        return new Response(
          events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
          { headers: { "Content-Type": "text/event-stream" } },
        );
      },
    });
    const core = new AgUiThreadController({
      agent,
      logger: makeLogger(),
      showThinking: false,
    });
    await core.append(userMessage);
    for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0));

    expect(requests).toBe(1);
    expect(statuses(core).answer).toBe("complete");
    expect(taskPartFor(core, "answer")).toMatchObject({ result: "done" });
  });

  it("settles an answer whose only open work was a sub-agent incomplete when the run errors", async () => {
    const core = createController((wire) => [
      start,
      ...answerText,
      ...taskAndSubagentEvents,
      taskResult,
      snapshot(wire, otherRecord),
      { type: "RUN_ERROR", message: "boom" },
    ]);
    await core.append(userMessage).catch(() => {});

    expect(statuses(core)).toEqual({
      answer: "incomplete",
      subagent: "incomplete",
    });
  });

  it("asks for a call only the snapshot carried on the moved-off answer", async () => {
    const core = createController((wire) => [
      start,
      ...answerText,
      snapshot(wire, otherRecord),
      { type: "TEXT_MESSAGE_START", messageId: "other", role: "assistant" },
      { type: "TEXT_MESSAGE_CONTENT", messageId: "other", delta: " More." },
      { type: "TEXT_MESSAGE_END", messageId: "other" },
      finished,
    ]);
    await core.append(userMessage);

    expect(message(core, "answer")?.status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });
    expect(core.getPendingToolCalls()).not.toBeNull();
  });

  it("keeps the answer running while its frame is open", async () => {
    const { core, sampled } = await sampleBetween(
      [...openAnswer, moveSnapshot],
      [
        { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a2" },
        answerEnd,
        finished,
      ],
      (core) => message(core, "answer")?.status,
    );

    expect(sampled).toMatchObject({ type: "running" });
    expect(message(core, "answer")).toMatchObject({
      content: [{ type: "text", text: "a1a2" }],
      status: { type: "complete" },
    });
  });

  it("reopens the answer for a tool call that names it after its frame ended", async () => {
    const lookupStart = {
      type: "TOOL_CALL_START",
      toolCallId: "lookup",
      toolCallName: "lookup",
      parentMessageId: "answer",
    };
    const lookupRest = [
      { type: "TOOL_CALL_ARGS", toolCallId: "lookup", delta: '{"q":1}' },
      { type: "TOOL_CALL_END", toolCallId: "lookup" },
      {
        type: "TOOL_CALL_RESULT",
        messageId: "tool-lookup",
        toolCallId: "lookup",
        content: "found",
      },
      finished,
    ];
    const { core, sampled } = await sampleBetween(
      [...openAnswer, moveSnapshot, answerEnd, lookupStart],
      lookupRest,
      (core) => message(core, "answer")?.status,
    );

    expect(sampled).toMatchObject({ type: "running" });
    expect(message(core, "answer")).toMatchObject({
      status: { type: "complete" },
      content: [
        { type: "text", text: "a1" },
        {
          type: "tool-call",
          toolCallId: "lookup",
          args: { q: 1 },
          result: "found",
        },
      ],
    });
    expect(message(core, "other")?.content).toEqual([
      { type: "text", text: "o" },
    ]);
  });

  it("accumulates args for a call started before the move", async () => {
    const core = createController(() => [
      ...openAnswer,
      answerEnd,
      {
        type: "TOOL_CALL_START",
        toolCallId: "lookup",
        toolCallName: "lookup",
        parentMessageId: "answer",
      },
      { type: "TOOL_CALL_ARGS", toolCallId: "lookup", delta: '{"q":' },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          question,
          {
            id: "answer",
            role: "assistant",
            content: "a1",
            toolCalls: [
              {
                id: "lookup",
                type: "function",
                function: { name: "lookup", arguments: '{"q":' },
              },
            ],
          },
          { id: "other", role: "assistant", content: "o" },
        ],
      },
      { type: "TOOL_CALL_ARGS", toolCallId: "lookup", delta: '"x"}' },
      { type: "TOOL_CALL_END", toolCallId: "lookup" },
      {
        type: "TOOL_CALL_RESULT",
        messageId: "tool-lookup",
        toolCallId: "lookup",
        content: "found",
      },
      finished,
    ]);
    await core.append(userMessage);

    expect(taskPartFor(core, "answer")).toBeUndefined();
    expect(
      message(core, "answer")?.content.find(
        (part) => part.type === "tool-call",
      ),
    ).toMatchObject({
      toolCallId: "lookup",
      argsText: '{"q":"x"}',
      args: { q: "x" },
      result: "found",
    });
    expect(message(core, "answer")?.status?.type).toBe("complete");
  });

  it.each([
    {
      name: "finish",
      terminal: {
        type: "SUBAGENT_FINISHED",
        subagentRunId: "sub",
        result: "worker result",
      },
      status: { type: "complete", reason: "unknown" },
      metadata: { result: "worker result" },
    },
    {
      name: "error",
      terminal: {
        type: "SUBAGENT_ERROR",
        subagentRunId: "sub",
        message: "worker failed",
        code: "WORKER_FAILED",
      },
      status: {
        type: "incomplete",
        reason: "error",
        error: "worker failed",
      },
      metadata: { errorCode: "WORKER_FAILED" },
    },
  ])(
    "keeps late sub-agent text and $name nested under its call (#10404)",
    async ({ terminal, status, metadata }) => {
      const core = createController((wire) => [
        start,
        ...answerText,
        ...taskAndSubagentEvents,
        snapshot(wire, otherRecord),
        {
          type: "TEXT_MESSAGE_START",
          messageId: "s2",
          role: "assistant",
          subagentRunId: "sub",
        },
        {
          type: "TEXT_MESSAGE_CONTENT",
          messageId: "s2",
          delta: " still working",
          subagentRunId: "sub",
        },
        { type: "TEXT_MESSAGE_END", messageId: "s2", subagentRunId: "sub" },
        terminal,
        taskResult,
        finished,
      ]);
      await core.append(userMessage);

      expect(taskPartFor(core, "answer")).toMatchObject({
        result: "done",
        messages: [
          {
            id: "sub",
            content: [
              { type: "text", text: "working" },
              { type: "text", text: " still working" },
            ],
            status,
            metadata: { custom: { agui: metadata } },
          },
        ],
      });
      expect(statuses(core)).toEqual({
        answer: "complete",
        subagent: status.type,
      });
      expect(message(core, "other")?.content).toEqual([
        { type: "text", text: "Next step." },
      ]);
    },
  );

  it("settles a held answer incomplete when the run errors", async () => {
    const core = createController(() => [
      ...openAnswer,
      moveSnapshot,
      { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a2" },
      { type: "RUN_ERROR", message: "boom" },
    ]);
    await core.append(userMessage).catch(() => {});

    expect(message(core, "answer")).toMatchObject({
      content: [{ type: "text", text: "a1a2" }],
      status: { type: "incomplete", reason: "error" },
    });
  });

  it("asks for the result of a call left open on the answer when the run finishes", async () => {
    const core = createController(() => [
      ...openAnswer,
      moveSnapshot,
      answerEnd,
      {
        type: "TOOL_CALL_START",
        toolCallId: "ask",
        toolCallName: "ask",
        parentMessageId: "answer",
      },
      { type: "TOOL_CALL_ARGS", toolCallId: "ask", delta: "{}" },
      { type: "TOOL_CALL_END", toolCallId: "ask" },
      finished,
    ]);
    await core.append(userMessage);

    expect(message(core, "answer")?.status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });
    expect(message(core, "other")?.status?.type).toBe("complete");
  });

  it("keeps a held answer running across a repeated snapshot", async () => {
    const { core, sampled } = await sampleBetween(
      [
        start,
        ...answerText,
        ...taskCallEvents,
        snapshot({ messages: [question] }, otherRecord),
        snapshot({ messages: [question] }, otherRecord),
      ],
      [taskResult, finished],
      (core) => message(core, "answer")?.status,
    );

    expect(sampled).toMatchObject({ type: "running" });
    expect(message(core, "answer")?.status?.type).toBe("complete");
  });

  it("control: concat-content keeps streaming into one message", async () => {
    const agent = new HttpAgent({
      url: "https://example.invalid",
      fetch: async () =>
        new Response(
          [
            ...openAnswer,
            moveSnapshot,
            { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a2" },
            answerEnd,
            finished,
          ]
            .map((event) => `data: ${JSON.stringify(event)}\n\n`)
            .join(""),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
    });
    const core = new AgUiThreadController({
      agent,
      logger: makeLogger(),
      showThinking: false,
      joinStrategy: "concat-content",
    });
    await core.append(userMessage);

    const assistants = core
      .getMessages()
      .filter((entry) => entry.role === "assistant");
    expect(assistants).toHaveLength(1);
    expect(assistants[0]?.status?.type).toBe("complete");
  });
});
