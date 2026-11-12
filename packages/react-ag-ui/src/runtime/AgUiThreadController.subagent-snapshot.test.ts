import { describe, expect, it, vi } from "vitest";
import type { AbstractAgent } from "@ag-ui/client";
import type { AppendMessage, ThreadMessage } from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import type { UseAgUiRuntimeOptions } from "./types";
import { makeLogger } from "./logger";

type Subscriber = Record<
  string,
  ((payload: { event: unknown }) => void) | undefined
>;
type Event = Record<string, unknown>;

const handlerName = (type: string) =>
  `on${type
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join("")}Event`;

async function run(
  events: readonly Event[],
  joinStrategy?: UseAgUiRuntimeOptions["joinStrategy"],
) {
  let pending = events;
  const agent = {
    runAgent: vi.fn(
      async (input: { runId: string }, subscriber: Subscriber) => {
        const body = pending;
        pending = [];
        for (const event of [
          { type: "RUN_STARTED", runId: input.runId },
          ...body,
          { type: "RUN_FINISHED", runId: input.runId },
        ]) {
          subscriber[handlerName(event.type as string)]?.({ event });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      },
    ),
    abortRun: vi.fn(),
  } as unknown as AbstractAgent;
  const core = new AgUiThreadController({
    agent,
    logger: makeLogger(),
    showThinking: true,
    ...(joinStrategy ? { joinStrategy } : {}),
  });
  await core.append({
    parentId: null,
    role: "user",
    content: [{ type: "text", text: "u" }],
    startRun: true,
  } as unknown as AppendMessage);
  return core;
}

const rootIds = (core: AgUiThreadController) =>
  core
    .getMessages()
    .filter((message) => message.role === "assistant")
    .map((message) => message.id);

const nestedUnder = (core: AgUiThreadController, toolCallId: string) =>
  core
    .getMessages()
    .flatMap((message) => (message.role === "assistant" ? message.content : []))
    .flatMap((part) =>
      part.type === "tool-call" && part.toolCallId === toolCallId
        ? (part.messages ?? [])
        : [],
    );

const contentOf = (messages: readonly ThreadMessage[]) =>
  messages.flatMap((message) =>
    message.role === "assistant" ? message.content : [],
  );

const call = (id: string, name = "research") => ({
  id,
  type: "function",
  function: { name, arguments: "{}" },
});

const spawn = (toolCallId: string): Event[] => [
  {
    type: "TOOL_CALL_START",
    toolCallId,
    toolCallName: "research",
    parentMessageId: "a",
  },
  { type: "TOOL_CALL_END", toolCallId },
];

const subagentText = (runId: string, messageId: string, text: string) => [
  { type: "TEXT_MESSAGE_START", messageId, subagentRunId: runId },
  {
    type: "TEXT_MESSAGE_CONTENT",
    messageId,
    delta: text,
    subagentRunId: runId,
  },
  { type: "TEXT_MESSAGE_END", messageId, subagentRunId: runId },
];

const snapshot = (runId: string, spawnId: string) => ({
  type: "MESSAGES_SNAPSHOT",
  messages: [
    { id: "u", role: "user", content: "u" },
    { id: "a", role: "assistant", content: "", toolCalls: [call(spawnId)] },
    {
      id: "sub-text",
      role: "assistant",
      content: "Paris is sunny.",
      subagentRunId: runId,
    },
    { id: "t", role: "tool", toolCallId: spawnId, content: '"done"' },
  ],
});

describe("AgUiThreadController subagent messages in snapshots", () => {
  it("keeps a run at root when its first start has no parent", async () => {
    const core = await run([
      ...spawn("spawn-1"),
      { type: "SUBAGENT_STARTED", subagentRunId: "run-1", name: "researcher" },
      ...subagentText("run-1", "s1", "First."),
      {
        type: "SUBAGENT_STARTED",
        subagentRunId: "run-1",
        parentToolCallId: "spawn-1",
        name: "researcher",
      },
      snapshot("run-1", "spawn-1"),
      ...subagentText("run-1", "s2", "Second."),
    ]);
    expect(nestedUnder(core, "spawn-1")).toHaveLength(0);
    expect(rootIds(core)).toContain("sub-text");
  });

  it("reopens a completed nested message when a snapshot adds an interrupt", async () => {
    const core = await run([
      ...spawn("spawn-1"),
      {
        type: "SUBAGENT_STARTED",
        subagentRunId: "run-1",
        parentToolCallId: "spawn-1",
        name: "researcher",
      },
      ...subagentText("run-1", "s1", "Done."),
      { type: "SUBAGENT_FINISHED", subagentRunId: "run-1" },
      {
        type: "TOOL_CALL_RESULT",
        toolCallId: "spawn-1",
        messageId: "t",
        content: '"done"',
      },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          {
            id: "a",
            role: "assistant",
            content: "",
            toolCalls: [call("spawn-1")],
          },
          {
            id: "s1",
            role: "assistant",
            content: "Done.",
            subagentRunId: "run-1",
            metadata: {
              custom: {
                agui: { interrupts: [{ id: "int", reason: "approval" }] },
              },
            },
          },
          { id: "t", role: "tool", toolCallId: "spawn-1", content: '"done"' },
        ],
      },
    ]);
    expect(nestedUnder(core, "spawn-1")[0]?.status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
  });
  it("settles a snapshot nested wait when its frontend result arrives", async () => {
    const core = await run([
      ...spawn("spawn-1"),
      {
        type: "SUBAGENT_STARTED",
        subagentRunId: "run-1",
        parentToolCallId: "spawn-1",
        name: "researcher",
      },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          {
            id: "a",
            role: "assistant",
            content: "",
            toolCalls: [call("spawn-1")],
          },
          { id: "t", role: "tool", toolCallId: "spawn-1", content: '"ok"' },
          {
            id: "s",
            role: "assistant",
            content: "",
            toolCalls: [call("inner")],
            subagentRunId: "run-1",
          },
        ],
      },
    ]);
    expect(nestedUnder(core, "spawn-1")[0]?.status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });
    core.addToolResult({
      messageId: "run-1",
      toolCallId: "inner",
      toolName: "research",
      result: "done",
      isError: false,
    });
    expect(nestedUnder(core, "spawn-1")[0]?.status).toMatchObject({
      type: "complete",
    });
  });

  it("keeps a snapshot-only nested call pending after run completion", async () => {
    const core = await run([
      ...spawn("spawn-1"),
      {
        type: "SUBAGENT_STARTED",
        subagentRunId: "run-1",
        parentToolCallId: "spawn-1",
        name: "researcher",
      },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          {
            id: "a",
            role: "assistant",
            content: "",
            toolCalls: [call("spawn-1")],
          },
          { id: "t", role: "tool", toolCallId: "spawn-1", content: '"ok"' },
          {
            id: "s",
            role: "assistant",
            content: "",
            toolCalls: [call("inner")],
            subagentRunId: "run-1",
          },
        ],
      },
    ]);
    expect(core.getPendingToolCalls()?.toolCallIds).toContain("inner");
  });
  it("admits a snapshot nested call past the spawning message's pending list", async () => {
    const core = await run([
      ...spawn("spawn-1"),
      {
        type: "SUBAGENT_STARTED",
        subagentRunId: "run-1",
        parentToolCallId: "spawn-1",
        name: "researcher",
      },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          {
            id: "a",
            role: "assistant",
            content: "",
            toolCalls: [call("spawn-1")],
            metadata: { custom: { agui: { pendingToolCallIds: ["spawn-1"] } } },
          },
          { id: "t", role: "tool", toolCallId: "spawn-1", content: '"ok"' },
          {
            id: "s",
            role: "assistant",
            content: "",
            toolCalls: [call("inner")],
            subagentRunId: "run-1",
            metadata: { custom: { agui: { pendingToolCallIds: ["inner"] } } },
          },
        ],
      },
    ]);
    expect(core.getPendingToolCalls()?.toolCallIds).toContain("inner");
  });
  it.each([
    ["equals the spawning call's id", "spawn-1"],
    ["is announced by SUBAGENT_STARTED", "run-1"],
  ])(
    "nests an attributed snapshot message once when its run id %s",
    async (_case, runId) => {
      const core = await run([
        ...spawn("spawn-1"),
        {
          type: "SUBAGENT_STARTED",
          subagentRunId: runId,
          parentToolCallId: "spawn-1",
          name: "researcher",
        },
        ...subagentText(runId, "sub-text", "Paris is sunny."),
        { type: "SUBAGENT_FINISHED", subagentRunId: runId },
        {
          type: "TOOL_CALL_RESULT",
          toolCallId: "spawn-1",
          messageId: "t",
          content: '"done"',
        },
        snapshot(runId, "spawn-1"),
        snapshot(runId, "spawn-1"),
      ]);

      expect(rootIds(core)).toEqual(["a"]);
      const nested = nestedUnder(core, "spawn-1");
      expect(nested).toHaveLength(1);
      expect(contentOf(nested)).toEqual([
        { type: "text", text: "Paris is sunny." },
      ]);
      expect(nested[0]?.metadata.custom).toMatchObject({
        agui: { name: "researcher" },
      });
    },
  );

  it.each([undefined, "concat-content"] as const)(
    "keeps the live subagent's error status and reasoning through a snapshot (joinStrategy %s)",
    async (joinStrategy) => {
      const core = await run(
        [
          ...spawn("spawn-1"),
          {
            type: "SUBAGENT_STARTED",
            subagentRunId: "run-1",
            parentToolCallId: "spawn-1",
            name: "researcher",
          },
          { type: "REASONING_START", messageId: "r", subagentRunId: "run-1" },
          {
            type: "REASONING_MESSAGE_START",
            messageId: "r",
            role: "reasoning",
            subagentRunId: "run-1",
          },
          {
            type: "REASONING_MESSAGE_CONTENT",
            messageId: "r",
            delta: "Checking.",
            subagentRunId: "run-1",
          },
          {
            type: "REASONING_MESSAGE_END",
            messageId: "r",
            subagentRunId: "run-1",
          },
          { type: "REASONING_END", messageId: "r", subagentRunId: "run-1" },
          ...subagentText("run-1", "sub-text", "Paris is sunny."),
          { type: "SUBAGENT_ERROR", subagentRunId: "run-1", message: "boom" },
          {
            type: "TOOL_CALL_RESULT",
            toolCallId: "spawn-1",
            messageId: "t",
            content: '"done"',
          },
          snapshot("run-1", "spawn-1"),
        ],
        joinStrategy,
      );

      const [nested] = nestedUnder(core, "spawn-1");
      expect(nested?.status).toMatchObject({ type: "incomplete" });
      expect(contentOf(nested ? [nested] : [])).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "reasoning", text: "Checking." }),
          { type: "text", text: "Paris is sunny." },
        ]),
      );
    },
  );

  it("keeps every snapshot's content for a run that grows across snapshots", async () => {
    const turn = (text: Event[]) => ({
      type: "MESSAGES_SNAPSHOT",
      messages: [
        { id: "u", role: "user", content: "u" },
        {
          id: "a",
          role: "assistant",
          content: "",
          toolCalls: [call("spawn-1")],
        },
        ...text,
      ],
    });
    const core = await run([
      ...spawn("spawn-1"),
      {
        type: "SUBAGENT_STARTED",
        subagentRunId: "run-1",
        parentToolCallId: "spawn-1",
        name: "researcher",
      },
      turn([
        {
          id: "s1",
          role: "assistant",
          content: "First.",
          subagentRunId: "run-1",
        },
      ]),
      turn([
        {
          id: "s1",
          role: "assistant",
          content: "First.",
          subagentRunId: "run-1",
        },
        {
          id: "s2",
          role: "assistant",
          content: "Second.",
          subagentRunId: "run-1",
        },
      ]),
    ]);

    expect(rootIds(core)).toEqual(["a"]);
    expect(contentOf(nestedUnder(core, "spawn-1"))).toEqual([
      { type: "text", text: "First." },
      { type: "text", text: "Second." },
    ]);
  });

  it("resolves a live nested call whose result only arrives in a snapshot", async () => {
    const core = await run([
      ...spawn("spawn-1"),
      {
        type: "SUBAGENT_STARTED",
        subagentRunId: "run-1",
        parentToolCallId: "spawn-1",
        name: "researcher",
      },
      {
        type: "TOOL_CALL_START",
        toolCallId: "inner",
        toolCallName: "lookup",
        subagentRunId: "run-1",
      },
      { type: "TOOL_CALL_END", toolCallId: "inner", subagentRunId: "run-1" },
      { type: "SUBAGENT_FINISHED", subagentRunId: "run-1" },
      {
        type: "TOOL_CALL_RESULT",
        toolCallId: "spawn-1",
        messageId: "t",
        content: '"done"',
      },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          { id: "u", role: "user", content: "u" },
          {
            id: "a",
            role: "assistant",
            content: "",
            toolCalls: [call("spawn-1")],
          },
          {
            id: "s1",
            role: "assistant",
            content: "",
            toolCalls: [call("inner", "lookup")],
            subagentRunId: "run-1",
          },
          {
            id: "s1-result",
            role: "tool",
            toolCallId: "inner",
            content: '"sunny"',
            subagentRunId: "run-1",
          },
          { id: "t", role: "tool", toolCallId: "spawn-1", content: '"done"' },
        ],
      },
    ]);

    const inner = contentOf(nestedUnder(core, "spawn-1")).find(
      (part) => part.type === "tool-call" && part.toolCallId === "inner",
    );
    expect(inner).toMatchObject({ result: "sunny" });
    expect(core.getPendingToolCalls()).toBeNull();
  });

  it("keeps live subagent text that a lagging snapshot has not caught up with", async () => {
    const core = await run([
      ...spawn("spawn-1"),
      {
        type: "SUBAGENT_STARTED",
        subagentRunId: "run-1",
        parentToolCallId: "spawn-1",
        name: "researcher",
      },
      ...subagentText("run-1", "s1", "First."),
      ...subagentText("run-1", "s2", "Second."),
      { type: "SUBAGENT_FINISHED", subagentRunId: "run-1" },
      {
        type: "TOOL_CALL_RESULT",
        toolCallId: "spawn-1",
        messageId: "t",
        content: '"done"',
      },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          { id: "u", role: "user", content: "u" },
          {
            id: "a",
            role: "assistant",
            content: "",
            toolCalls: [call("spawn-1")],
          },
          {
            id: "s1",
            role: "assistant",
            content: "First.",
            subagentRunId: "run-1",
          },
          { id: "t", role: "tool", toolCallId: "spawn-1", content: '"done"' },
        ],
      },
    ]);

    expect(rootIds(core)).toEqual(["a"]);
    expect(contentOf(nestedUnder(core, "spawn-1"))).toEqual([
      { type: "text", text: "First." },
      { type: "text", text: "Second." },
    ]);
  });

  it("keeps a failed live subagent's status and metadata when the snapshot copy is empty", async () => {
    const core = await run([
      ...spawn("spawn-1"),
      {
        type: "SUBAGENT_STARTED",
        subagentRunId: "run-1",
        parentToolCallId: "spawn-1",
        name: "researcher",
      },
      ...subagentText("run-1", "s1", "Working."),
      {
        type: "SUBAGENT_ERROR",
        subagentRunId: "run-1",
        message: "boom",
        code: "TOOL_FAILED",
      },
      {
        type: "TOOL_CALL_RESULT",
        toolCallId: "spawn-1",
        messageId: "t",
        content: '"failed"',
      },
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          { id: "u", role: "user", content: "u" },
          {
            id: "a",
            role: "assistant",
            content: "",
            toolCalls: [call("spawn-1")],
          },
          { id: "s0", role: "assistant", content: "", subagentRunId: "run-1" },
          { id: "t", role: "tool", toolCallId: "spawn-1", content: '"failed"' },
        ],
      },
    ]);

    const [nested] = nestedUnder(core, "spawn-1");
    expect(nested?.status).toMatchObject({ type: "incomplete" });
    expect(nested?.metadata.custom).toMatchObject({
      agui: { name: "researcher", errorCode: "TOOL_FAILED" },
    });
    expect(contentOf(nested ? [nested] : [])).toEqual([
      { type: "text", text: "Working." },
    ]);
  });

  describe("merging a nested transcript with a snapshot copy", () => {
    const started: Event = {
      type: "SUBAGENT_STARTED",
      subagentRunId: "run-1",
      parentToolCallId: "spawn-1",
      name: "researcher",
    };
    const innerCall = (toolCallId: string): Event[] => [
      {
        type: "TOOL_CALL_START",
        toolCallId,
        toolCallName: "lookup",
        subagentRunId: "run-1",
      },
      { type: "TOOL_CALL_END", toolCallId, subagentRunId: "run-1" },
    ];
    const innerResult = (toolCallId: string): Event => ({
      type: "TOOL_CALL_RESULT",
      toolCallId,
      messageId: `${toolCallId}-result`,
      content: '"sunny"',
      subagentRunId: "run-1",
    });
    const finish: Event[] = [
      { type: "SUBAGENT_FINISHED", subagentRunId: "run-1" },
      {
        type: "TOOL_CALL_RESULT",
        toolCallId: "spawn-1",
        messageId: "t",
        content: '"done"',
      },
    ];
    const snapshotOf = (...records: Event[]): Event => ({
      type: "MESSAGES_SNAPSHOT",
      messages: [
        { id: "u", role: "user", content: "u" },
        {
          id: "a",
          role: "assistant",
          content: "",
          toolCalls: [call("spawn-1")],
        },
        ...records,
      ],
    });
    const record = (id: string, content: string, toolCalls?: string[]) => ({
      id,
      role: "assistant",
      content,
      subagentRunId: "run-1",
      ...(toolCalls
        ? { toolCalls: toolCalls.map((t) => call(t, "lookup")) }
        : {}),
    });
    const resultRecord = (toolCallId: string) => ({
      id: `${toolCallId}-result`,
      role: "tool",
      toolCallId,
      content: '"sunny"',
      subagentRunId: "run-1",
    });
    const innerOf = (core: AgUiThreadController) =>
      contentOf(nestedUnder(core, "spawn-1")).find(
        (part) => part.type === "tool-call" && part.toolCallId === "inner",
      );

    it("applies a snapshot's result while live text is ahead of it", async () => {
      const core = await run([
        ...spawn("spawn-1"),
        started,
        ...subagentText("run-1", "s1", "Looking."),
        ...innerCall("inner"),
        ...subagentText("run-1", "s2", "Done."),
        ...finish,
        snapshotOf(record("s1", "Looking.", ["inner"]), resultRecord("inner")),
      ]);

      expect(innerOf(core)).toMatchObject({ result: "sunny" });
      expect(core.getPendingToolCalls()).toBeNull();
    });

    it("keeps streaming results and reasoning after a snapshot whose text is ahead", async () => {
      const core = await run([
        ...spawn("spawn-1"),
        started,
        ...subagentText("run-1", "s1", "Hello world."),
        snapshotOf(record("s1", "Hello world.\n")),
        ...innerCall("inner"),
        innerResult("inner"),
        { type: "REASONING_START", messageId: "r", subagentRunId: "run-1" },
        {
          type: "REASONING_MESSAGE_START",
          messageId: "r",
          role: "reasoning",
          subagentRunId: "run-1",
        },
        {
          type: "REASONING_MESSAGE_CONTENT",
          messageId: "r",
          delta: "Hmm.",
          subagentRunId: "run-1",
        },
        {
          type: "REASONING_MESSAGE_END",
          messageId: "r",
          subagentRunId: "run-1",
        },
        { type: "REASONING_END", messageId: "r", subagentRunId: "run-1" },
        ...finish,
      ]);

      expect(innerOf(core)).toMatchObject({ result: "sunny" });
      expect(contentOf(nestedUnder(core, "spawn-1"))).toEqual(
        expect.arrayContaining([
          { type: "text", text: "Hello world.\n" },
          expect.objectContaining({ type: "reasoning", text: "Hmm." }),
        ]),
      );
    });

    it("keeps a call that only a snapshot carried once live text continues", async () => {
      const core = await run([
        ...spawn("spawn-1"),
        started,
        snapshotOf(record("s1", "", ["inner"]), resultRecord("inner")),
        ...subagentText("run-1", "s2", "Done."),
        ...finish,
      ]);

      expect(innerOf(core)).toMatchObject({ result: "sunny" });
    });

    it("settles a finished subagent that a lagging snapshot shows waiting", async () => {
      const core = await run([
        ...spawn("spawn-1"),
        started,
        ...innerCall("inner"),
        innerResult("inner"),
        ...finish,
        snapshotOf(record("s1", "", ["inner"])),
      ]);

      const [nested] = nestedUnder(core, "spawn-1");
      expect(nested?.status).toMatchObject({ type: "complete" });
      expect(innerOf(core)).toMatchObject({ result: "sunny" });
    });

    const sequence = (core: AgUiThreadController) =>
      contentOf(nestedUnder(core, "spawn-1")).map((part) =>
        part.type === "tool-call"
          ? `${part.toolCallId}=${JSON.stringify(part.result)}`
          : part.type === "text"
            ? part.text
            : part.type,
      );

    it.each([
      {
        name: "a call between two texts",
        live: [
          ...subagentText("run-1", "s1", "A."),
          ...innerCall("t1"),
          innerResult("t1"),
          ...subagentText("run-1", "s2", "B."),
        ],
        snapshot: [record("s1", "A.", ["t1"])],
        expected: ["A.", 't1="sunny"', "B."],
      },
      {
        name: "text after a call with no text before it",
        live: [
          ...innerCall("inner"),
          innerResult("inner"),
          ...subagentText("run-1", "s2", "Done."),
        ],
        snapshot: [record("s1", "", ["inner"])],
        expected: ['inner="sunny"', "Done."],
      },
      {
        name: "two calls with text around them",
        live: [
          ...subagentText("run-1", "s1", "A."),
          ...innerCall("t1"),
          innerResult("t1"),
          ...subagentText("run-1", "s2", "B."),
          ...innerCall("t2"),
          innerResult("t2"),
          ...subagentText("run-1", "s3", "C."),
        ],
        snapshot: [
          record("s1", "A.", ["t1"]),
          resultRecord("t1"),
          record("s2", "B."),
        ],
        expected: ["A.", 't1="sunny"', "B.", 't2="sunny"', "C."],
      },
      {
        name: "text between two calls it lacks",
        live: [
          ...subagentText("run-1", "s1", "A."),
          ...innerCall("t1"),
          innerResult("t1"),
          ...subagentText("run-1", "s2", "B."),
          ...innerCall("t2"),
          innerResult("t2"),
        ],
        snapshot: [record("s1", "A.", ["t1"])],
        expected: ["A.", 't1="sunny"', "B.", 't2="sunny"'],
      },
    ])(
      "keeps the live order when a lagging snapshot has $name",
      async ({ live, snapshot: records, expected }) => {
        const core = await run([
          ...spawn("spawn-1"),
          started,
          ...live,
          ...finish,
          snapshotOf(...records),
        ]);

        expect(sequence(core)).toEqual(expected);
      },
    );

    it("keeps snapshot text before live reasoning it preceded while streaming continues", async () => {
      const core = await run([
        ...spawn("spawn-1"),
        started,
        ...subagentText("run-1", "s1", "A."),
        { type: "REASONING_START", messageId: "r", subagentRunId: "run-1" },
        {
          type: "REASONING_MESSAGE_START",
          messageId: "r",
          role: "reasoning",
          subagentRunId: "run-1",
        },
        {
          type: "REASONING_MESSAGE_CONTENT",
          messageId: "r",
          delta: "Hmm.",
          subagentRunId: "run-1",
        },
        {
          type: "REASONING_MESSAGE_END",
          messageId: "r",
          subagentRunId: "run-1",
        },
        { type: "REASONING_END", messageId: "r", subagentRunId: "run-1" },
        snapshotOf(record("s1", "A."), record("s2", "B.")),
        ...innerCall("inner"),
      ]);

      expect(sequence(core)).toEqual([
        "A.",
        "reasoning",
        "B.",
        "inner=undefined",
      ]);
    });
  });
});
