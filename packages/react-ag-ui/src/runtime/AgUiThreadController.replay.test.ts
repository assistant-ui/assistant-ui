import { describe, expect, it, vi } from "vitest";
import type { AbstractAgent } from "@ag-ui/client";
import type {
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import { makeLogger } from "./logger";

type Subscriber = Record<
  string,
  ((payload: { event: unknown }) => void) | undefined
>;

function emit(subscriber: Subscriber, event: Record<string, unknown>) {
  const name = `on${event.type
    ?.toString()
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join("")}Event`;
  subscriber[name]?.({ event });
}

function text(subscriber: Subscriber, id: string, value: string) {
  emit(subscriber, { type: "TEXT_MESSAGE_START", messageId: id });
  emit(subscriber, {
    type: "TEXT_MESSAGE_CONTENT",
    messageId: id,
    delta: value,
  });
  emit(subscriber, { type: "TEXT_MESSAGE_END", messageId: id });
}

function user(id: string): ThreadMessage {
  return {
    id,
    role: "user",
    content: [{ type: "text", text: id }],
    attachments: [],
    createdAt: new Date(0),
    metadata: { custom: {} },
  };
}

function assistant(
  id: string,
  content: ThreadAssistantMessage["content"],
  status: ThreadAssistantMessage["status"] = {
    type: "complete",
    reason: "unknown",
  },
): ThreadAssistantMessage {
  return {
    id,
    role: "assistant",
    content,
    status,
    createdAt: new Date(0),
    metadata: {
      custom: {},
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
    },
  };
}

const call = (id: string, extras: Record<string, unknown> = {}) =>
  ({
    type: "tool-call" as const,
    toolCallId: id,
    toolName: "lookup",
    args: {},
    argsText: "{}",
    ...extras,
  }) as ThreadAssistantMessage["content"][number];

async function loaded(
  messages: ThreadMessage[],
  runAgent: (
    input: { runId: string; messages?: readonly unknown[] },
    subscriber: Subscriber,
  ) => Promise<void>,
  parentIds?: (string | null)[],
  historyUpdate?: NonNullable<ThreadHistoryAdapter["update"]>,
) {
  const history: ThreadHistoryAdapter = {
    load: vi.fn().mockResolvedValue({
      headId: messages.at(-1)?.id ?? null,
      messages: messages.map((message, index) => ({
        parentId:
          parentIds === undefined
            ? (messages[index - 1]?.id ?? null)
            : (parentIds[index] ?? null),
        message,
      })),
    }),
    append: vi.fn().mockResolvedValue(undefined),
    ...(historyUpdate ? { update: historyUpdate } : {}),
  };
  const agent = {
    runAgent: vi.fn(runAgent),
    abortRun: vi.fn(),
  } as unknown as AbstractAgent;
  const core = new AgUiThreadController({
    agent,
    history,
    logger: makeLogger(),
    showThinking: true,
  });
  await core.__internal_load();
  return core;
}

const ids = (core: AgUiThreadController) => core.getMessages().map((m) => m.id);
const contents = (core: AgUiThreadController, id: string) =>
  (core.getMessages().find((m) => m.id === id) as ThreadAssistantMessage)
    .content;
const toolResultCount = (messages: readonly unknown[], toolCallId: string) =>
  messages.filter(
    (message) =>
      typeof message === "object" &&
      message !== null &&
      "role" in message &&
      message.role === "tool" &&
      "toolCallId" in message &&
      message.toolCallId === toolCallId,
  ).length;
const resume = (core: AgUiThreadController, parentId: string) =>
  core.resume({ parentId, sourceId: null, runConfig: {} });

function streamToolCall(
  subscriber: Subscriber,
  toolCallId: string,
  args: string,
) {
  emit(subscriber, {
    type: "TOOL_CALL_START",
    toolCallId,
    toolCallName: "lookup",
  });
  emit(subscriber, { type: "TOOL_CALL_ARGS", toolCallId, delta: args });
  emit(subscriber, { type: "TOOL_CALL_END", toolCallId });
}

describe("AgUiThreadController selected-turn replay", () => {
  it.each(["user", "assistant"] as const)(
    "adopts contiguous assistant IDs and parent links in forward order from the %s parent",
    async (parent) => {
      const core = await loaded(
        [
          user("u"),
          assistant("a", [{ type: "text", text: "old A" }]),
          assistant("b", [{ type: "text", text: "old B" }]),
        ],
        async (input, subscriber) => {
          text(subscriber, "a", "new A");
          text(subscriber, "b", "new B");
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
        },
      );

      await resume(core, parent === "user" ? "u" : "a");

      expect(ids(core)).toEqual(["u", "a", "b"]);
      expect(contents(core, "a")).toEqual([{ type: "text", text: "new A" }]);
      expect(contents(core, "b")).toEqual([{ type: "text", text: "new B" }]);
      expect(
        core.getMessageRepository().messages.map((m) => m.parentId),
      ).toEqual([null, "u", "a"]);
    },
  );

  it.each(["before", "during"] as const)(
    "keeps a later pending call addressable %s the first assistant frame",
    async (moment) => {
      let continueRun!: () => void;
      const paused = new Promise<void>((resolve) => {
        continueRun = resolve;
      });
      let reached!: () => void;
      const atFirst = new Promise<void>((resolve) => {
        reached = resolve;
      });
      let transportAttempts = 0;
      const core = await loaded(
        [
          user("u"),
          assistant("a", [{ type: "text", text: "old A" }]),
          assistant("b", [call("b-call")], {
            type: "requires-action",
            reason: "tool-calls",
          }),
        ],
        async (input, subscriber) => {
          transportAttempts++;
          if (transportAttempts > 1) {
            text(subscriber, "continued", "Tool result received.");
            emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
            return;
          }
          if (moment === "during") text(subscriber, "a", "new A");
          reached();
          await paused;
          if (moment === "before") text(subscriber, "a", "new A");
          text(subscriber, "b", "new B");
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
        },
      );

      const running = resume(core, "u");
      await atFirst;
      try {
        expect(ids(core)).toEqual(["u", "a", "b"]);
        expect(contents(core, "a")).toEqual([
          { type: "text", text: moment === "before" ? "old A" : "new A" },
        ]);
        expect(transportAttempts).toBe(1);
        expect(contents(core, "b")).toContainEqual(
          expect.objectContaining({ toolCallId: "b-call" }),
        );
        core.addToolResult({
          messageId: "b",
          toolCallId: "b-call",
          toolName: "lookup",
          result: "ready",
          isError: false,
        });
        expect(contents(core, "b")).toContainEqual(
          expect.objectContaining({ toolCallId: "b-call", result: "ready" }),
        );
      } finally {
        continueRun();
        await running;
      }
      expect(ids(core)).toEqual(["u", "a", "b", "continued"]);
      expect(contents(core, "a")).toEqual([{ type: "text", text: "new A" }]);
      expect(contents(core, "b")).toContainEqual(
        expect.objectContaining({ toolCallId: "b-call", result: "ready" }),
      );
      expect(transportAttempts).toBe(2);
      expect(
        core
          .getMessageRepository()
          .messages.filter(({ message }) => message.id === "b"),
      ).toHaveLength(1);
    },
  );

  it.each(["error", "cancelled"] as const)(
    "retains completed tool state across %s before call re-emission and later resume",
    async (ending) => {
      const stored = assistant("a", [
        { type: "text", text: "old" },
        call("done", {
          result: "answer",
          unstable_interactions: {
            entries: [
              { type: "action", occurredAt: 1, payload: { name: "confirm" } },
            ],
          },
        }),
      ]);
      let attempts = 0;
      const core = await loaded(
        [user("u"), stored],
        async (input, subscriber) => {
          attempts++;
          text(subscriber, "a", attempts === 1 ? "partial" : "finished");
          if (attempts === 1) {
            if (ending === "error") throw new Error("connection lost");
            emit(subscriber, {
              type: "RUN_FINISHED",
              runId: input.runId,
              outcome: { type: "cancelled" },
            });
            return;
          }
          emit(subscriber, {
            type: "TOOL_CALL_START",
            toolCallId: "done",
            toolCallName: "lookup",
          });
          emit(subscriber, { type: "TOOL_CALL_END", toolCallId: "done" });
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
        },
      );

      if (ending === "error") {
        await expect(resume(core, "u")).rejects.toThrow("connection lost");
      } else {
        await resume(core, "u");
        expect(core.getMessages()[1]?.status).toMatchObject({
          type: "incomplete",
          reason: "cancelled",
        });
      }
      expect(contents(core, "a")).toContainEqual({
        type: "text",
        text: "partial",
      });
      expect(contents(core, "a")).toContainEqual(
        expect.objectContaining({
          toolCallId: "done",
          result: "answer",
          unstable_interactions: expect.objectContaining({
            entries: [
              expect.objectContaining({ payload: { name: "confirm" } }),
            ],
          }),
        }),
      );
      await resume(core, "u");
      expect(ids(core)).toEqual(["u", "a"]);
      expect(contents(core, "a")).toContainEqual(
        expect.objectContaining({
          toolCallId: "done",
          result: "answer",
          unstable_interactions: expect.any(Object),
        }),
      );
    },
  );

  it("merges fresh subagent output with a pending nested child without flattening it", async () => {
    const originalNested = assistant("sub-1", [call("pending-child")], {
      type: "requires-action",
      reason: "tool-calls",
    });
    const core = await loaded(
      [
        user("u"),
        assistant("a", [call("root", { messages: [originalNested] })], {
          type: "requires-action",
          reason: "tool-calls",
        }),
      ],
      async (input, subscriber) => {
        text(subscriber, "a", "working");
        emit(subscriber, {
          type: "TOOL_CALL_START",
          toolCallId: "root",
          toolCallName: "delegate",
        });
        emit(subscriber, {
          type: "SUBAGENT_STARTED",
          subagentRunId: "sub-1",
          parentToolCallId: "root",
          name: "helper",
        });
        emit(subscriber, {
          type: "TEXT_MESSAGE_START",
          messageId: "sub-text",
          subagentRunId: "sub-1",
        });
        emit(subscriber, {
          type: "TEXT_MESSAGE_CONTENT",
          messageId: "sub-text",
          delta: "fresh child text",
          subagentRunId: "sub-1",
        });
        emit(subscriber, {
          type: "TEXT_MESSAGE_END",
          messageId: "sub-text",
          subagentRunId: "sub-1",
        });
        emit(subscriber, { type: "TOOL_CALL_END", toolCallId: "root" });
        emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
      },
    );

    await resume(core, "u");
    expect(ids(core)).toEqual(["u", "a"]);
    const roots = contents(core, "a").filter(
      (part) => part.type === "tool-call" && part.toolCallId === "root",
    );
    expect(roots).toHaveLength(1);
    const nested = roots[0]?.type === "tool-call" ? roots[0].messages : [];
    expect(
      nested?.flatMap((message) =>
        message.role === "assistant" ? message.content : [],
      ),
    ).toEqual(
      expect.arrayContaining([
        { type: "text", text: "fresh child text" },
        expect.objectContaining({ toolCallId: "pending-child" }),
      ]),
    );
    expect(
      contents(core, "a").some(
        (part) =>
          part.type === "tool-call" && part.toolCallId === "pending-child",
      ),
    ).toBe(false);
  });

  it("uses fork semantics after a genuinely new ID and never rewrites an older ID later in the stream", async () => {
    const core = await loaded(
      [
        user("u"),
        assistant("a", [{ type: "text", text: "old A" }]),
        assistant("b", [{ type: "text", text: "old B" }]),
      ],
      async (input, subscriber) => {
        text(subscriber, "a", "new A");
        text(subscriber, "fresh", "fresh turn");
        text(subscriber, "b", "late old ID");
        emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
      },
    );

    await resume(core, "u");
    const repository = core.getMessageRepository().messages;
    expect(
      repository.find(({ message }) => message.id === "b")?.message.content,
    ).toEqual([{ type: "text", text: "old B" }]);
    expect(ids(core)).toEqual(["u", "a", "fresh"]);
    expect(
      repository.find(({ message }) => message.id === "fresh")?.parentId,
    ).toBe("a");
  });

  it("does not adopt an assistant ID from before a later user boundary", async () => {
    const core = await loaded(
      [
        user("u"),
        assistant("a", [{ type: "text", text: "original" }]),
        user("later-user"),
        assistant("b", [{ type: "text", text: "later answer" }]),
      ],
      async (input, subscriber) => {
        text(subscriber, "a", "unrelated replay");
        emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
      },
    );

    await resume(core, "later-user");
    expect(
      core
        .getMessageRepository()
        .messages.find(({ message }) => message.id === "a")?.message.content,
    ).toEqual([{ type: "text", text: "original" }]);
    expect(
      core.getMessages().some((message) => message.id === "later-user"),
    ).toBe(true);
    expect(core.getMessages().at(-1)?.id).not.toBe("a");
  });

  it("replays an older selected turn and forks a new answer without deleting the later conversation", async () => {
    const core = await loaded(
      [
        user("u1"),
        assistant("a", [{ type: "text", text: "old A" }]),
        assistant("b", [{ type: "text", text: "old B" }]),
        user("u2"),
        assistant("c", [{ type: "text", text: "later C" }]),
      ],
      async (input, subscriber) => {
        text(subscriber, "a", "replayed A");
        text(subscriber, "b", "replayed B");
        text(subscriber, "d", "new answer");
        emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
      },
    );

    await resume(core, "u1");
    expect(ids(core)).toEqual(["u1", "a", "b", "d"]);
    expect(contents(core, "a")).toEqual([{ type: "text", text: "replayed A" }]);
    expect(contents(core, "b")).toEqual([{ type: "text", text: "replayed B" }]);
    expect(contents(core, "d")).toEqual([{ type: "text", text: "new answer" }]);
    const repository = core.getMessageRepository();
    expect(repository.headId).toBe("d");
    expect(
      repository.messages.find(({ message }) => message.id === "u2"),
    ).toMatchObject({
      parentId: "b",
      message: { content: [{ type: "text", text: "u2" }] },
    });
    expect(
      repository.messages.find(({ message }) => message.id === "c"),
    ).toMatchObject({
      parentId: "u2",
      message: { content: [{ type: "text", text: "later C" }] },
    });
    expect(
      repository.messages.find(({ message }) => message.id === "d")?.parentId,
    ).toBe("b");
  });

  it("does not rewrite an assistant on a sibling branch", async () => {
    const core = await loaded(
      [
        user("u"),
        assistant("sibling", [{ type: "text", text: "other branch" }]),
        assistant("selected", [{ type: "text", text: "selected branch" }]),
      ],
      async (input, subscriber) => {
        text(subscriber, "sibling", "colliding stream");
        emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
      },
      [null, "u", "u"],
    );

    await resume(core, "u");
    expect(
      core
        .getMessageRepository()
        .messages.find(({ message }) => message.id === "sibling")?.message
        .content,
    ).toEqual([{ type: "text", text: "other branch" }]);
    expect(core.getMessages().at(-1)?.id).not.toBe("sibling");
  });

  it("keeps longer partial text when replay starts with its strict prefix", async () => {
    const core = await loaded(
      [
        user("u"),
        assistant("a", [{ type: "text", text: "already streamed long text" }], {
          type: "incomplete",
          reason: "error",
          error: "disconnect",
        }),
      ],
      async (_input, subscriber) => {
        text(subscriber, "a", "already streamed");
        throw new Error("failed before the suffix");
      },
    );
    await expect(resume(core, "u")).rejects.toThrow("failed before the suffix");
    expect(ids(core)).toEqual(["u", "a"]);
    expect(contents(core, "a")).toContainEqual({
      type: "text",
      text: "already streamed long text",
    });
    expect(core.getMessages()[1]).toMatchObject({
      status: {
        type: "incomplete",
        reason: "error",
        error: "failed before the suffix",
      },
    });
  });

  it.each(["none", "reintroduce", "preserve"] as const)(
    "honors replay removals and rebases ownership after snapshot=%s",
    async (snapshot) => {
      const core = await loaded(
        [user("u"), assistant("a", [call("history", { result: "kept" })])],
        async (input, subscriber) => {
          text(subscriber, "a", "Reconnected");
          emit(subscriber, {
            type: "ACTIVITY_SNAPSHOT",
            activityType: "a2ui-surface",
            messageId: "activity",
            content: {
              a2ui_operations: [
                { version: "v0.9", createSurface: { surfaceId: "surface" } },
                {
                  version: "v0.9",
                  updateComponents: {
                    surfaceId: "surface",
                    components: [
                      { id: "root", component: "Text", text: "Ready" },
                    ],
                  },
                },
              ],
            },
          });
          expect(contents(core, "a")).toContainEqual(
            expect.objectContaining({ toolCallId: "a2ui:surface" }),
          );
          if (snapshot === "preserve") {
            emit(subscriber, {
              type: "MESSAGES_SNAPSHOT",
              messages: [{ id: "u", role: "user", content: "question" }],
            });
          }
          emit(subscriber, {
            type: "ACTIVITY_SNAPSHOT",
            activityType: "a2ui-surface",
            messageId: "activity",
            replace: true,
            content: { a2ui_operations: [] },
          });
          expect(contents(core, "a")).not.toContainEqual(
            expect.objectContaining({ toolCallId: "a2ui:surface" }),
          );
          if (snapshot === "reintroduce") {
            emit(subscriber, {
              type: "MESSAGES_SNAPSHOT",
              messages: [
                { id: "u", role: "user", content: "question" },
                {
                  id: "a",
                  role: "assistant",
                  content: "Reconnected",
                  toolCalls: [
                    {
                      id: "a2ui:surface",
                      type: "function",
                      function: { name: "present", arguments: "{}" },
                    },
                  ],
                },
              ],
            });
            emit(subscriber, {
              type: "TEXT_MESSAGE_CONTENT",
              messageId: "a",
              delta: " suffix",
            });
            expect(contents(core, "a")).toContainEqual(
              expect.objectContaining({ toolCallId: "a2ui:surface" }),
            );
          }
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
        },
      );
      await resume(core, "u");
      if (snapshot !== "reintroduce") {
        expect(contents(core, "a")).toEqual([
          expect.objectContaining({ toolCallId: "history", result: "kept" }),
          { type: "text", text: "Reconnected" },
        ]);
      }
    },
  );

  it("continues ordered replay across a snapshot of the same selected turn", async () => {
    const core = await loaded(
      [
        user("u"),
        assistant("a", [{ type: "text", text: "old A" }]),
        assistant("b", [{ type: "text", text: "old B" }]),
      ],
      async (input, subscriber) => {
        text(subscriber, "a", "replayed A");
        emit(subscriber, {
          type: "MESSAGES_SNAPSHOT",
          messages: [
            { id: "u", role: "user", content: "question" },
            { id: "a", role: "assistant", content: "replayed A" },
            { id: "b", role: "assistant", content: "old B" },
          ],
        });
        emit(subscriber, {
          type: "TEXT_MESSAGE_CONTENT",
          messageId: "a",
          delta: " suffix",
        });
        text(subscriber, "b", "replayed B");
        emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
      },
    );
    await resume(core, "u");
    expect(ids(core)).toEqual(["u", "a", "b"]);
    expect(contents(core, "a")).toEqual([
      { type: "text", text: "replayed A suffix" },
    ]);
    expect(contents(core, "b")).toEqual([{ type: "text", text: "replayed B" }]);
  });

  it.each(["error", "cancelled"] as const)(
    "retains the selected turn when %s arrives before its first message ID",
    async (ending) => {
      const core = await loaded(
        [
          user("u"),
          assistant("a", [
            { type: "text", text: "retained" },
            call("done", { result: false }),
          ]),
        ],
        async (input, subscriber) => {
          if (ending === "error") throw new Error("before identity");
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: { type: "cancelled" },
          });
        },
      );
      if (ending === "error")
        await expect(resume(core, "u")).rejects.toThrow("before identity");
      else await resume(core, "u");
      expect(ids(core)).toEqual(["u", "a"]);
      expect(contents(core, "a")).toEqual([
        { type: "text", text: "retained" },
        expect.objectContaining({ toolCallId: "done", result: false }),
      ]);
      expect(core.getMessages().at(-1)?.status).toMatchObject({
        type: "incomplete",
        reason: ending,
      });
    },
  );

  it.each(["unknown", "resolved-client", "retained-client"])(
    "keeps retained server calls non-actionable when producer pending list contains only %s",
    async (listed) => {
      let attempts = 0;
      const core = await loaded(
        [
          user("u"),
          assistant("a", [
            call("server-call"),
            call(listed === "retained-client" ? listed : "resolved-client", {
              result: listed === "retained-client" ? undefined : "done",
            }),
          ]),
        ],
        async (input, subscriber) => {
          attempts++;
          text(subscriber, "a", "replayed");
          emit(subscriber, {
            type: "TOOL_CALL_START",
            toolCallId: "server-call",
            toolCallName: "lookup",
          });
          emit(subscriber, {
            type: "TOOL_CALL_END",
            toolCallId: "server-call",
          });
          if (listed === "resolved-client") {
            emit(subscriber, {
              type: "TOOL_CALL_START",
              toolCallId: listed,
              toolCallName: "lookup",
            });
            emit(subscriber, { type: "TOOL_CALL_END", toolCallId: listed });
            emit(subscriber, {
              type: "TOOL_CALL_RESULT",
              toolCallId: listed,
              messageId: "result",
              content: "done",
            });
          }
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: { type: "success", pendingToolCallIds: [listed] },
          });
        },
      );
      await resume(core, "u");
      expect(core.getPendingToolCalls()).toEqual(
        listed === "retained-client"
          ? { messageId: "a", toolCallIds: [listed] }
          : null,
      );
      expect(core.getMessages().at(-1)?.status).toMatchObject({
        type: listed === "retained-client" ? "requires-action" : "complete",
      });
      expect(contents(core, "a")).toContainEqual(
        expect.objectContaining({ toolCallId: "server-call" }),
      );
      expect(attempts).toBe(1);
    },
  );
  it.each(["fork", "interrupt"] as const)(
    "revalidates a deferred tool continuation after the stream changes to %s",
    async (scenario) => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let started!: () => void;
      const ready = new Promise<void>((resolve) => {
        started = resolve;
      });
      let attempts = 0;
      const core = await loaded(
        [
          user("u"),
          assistant("a", [{ type: "text", text: "original" }]),
          assistant("b", [call("waiting")], {
            type: "requires-action",
            reason: "tool-calls",
          }),
        ],
        async (input, subscriber) => {
          attempts++;
          if (attempts > 1) {
            text(subscriber, "unexpected", "wrong branch");
            emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
            return;
          }
          started();
          await gate;
          text(subscriber, "a", "replayed A");
          if (scenario === "fork") {
            text(subscriber, "fresh", "selected answer");
            emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
          } else {
            text(subscriber, "b", "replayed B");
            emit(subscriber, {
              type: "TOOL_CALL_START",
              toolCallId: "approval-call",
              toolCallName: "lookup",
            });
            emit(subscriber, {
              type: "TOOL_CALL_END",
              toolCallId: "approval-call",
            });
            emit(subscriber, {
              type: "RUN_FINISHED",
              runId: input.runId,
              outcome: {
                type: "interrupt",
                interrupts: [
                  {
                    id: "approval",
                    reason: "tool_call",
                    toolCallId: "approval-call",
                  },
                ],
              },
            });
          }
        },
      );
      const running = resume(core, "u");
      await ready;
      core.addToolResult({
        messageId: "b",
        toolCallId: "waiting",
        toolName: "lookup",
        result: "done",
        isError: false,
      });
      release();
      await running;
      expect(attempts).toBe(1);
      if (scenario === "fork") {
        expect(ids(core)).toEqual(["u", "a", "fresh"]);
        expect(contents(core, "fresh")).toEqual([
          { type: "text", text: "selected answer" },
        ]);
      } else {
        expect(ids(core)).toEqual(["u", "a", "b"]);
        expect(
          core.getPendingInterrupts()?.interrupts.map((entry) => entry.id),
        ).toEqual(["approval"]);
      }
      const abandoned = core
        .getMessageRepository()
        .messages.find(({ message }) => message.id === "b");
      expect(abandoned?.message.content).toContainEqual(
        expect.objectContaining({ toolCallId: "waiting", result: "done" }),
      );
    },
  );

  it.each(["first", "both"] as const)(
    "delivers a surviving earlier result when %s result owners complete before replay forks",
    async (completed) => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let started!: () => void;
      const ready = new Promise<void>((resolve) => {
        started = resolve;
      });
      let attempts = 0;
      let delivered: readonly unknown[] | undefined;
      const core = await loaded(
        [
          user("u"),
          assistant("a", [call("call-a")], {
            type: "requires-action",
            reason: "tool-calls",
          }),
          assistant("b", [call("call-b")], {
            type: "requires-action",
            reason: "tool-calls",
          }),
        ],
        async (input, subscriber) => {
          attempts++;
          if (attempts > 1) {
            delivered = input.messages;
            text(subscriber, "continued", "delivered");
            emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
            return;
          }
          started();
          await gate;
          text(subscriber, "a", "selected A");
          text(subscriber, "fresh", "selected answer");
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
        },
      );
      const running = resume(core, "u");
      await ready;
      try {
        core.addToolResult({
          messageId: "a",
          toolCallId: "call-a",
          toolName: "lookup",
          result: "A result",
          isError: false,
        });
        if (completed === "both")
          core.addToolResult({
            messageId: "b",
            toolCallId: "call-b",
            toolName: "lookup",
            result: "B result",
            isError: false,
          });
      } finally {
        release();
        await running;
      }
      expect(attempts).toBe(2);
      expect(ids(core)).toEqual(["u", "a", "fresh", "continued"]);
      expect(delivered).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "tool",
            toolCallId: "call-a",
            content: expect.stringContaining("A result"),
          }),
        ]),
      );
      expect(delivered).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: "tool", toolCallId: "call-b" }),
        ]),
      );
    },
  );

  it.each(["tool-only", "held"] as const)(
    "rebases pending calls for a %s replay without activating excluded history",
    async (scenario) => {
      const historical = assistant("a", [call("x"), call("hidden")], {
        type: "requires-action",
        reason: "tool-calls",
      });
      const stored: ThreadAssistantMessage = {
        ...historical,
        metadata: {
          ...historical.metadata,
          custom: { agui: { pendingToolCallIds: ["x"] } },
        },
      };
      let attempts = 0;
      const core = await loaded(
        [
          user("u"),
          stored,
          ...(scenario === "held"
            ? [assistant("b", [{ type: "text", text: "old B" }])]
            : []),
        ],
        async (input, subscriber) => {
          attempts++;
          if (attempts === 1) {
            if (scenario === "held") text(subscriber, "a", "replayed A");
            for (const toolCallId of ["x", "y"]) {
              emit(subscriber, {
                type: "TOOL_CALL_START",
                toolCallId,
                toolCallName: "lookup",
              });
              emit(subscriber, { type: "TOOL_CALL_END", toolCallId });
            }
            if (scenario === "held") text(subscriber, "b", "replayed B");
          }
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
        },
      );

      await resume(core, "u");
      expect(core.getPendingToolCalls()).toEqual({
        messageId: "a",
        toolCallIds: ["x", "y"],
      });
      expect(contents(core, "a")).toContainEqual(
        expect.objectContaining({ toolCallId: "hidden" }),
      );
      core.addToolResult({
        messageId: "a",
        toolCallId: "x",
        toolName: "lookup",
        result: "x result",
        isError: false,
      });
      expect(attempts).toBe(1);
      expect(core.getPendingToolCalls()).toEqual({
        messageId: "a",
        toolCallIds: ["y"],
      });
      core.addToolResult({
        messageId: "a",
        toolCallId: "y",
        toolName: "lookup",
        result: "y result",
        isError: false,
      });
      await vi.waitFor(() => expect(attempts).toBe(2));
    },
  );

  it("applies the producer pending-call list across earlier replay owners", async () => {
    let attempts = 0;
    let continuationMessages: readonly unknown[] = [];
    const core = await loaded(
      [
        user("u"),
        assistant("a", [call("x")], {
          type: "requires-action",
          reason: "tool-calls",
        }),
        assistant("b", [{ type: "text", text: "old B" }]),
      ],
      async (input, subscriber) => {
        attempts++;
        if (attempts > 1) {
          continuationMessages = input.messages ?? [];
          text(subscriber, "continued", "received y");
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
          return;
        }
        text(subscriber, "b", "replayed B");
        emit(subscriber, {
          type: "TOOL_CALL_START",
          toolCallId: "y",
          toolCallName: "lookup",
        });
        emit(subscriber, {
          type: "TOOL_CALL_ARGS",
          toolCallId: "y",
          delta: "{}",
        });
        emit(subscriber, { type: "TOOL_CALL_END", toolCallId: "y" });
        emit(subscriber, {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: { type: "success", pendingToolCallIds: ["y"] },
        });
      },
    );

    await resume(core, "u");
    const pendingAfterReplay = core.getPendingToolCalls();
    const xCallsInA = contents(core, "a").filter(
      (part) => part.type === "tool-call" && part.toolCallId === "x",
    );

    core.addToolResult({
      messageId: "b",
      toolCallId: "y",
      toolName: "lookup",
      result: "y result",
      isError: false,
    });
    await vi.waitFor(() => expect(core.isRunning()).toBe(false));

    const yResultsInB = contents(core, "b")
      .filter((part) => part.type === "tool-call" && part.toolCallId === "y")
      .map((part) => (part.type === "tool-call" ? part.result : undefined));
    const continuationToolResults = continuationMessages.filter(
      (message) =>
        typeof message === "object" &&
        message !== null &&
        "role" in message &&
        message.role === "tool",
    );
    expect({
      pendingAfterReplay,
      xCallsInA: xCallsInA.length,
      yResultsInB,
      attempts,
      continuationToolResults,
    }).toEqual({
      pendingAfterReplay: { messageId: "b", toolCallIds: ["y"] },
      xCallsInA: 1,
      yResultsInB: ["y result"],
      attempts: 2,
      continuationToolResults: [
        expect.objectContaining({
          role: "tool",
          toolCallId: "y",
          content: "y result",
        }),
      ],
    });
  });

  it.each([
    ["tool-only replay", false],
    ["late B text identity", true],
  ] as const)(
    "keeps an identity-less replayed call on its historical assistant owner after %s",
    async (_scenario, replayBText) => {
      let attempts = 0;
      let continuationMessages: readonly unknown[] = [];
      const core = await loaded(
        [
          user("u"),
          assistant("a", [call("x")], {
            type: "requires-action",
            reason: "tool-calls",
          }),
          assistant("b", [{ type: "text", text: "old B" }]),
        ],
        async (input, subscriber) => {
          attempts++;
          if (attempts > 1) {
            continuationMessages = input.messages ?? [];
            text(subscriber, "continued", "received x");
            emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
            return;
          }
          emit(subscriber, {
            type: "TOOL_CALL_START",
            toolCallId: "x",
            toolCallName: "lookup",
          });
          emit(subscriber, {
            type: "TOOL_CALL_ARGS",
            toolCallId: "x",
            delta: "{}",
          });
          emit(subscriber, { type: "TOOL_CALL_END", toolCallId: "x" });
          if (replayBText) text(subscriber, "b", "fresh B");
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
        },
      );

      await resume(core, "u");
      const idsAfterReplay = ids(core);
      const headAfterReplay = core.getMessageRepository().headId;
      const xCallsInA = contents(core, "a").filter(
        (part) => part.type === "tool-call" && part.toolCallId === "x",
      );
      const pendingAfterReplay = core.getPendingToolCalls();
      const bContentAfterReplay = contents(core, "b");

      core.addToolResult({
        messageId: "a",
        toolCallId: "x",
        toolName: "lookup",
        result: "x result",
        isError: false,
      });
      await vi.waitFor(() => expect(core.isRunning()).toBe(false));

      const xResultsInA = contents(core, "a")
        .filter((part) => part.type === "tool-call" && part.toolCallId === "x")
        .map((part) =>
          part.type === "tool-call"
            ? { toolCallId: part.toolCallId, result: part.result }
            : undefined,
        );
      const continuationParentId = core
        .getMessageRepository()
        .messages.at(-1)?.parentId;
      const continuationToolResults = continuationMessages.filter(
        (message) =>
          typeof message === "object" &&
          message !== null &&
          "role" in message &&
          message.role === "tool",
      );
      expect({
        idsAfterReplay,
        headAfterReplay,
        xCallsInA: xCallsInA.length,
        bContentAfterReplay,
        pendingAfterReplay,
        xResultsInA,
        continuationParentId,
        attempts,
        continuationToolResults,
      }).toEqual({
        idsAfterReplay: ["u", "a", "b"],
        headAfterReplay: "b",
        xCallsInA: 1,
        bContentAfterReplay: [
          { type: "text", text: replayBText ? "fresh B" : "old B" },
        ],
        pendingAfterReplay: { messageId: "a", toolCallIds: ["x"] },
        xResultsInA: [{ toolCallId: "x", result: "x result" }],
        continuationParentId: "b",
        attempts: 2,
        continuationToolResults: [
          expect.objectContaining({
            role: "tool",
            toolCallId: "x",
            content: "x result",
          }),
        ],
      });
    },
  );

  it("groups identity-less tool updates by their retained top-level owner", async () => {
    let attempts = 0;
    let continuationMessages: readonly unknown[] = [];
    const historyUpdate = vi.fn(
      async (
        _item: Parameters<NonNullable<ThreadHistoryAdapter["update"]>>[0],
      ) => {},
    );
    const core = await loaded(
      [
        user("u"),
        assistant("a", [call("x")], {
          type: "requires-action",
          reason: "tool-calls",
        }),
        assistant("b", [call("y"), { type: "text", text: "old B" }], {
          type: "requires-action",
          reason: "tool-calls",
        }),
      ],
      async (input, subscriber) => {
        attempts++;
        if (attempts > 1) {
          continuationMessages = input.messages ?? [];
          text(subscriber, "continued", "received y");
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
          return;
        }
        streamToolCall(subscriber, "x", '{"query":"fresh x"}');
        streamToolCall(subscriber, "y", '{"query":"fresh y"}');
        emit(subscriber, {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: { type: "success", pendingToolCallIds: ["y"] },
        });
      },
      undefined,
      historyUpdate,
    );

    await resume(core, "u");
    const pendingAfterReplay = core.getPendingToolCalls();
    const headAfterReplay = core.getMessageRepository().headId;
    const parentIdsAfterReplay = core
      .getMessageRepository()
      .messages.map(({ message, parentId }) => [message.id, parentId]);
    const xCallsInA = contents(core, "a").flatMap((part) =>
      part.type === "tool-call" && part.toolCallId === "x"
        ? [{ toolCallId: part.toolCallId, args: part.args }]
        : [],
    );
    const yCallsInB = contents(core, "b").flatMap((part) =>
      part.type === "tool-call" && part.toolCallId === "y"
        ? [{ toolCallId: part.toolCallId, args: part.args }]
        : [],
    );

    core.addToolResult({
      messageId: "b",
      toolCallId: "y",
      toolName: "lookup",
      result: "y result",
      isError: false,
    });
    await vi.waitFor(() => expect(core.isRunning()).toBe(false));

    const historyUpdatedOwners = [
      ...new Set(historyUpdate.mock.calls.map(([item]) => item.message.id)),
    ].sort();
    expect({
      pendingAfterReplay,
      headAfterReplay,
      parentIdsAfterReplay,
      xCallsInA,
      yCallsInB,
      attempts,
      yResultCount: toolResultCount(continuationMessages, "y"),
      historyUpdatedOwners,
    }).toEqual({
      pendingAfterReplay: { messageId: "b", toolCallIds: ["y"] },
      headAfterReplay: "b",
      parentIdsAfterReplay: [
        ["u", null],
        ["a", "u"],
        ["b", "a"],
      ],
      xCallsInA: [{ toolCallId: "x", args: { query: "fresh x" } }],
      yCallsInB: [{ toolCallId: "y", args: { query: "fresh y" } }],
      attempts: 2,
      yResultCount: 1,
      historyUpdatedOwners: ["a", "b"],
    });
    expect(
      core
        .getMessageRepository()
        .messages.find(({ message }) => message.id === "continued")?.parentId,
    ).toBe("b");
    expect(continuationMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "tool",
          toolCallId: "y",
          content: "y result",
        }),
      ]),
    );
  });

  it("updates an existing nested call in place during flat replay", async () => {
    let attempts = 0;
    let continuationMessages: readonly unknown[] = [];
    const nestedOwner = assistant("sub-a", [call("x")], {
      type: "requires-action",
      reason: "tool-calls",
    });
    const core = await loaded(
      [
        user("u"),
        assistant("a", [call("root", { messages: [nestedOwner] })], {
          type: "requires-action",
          reason: "tool-calls",
        }),
        assistant("b", [{ type: "text", text: "old B" }]),
      ],
      async (input, subscriber) => {
        attempts++;
        if (attempts > 1) {
          continuationMessages = input.messages ?? [];
          text(subscriber, "continued", "received x");
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
          return;
        }
        streamToolCall(subscriber, "x", '{"query":"fresh nested x"}');
        emit(subscriber, {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: { type: "success", pendingToolCallIds: ["x"] },
        });
      },
    );

    await resume(core, "u");
    const rootCalls = contents(core, "a").filter(
      (part) => part.type === "tool-call" && part.toolCallId === "root",
    );
    const nestedCalls = rootCalls.flatMap((part) =>
      part.type === "tool-call"
        ? (part.messages ?? []).flatMap((message) =>
            message.role === "assistant"
              ? message.content.flatMap((nestedPart) =>
                  nestedPart.type === "tool-call" &&
                  nestedPart.toolCallId === "x"
                    ? [
                        {
                          toolCallId: nestedPart.toolCallId,
                          args: nestedPart.args,
                        },
                      ]
                    : [],
                )
              : [],
          )
        : [],
    );
    const topLevelX = contents(core, "a").filter(
      (part) => part.type === "tool-call" && part.toolCallId === "x",
    );
    expect({
      ids: ids(core),
      headId: core.getMessageRepository().headId,
      rootCalls: rootCalls.length,
      nestedCalls,
      topLevelX: topLevelX.length,
      pending: core.getPendingToolCalls(),
      bContent: contents(core, "b"),
    }).toEqual({
      ids: ["u", "a", "b"],
      headId: "b",
      rootCalls: 1,
      nestedCalls: [{ toolCallId: "x", args: { query: "fresh nested x" } }],
      topLevelX: 0,
      pending: { messageId: "a", toolCallIds: ["x"] },
      bContent: [{ type: "text", text: "old B" }],
    });

    core.addToolResult({
      messageId: "a",
      toolCallId: "x",
      toolName: "lookup",
      result: "nested x result",
      isError: false,
    });
    await vi.waitFor(() => expect(core.isRunning()).toBe(false));
    expect(attempts).toBe(2);
    expect(toolResultCount(continuationMessages, "x")).toBe(1);
    expect(continuationMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "tool",
          toolCallId: "x",
          content: "nested x result",
        }),
      ]),
    );
  });

  it("cancels every touched owner when identity-less replay ends cancelled", async () => {
    let attempts = 0;
    const core = await loaded(
      [
        user("u"),
        assistant("a", [call("x")], {
          type: "requires-action",
          reason: "tool-calls",
        }),
        assistant("b", [call("y"), { type: "text", text: "old B" }], {
          type: "requires-action",
          reason: "tool-calls",
        }),
      ],
      async (input, subscriber) => {
        attempts++;
        streamToolCall(subscriber, "x", '{"query":"cancelled x"}');
        streamToolCall(subscriber, "y", '{"query":"cancelled y"}');
        emit(subscriber, {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: { type: "cancelled" },
        });
      },
    );

    await resume(core, "u");
    const a = core.getMessages().find((message) => message.id === "a");
    const b = core.getMessages().find((message) => message.id === "b");
    expect({
      attempts,
      ids: ids(core),
      headId: core.getMessageRepository().headId,
      aStatus: a?.status,
      bStatus: b?.status,
      pending: core.getPendingToolCalls(),
    }).toEqual({
      attempts: 1,
      ids: ["u", "a", "b"],
      headId: "b",
      aStatus: { type: "incomplete", reason: "cancelled" },
      bStatus: { type: "incomplete", reason: "cancelled" },
      pending: null,
    });
  });

  it.each([
    "single-owner",
    "cross-owner",
    "cross-owner-retained",
    "single-owner-late-text",
  ] as const)(
    "keeps a %s interrupt batch on one owner and the selected head on B",
    async (scope) => {
      let attempts = 0;
      const inputs: unknown[] = [];
      const xInterrupt = {
        id: "gate-x",
        reason: "tool_call" as const,
        toolCallId: "x",
      };
      const yInterrupt = {
        id: "gate-y",
        reason: "tool_call" as const,
        toolCallId: "y",
      };
      const isSingleOwner =
        scope === "single-owner" || scope === "single-owner-late-text";
      const interrupts = isSingleOwner
        ? [xInterrupt]
        : [xInterrupt, yInterrupt];
      const anchorId = isSingleOwner ? "a" : "b";
      const nonAnchorId = isSingleOwner ? "b" : "a";
      const core = await loaded(
        [
          user("u"),
          assistant("a", [call("x")], {
            type: "requires-action",
            reason: "tool-calls",
          }),
          assistant(
            "b",
            [call("y"), call("z"), { type: "text", text: "old B" }],
            { type: "requires-action", reason: "tool-calls" },
          ),
        ],
        async (input, subscriber) => {
          attempts++;
          inputs.push(input);
          if (attempts > 1) {
            emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
            return;
          }
          if (scope === "single-owner-late-text") {
            text(subscriber, "a", "fresh A");
            text(subscriber, "b", "fresh B");
          } else if (scope !== "cross-owner-retained") {
            streamToolCall(subscriber, "x", '{"query":"fresh x"}');
            streamToolCall(subscriber, "y", '{"query":"fresh y"}');
          }
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: { type: "interrupt", interrupts },
          });
        },
      );

      await resume(core, "u");
      const pendingInterrupts = core.getPendingInterrupts();
      const interruptOwners = core
        .getMessages()
        .filter(
          (message) =>
            message.role === "assistant" &&
            message.status?.type === "requires-action" &&
            message.status.reason === "interrupt",
        );
      const nonAnchor = core
        .getMessages()
        .find((message) => message.id === nonAnchorId);
      const nonAnchorAgui = (
        nonAnchor?.metadata.custom as Record<string, unknown> | undefined
      )?.agui as Record<string, unknown> | undefined;
      const pendingToolsBeforeResponse = core.getPendingToolCalls();

      const responses = interrupts.map(({ id }) => ({
        interruptId: id,
        status: "resolved" as const,
      }));
      const selectedHeadBeforeResponse = core.getMessageRepository().headId;
      if (scope === "single-owner-late-text") {
        expect(pendingInterrupts).toEqual({ messageId: anchorId, interrupts });
        await core.respondToToolApproval({
          approvalId: "gate-x",
          approved: true,
        });
      } else {
        await core.submitInterruptResponses(responses);
      }
      const continuationParentId = core
        .getMessageRepository()
        .messages.at(-1)?.parentId;

      expect({
        pendingInterrupts,
        interruptOwnerIds: interruptOwners.map((message) => message.id),
        selectedHeadBeforeResponse,
        continuationParentId,
        nonAnchorStatus: nonAnchor?.status,
        nonAnchorInterrupts: nonAnchorAgui?.interrupts,
        nonAnchorPendingIds: nonAnchorAgui?.pendingToolCallIds ?? [],
        pendingToolsBeforeResponse,
        attempts,
      }).toEqual({
        pendingInterrupts: { messageId: anchorId, interrupts },
        interruptOwnerIds: [anchorId],
        selectedHeadBeforeResponse: "b",
        continuationParentId: "b",
        nonAnchorStatus: { type: "complete", reason: "unknown" },
        nonAnchorInterrupts: undefined,
        nonAnchorPendingIds: [],
        pendingToolsBeforeResponse: null,
        attempts: 2,
      });
      const expectedResume =
        scope === "single-owner-late-text"
          ? [
              {
                interruptId: "gate-x",
                status: "resolved",
                payload: { approved: true },
              },
            ]
          : responses;
      expect(inputs[1]).toMatchObject({ resume: expectedResume });
      if (scope === "single-owner-late-text") {
        expect(contents(core, "a")).toContainEqual({
          type: "text",
          text: "fresh A",
        });
        expect(contents(core, "b")).toContainEqual({
          type: "text",
          text: "fresh B",
        });
      }
    },
  );

  it.each(["root", "nested"] as const)(
    "projects an interrupt onto a retained %s call that the stream does not re-emit",
    async (location) => {
      const inputs: unknown[] = [];
      const retained =
        location === "root"
          ? [call("x")]
          : [call("root", { messages: [assistant("sub", [call("x")])] })];
      const core = await loaded(
        [
          user("u"),
          assistant("a", retained, {
            type: "requires-action",
            reason: "tool-calls",
          }),
        ],
        async (input, subscriber) => {
          inputs.push(input);
          if (inputs.length === 1) {
            text(subscriber, "a", "replayed answer");
            emit(subscriber, {
              type: "RUN_FINISHED",
              runId: input.runId,
              outcome: {
                type: "interrupt",
                interrupts: [
                  { id: "gate", reason: "tool_call", toolCallId: "x" },
                ],
              },
            });
            return;
          }
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
        },
      );

      await resume(core, "u");
      expect(core.getPendingInterrupts()).toEqual({
        messageId: "a",
        interrupts: [{ id: "gate", reason: "tool_call", toolCallId: "x" }],
      });
      if (location === "root") {
        expect(contents(core, "a")).toContainEqual(
          expect.objectContaining({
            toolCallId: "x",
            approval: { id: "gate" },
          }),
        );
      } else {
        expect(contents(core, "a")).toContainEqual(
          expect.objectContaining({
            toolCallId: "root",
            messages: [
              expect.objectContaining({
                content: [
                  expect.objectContaining({
                    toolCallId: "x",
                    approval: { id: "gate" },
                  }),
                ],
              }),
            ],
          }),
        );
      }
      await core.respondToToolApproval({ approvalId: "gate", approved: true });
      expect(inputs).toHaveLength(2);
      expect(inputs[1]).toMatchObject({
        resume: [
          {
            interruptId: "gate",
            status: "resolved",
            payload: { approved: true },
          },
        ],
      });
    },
  );

  it.each([
    ["gate", false],
    ["gate", true],
    ["old-gate", false],
    ["old-gate", true],
  ] as const)(
    "keeps a recorded approval decision only when replay reuses %s (re-emitted=%s)",
    async (previousGate, reemitted) => {
      let attempts = 0;
      const inputs: unknown[] = [];
      const core = await loaded(
        [
          user("u"),
          assistant(
            "a",
            [
              call("x", {
                approval: {
                  id: previousGate,
                  approved: true,
                  reason: "approved before replay",
                },
              }),
            ],
            { type: "incomplete", reason: "error", error: "disconnected" },
          ),
        ],
        async (input, subscriber) => {
          attempts++;
          inputs.push(input);
          if (attempts > 1) {
            emit(subscriber, {
              type: "RUN_FINISHED",
              runId: input.runId,
              ...(attempts === 2
                ? {
                    outcome: {
                      type: "interrupt" as const,
                      interrupts: [
                        { id: "gate", reason: "tool_call", toolCallId: "x" },
                      ],
                    },
                  }
                : {}),
            });
            return;
          }
          text(subscriber, "a", "replayed answer");
          if (reemitted) {
            emit(subscriber, {
              type: "TOOL_CALL_START",
              toolCallId: "x",
              toolCallName: "lookup",
            });
            emit(subscriber, { type: "TOOL_CALL_END", toolCallId: "x" });
          }
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: {
              type: "interrupt",
              interrupts: [
                { id: "gate", reason: "tool_call", toolCallId: "x" },
              ],
            },
          });
        },
      );

      await resume(core, "u");
      if (previousGate === "gate") {
        await vi.waitFor(() => expect(attempts).toBeGreaterThanOrEqual(2));
        await vi.waitFor(() => expect(core.isRunning()).toBe(false));
        expect(attempts).toBe(2);
        expect(inputs[1]).toMatchObject({
          resume: [
            {
              interruptId: "gate",
              status: "resolved",
              payload: { approved: true, reason: "approved before replay" },
            },
          ],
        });
      } else {
        expect(attempts).toBe(1);
      }
      const part = contents(core, "a").find(
        (item) => item.type === "tool-call" && item.toolCallId === "x",
      );
      if (part?.type !== "tool-call") throw new Error("missing retained call");
      expect(part.approval?.id).toBe("gate");
      expect(part.approval?.approved).toBe(
        previousGate === "gate" ? true : undefined,
      );
      expect(part.approval?.reason).toBe(
        previousGate === "gate" ? "approved before replay" : undefined,
      );
    },
  );

  it("submits a retained denial once when replay returns the same approval gate", async () => {
    let attempts = 0;
    const inputs: unknown[] = [];
    const core = await loaded(
      [
        user("u"),
        assistant(
          "a",
          [
            call("x", {
              approval: {
                id: "gate",
                approved: false,
                reason: "declined before replay",
              },
            }),
          ],
          { type: "incomplete", reason: "error", error: "disconnected" },
        ),
      ],
      async (input, subscriber) => {
        attempts++;
        inputs.push(input);
        if (attempts === 1) text(subscriber, "a", "replayed answer");
        emit(subscriber, {
          type: "RUN_FINISHED",
          runId: input.runId,
          ...(attempts <= 2
            ? {
                outcome: {
                  type: "interrupt" as const,
                  interrupts: [
                    { id: "gate", reason: "tool_call", toolCallId: "x" },
                  ],
                },
              }
            : {}),
        });
      },
    );

    await resume(core, "u");
    await vi.waitFor(() => expect(attempts).toBeGreaterThanOrEqual(2));
    await vi.waitFor(() => expect(core.isRunning()).toBe(false));

    expect(attempts).toBe(2);
    expect(inputs[1]).toMatchObject({
      resume: [
        {
          interruptId: "gate",
          status: "resolved",
          payload: { approved: false, reason: "declined before replay" },
        },
      ],
    });
  });

  it("does not apply a stored decision when the same gate ID moves to another tool", async () => {
    let attempts = 0;
    const core = await loaded(
      [
        user("u"),
        assistant(
          "a",
          [
            call("x", {
              approval: {
                id: "gate",
                approved: true,
                reason: "approved before replay",
              },
            }),
            call("y"),
          ],
          { type: "incomplete", reason: "error", error: "disconnected" },
        ),
      ],
      async (input, subscriber) => {
        attempts++;
        text(subscriber, "a", "replayed answer");
        emit(subscriber, {
          type: "TOOL_CALL_START",
          toolCallId: "y",
          toolCallName: "lookup",
        });
        emit(subscriber, { type: "TOOL_CALL_END", toolCallId: "y" });
        emit(subscriber, {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: {
            type: "interrupt",
            interrupts: [{ id: "gate", reason: "tool_call", toolCallId: "y" }],
          },
        });
      },
    );

    await resume(core, "u");

    expect(attempts).toBe(1);
    expect(core.getPendingInterrupts()).toEqual({
      messageId: "a",
      interrupts: [{ id: "gate", reason: "tool_call", toolCallId: "y" }],
    });
    const y = contents(core, "a").find(
      (part) => part.type === "tool-call" && part.toolCallId === "y",
    );
    if (y?.type !== "tool-call") throw new Error("missing rebound call");
    expect(y.approval?.id).toBe("gate");
    expect(y.approval?.approved).toBeUndefined();
  });

  it.each(["expired", "malformed"] as const)(
    "does not resubmit a stored decision for a %s replayed gate",
    async (expiry) => {
      const expiresAt =
        expiry === "expired"
          ? new Date(Date.now() - 60_000).toISOString()
          : "not-a-date";
      let attempts = 0;
      let resumeError: unknown;
      const core = await loaded(
        [
          user("u"),
          assistant(
            "a",
            [
              call("x", {
                approval: {
                  id: "gate",
                  approved: true,
                  reason: "approved before replay",
                },
              }),
            ],
            { type: "incomplete", reason: "error", error: "disconnected" },
          ),
        ],
        async (input, subscriber) => {
          attempts++;
          text(subscriber, "a", "replayed answer");
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: {
              type: "interrupt",
              interrupts: [
                {
                  id: "gate",
                  reason: "tool_call",
                  toolCallId: "x",
                  expiresAt,
                },
              ],
            },
          });
        },
      );

      try {
        await resume(core, "u");
      } catch (error) {
        resumeError = error;
      }

      expect(attempts).toBe(1);
      if (resumeError !== undefined) {
        expect(String(resumeError)).toMatch(
          expiry === "expired" ? /expired at/ : /malformed expiresAt/,
        );
      }
    },
  );

  it.each(["error", "cancelled"] as const)(
    "does not resubmit a stored decision when replay ends %s",
    async (ending) => {
      let attempts = 0;
      const core = await loaded(
        [
          user("u"),
          assistant(
            "a",
            [
              call("x", {
                approval: {
                  id: "gate",
                  approved: true,
                  reason: "approved before replay",
                },
              }),
            ],
            { type: "incomplete", reason: "error", error: "disconnected" },
          ),
        ],
        async (input, subscriber) => {
          attempts++;
          text(subscriber, "a", "replayed answer");
          if (ending === "error") throw new Error("replay failed");
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: { type: "cancelled" },
          });
        },
      );

      if (ending === "error")
        await expect(resume(core, "u")).rejects.toThrow("replay failed");
      else await resume(core, "u");

      expect(attempts).toBe(1);
    },
  );

  it("does not submit a replayed decision after its active run is cancelled", async () => {
    let release!: () => void;
    const drain = new Promise<void>((resolve) => {
      release = resolve;
    });
    let atInterrupt!: () => void;
    const interruptReached = new Promise<void>((resolve) => {
      atInterrupt = resolve;
    });
    let attempts = 0;
    const core = await loaded(
      [
        user("u"),
        assistant(
          "a",
          [
            call("x", {
              approval: {
                id: "gate",
                approved: true,
                reason: "approved before replay",
              },
            }),
          ],
          { type: "incomplete", reason: "error", error: "disconnected" },
        ),
      ],
      async (input, subscriber) => {
        attempts++;
        text(subscriber, "a", "replayed answer");
        emit(subscriber, {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: {
            type: "interrupt",
            interrupts: [{ id: "gate", reason: "tool_call", toolCallId: "x" }],
          },
        });
        atInterrupt();
        await drain;
      },
    );

    const running = resume(core, "u");
    await interruptReached;
    await core.cancel();
    release();
    await running;

    expect(attempts).toBe(1);
  });

  it("does not auto-submit after reset advances the history generation at run finish", async () => {
    let attempts = 0;
    let reset = false;
    const core = await loaded(
      [
        user("u"),
        assistant(
          "a",
          [
            call("x", {
              approval: {
                id: "gate",
                approved: true,
                reason: "approved before replay",
              },
            }),
          ],
          { type: "incomplete", reason: "error", error: "disconnected" },
        ),
      ],
      async (input, subscriber) => {
        attempts++;
        text(subscriber, "a", "replayed answer");
        emit(subscriber, {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: {
            type: "interrupt",
            interrupts: [{ id: "gate", reason: "tool_call", toolCallId: "x" }],
          },
        });
      },
    );
    const unsubscribe = core.subscribe(() => {
      if (
        reset ||
        attempts !== 1 ||
        core.getSnapshot().isRunning ||
        !core.getPendingInterrupts()
      )
        return;
      reset = true;
      core.resetThreadState();
    });

    try {
      await resume(core, "u");
    } finally {
      unsubscribe();
    }

    expect(reset).toBe(true);
    expect(attempts).toBe(1);
  });

  it("lets a newer native interrupt response own the run instead of auto-submitting the old decision", async () => {
    let attempts = 0;
    let submitted = false;
    let nativeResponse: Promise<void> | undefined;
    const inputs: unknown[] = [];
    const core = await loaded(
      [
        user("u"),
        assistant(
          "a",
          [
            call("x", {
              approval: {
                id: "gate",
                approved: true,
                reason: "approved before replay",
              },
            }),
          ],
          { type: "incomplete", reason: "error", error: "disconnected" },
        ),
      ],
      async (input, subscriber) => {
        attempts++;
        inputs.push(input);
        if (attempts === 1) {
          text(subscriber, "a", "replayed answer");
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: {
              type: "interrupt",
              interrupts: [
                { id: "gate", reason: "tool_call", toolCallId: "x" },
              ],
            },
          });
          return;
        }
        emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
      },
    );
    const unsubscribe = core.subscribe(() => {
      if (
        submitted ||
        attempts !== 1 ||
        core.getSnapshot().isRunning ||
        !core.getPendingInterrupts()
      )
        return;
      submitted = true;
      nativeResponse = core.submitInterruptResponses([
        { interruptId: "gate", status: "cancelled" },
      ]);
    });

    try {
      await resume(core, "u");
      await nativeResponse;
    } finally {
      unsubscribe();
    }

    expect(submitted).toBe(true);
    expect(attempts).toBe(2);
    expect(inputs[1]).toMatchObject({
      resume: [{ interruptId: "gate", status: "cancelled" }],
    });
  });

  it.each(["error", "cancelled"] as const)(
    "clears a retained unanswered approval when replay ends %s",
    async (ending) => {
      const historical = assistant(
        "a",
        [call("x", { approval: { id: "old-gate" } })],
        { type: "incomplete", reason: "error", error: "previous disconnect" },
      );
      const stored: ThreadAssistantMessage = {
        ...historical,
        metadata: {
          ...historical.metadata,
          custom: {
            agui: {
              interrupts: [
                { id: "old-gate", reason: "tool_call", toolCallId: "x" },
              ],
            },
          },
        },
      };
      const core = await loaded(
        [user("u"), stored],
        async (input, subscriber) => {
          text(subscriber, "a", "replayed answer");
          if (ending === "error") throw new Error("disconnected");
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: { type: "cancelled" },
          });
        },
      );

      if (ending === "error")
        await expect(resume(core, "u")).rejects.toThrow("disconnected");
      else await resume(core, "u");
      expect(core.getPendingInterrupts()).toBeNull();
      const part = contents(core, "a").find(
        (item) => item.type === "tool-call" && item.toolCallId === "x",
      );
      if (part?.type !== "tool-call") throw new Error("missing retained call");
      expect(part.approval).toBeUndefined();
    },
  );

  it.each(["raw-results", "frontend-results"] as const)(
    "keeps an excluded historical call non-actionable on a second replay after %s",
    async (delivery) => {
      const historical = assistant("a", [call("hidden"), call("x")], {
        type: "requires-action",
        reason: "tool-calls",
      });
      const stored: ThreadAssistantMessage = {
        ...historical,
        metadata: {
          ...historical.metadata,
          custom: { agui: { pendingToolCallIds: ["x"] } },
        },
      };
      let attempts = 0;
      const core = await loaded(
        [user("u"), stored],
        async (input, subscriber) => {
          attempts++;
          if (attempts === 1) {
            for (const toolCallId of ["x", "y"]) {
              emit(subscriber, {
                type: "TOOL_CALL_START",
                toolCallId,
                toolCallName: "lookup",
              });
              emit(subscriber, { type: "TOOL_CALL_END", toolCallId });
              if (delivery === "raw-results") {
                emit(subscriber, {
                  type: "TOOL_CALL_RESULT",
                  toolCallId,
                  messageId: `result-${toolCallId}`,
                  content: `${toolCallId} result`,
                });
              }
            }
          } else {
            if (attempts === 2 && delivery === "frontend-results")
              text(subscriber, "continued", "continued");
            else text(subscriber, "a", "replayed again");
          }
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
        },
      );

      await resume(core, "u");
      if (delivery === "frontend-results") {
        expect(core.getPendingToolCalls()).toEqual({
          messageId: "a",
          toolCallIds: ["x", "y"],
        });
        for (const toolCallId of ["x", "y"]) {
          core.addToolResult({
            messageId: "a",
            toolCallId,
            toolName: "lookup",
            result: `${toolCallId} result`,
            isError: false,
          });
        }
        await vi.waitFor(() => expect(core.isRunning()).toBe(false));
        expect(attempts).toBe(2);
      } else {
        expect(attempts).toBe(1);
      }
      expect(
        core.getMessages().find((message) => message.id === "a")?.status,
      ).toMatchObject({ type: "complete" });
      const hidden = contents(core, "a").find(
        (part) => part.type === "tool-call" && part.toolCallId === "hidden",
      );
      if (hidden?.type !== "tool-call")
        throw new Error("missing retained call");
      expect(hidden.result).toBeUndefined();
      expect(core.getPendingToolCalls()).toBeNull();

      await resume(core, "u");
      expect(
        core.getMessages().find((message) => message.id === "a")?.status,
      ).toMatchObject({ type: "complete" });
      expect(core.getPendingToolCalls()).toBeNull();
      expect(attempts).toBe(delivery === "raw-results" ? 2 : 3);
    },
  );

  it.each(["omitted", "raw", "listed"] as const)(
    "admits an incomplete historical call only with current %s authority",
    async (authority) => {
      let attempts = 0;
      const core = await loaded(
        [
          user("u"),
          assistant("a", [call("x")], {
            type: "incomplete",
            reason: "error",
            error: "previous disconnect",
          }),
        ],
        async (input, subscriber) => {
          attempts++;
          text(subscriber, "a", "replayed answer");
          if (authority === "raw") {
            emit(subscriber, {
              type: "TOOL_CALL_START",
              toolCallId: "x",
              toolCallName: "lookup",
            });
            emit(subscriber, { type: "TOOL_CALL_END", toolCallId: "x" });
          }
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            ...(authority === "listed"
              ? { outcome: { type: "success", pendingToolCallIds: ["x"] } }
              : {}),
          });
        },
      );

      await resume(core, "u");
      expect(contents(core, "a")).toContainEqual(
        expect.objectContaining({ toolCallId: "x" }),
      );
      expect(
        core.getMessages().find((message) => message.id === "a")?.status,
      ).toMatchObject({
        type: authority === "omitted" ? "complete" : "requires-action",
      });
      expect(core.getPendingToolCalls()).toEqual(
        authority === "omitted" ? null : { messageId: "a", toolCallIds: ["x"] },
      );
      expect(attempts).toBe(1);
    },
  );

  it("settles a held message using snapshot admission rather than its earlier open calls", async () => {
    let attempts = 0;
    const core = await loaded(
      [
        user("u"),
        assistant("a", [call("x")], {
          type: "requires-action",
          reason: "tool-calls",
        }),
        assistant("b", [{ type: "text", text: "old B" }]),
      ],
      async (input, subscriber) => {
        attempts++;
        text(subscriber, "a", "replayed A");
        emit(subscriber, {
          type: "TOOL_CALL_START",
          toolCallId: "x",
          toolCallName: "lookup",
        });
        emit(subscriber, { type: "TOOL_CALL_END", toolCallId: "x" });
        text(subscriber, "b", "replayed B");
        emit(subscriber, {
          type: "MESSAGES_SNAPSHOT",
          messages: [
            { id: "u", role: "user", content: "u" },
            {
              id: "a",
              role: "assistant",
              content: "replayed A",
              toolCalls: ["x", "y"].map((id) => ({
                id,
                type: "function",
                function: { name: "lookup", arguments: "{}" },
              })),
              metadata: { custom: { agui: { pendingToolCallIds: ["y"] } } },
            },
            { id: "b", role: "assistant", content: "replayed B" },
          ],
        });
        emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
      },
    );

    await resume(core, "u");
    expect(contents(core, "a")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ toolCallId: "x" }),
        expect.objectContaining({ toolCallId: "y" }),
      ]),
    );
    expect(core.getPendingToolCalls()).toEqual({
      messageId: "a",
      toolCallIds: ["y"],
    });
    expect(attempts).toBe(1);
  });

  it("lets a final producer list expand admission for a held message", async () => {
    const historical = assistant("a", [call("x"), call("y")], {
      type: "requires-action",
      reason: "tool-calls",
    });
    const stored: ThreadAssistantMessage = {
      ...historical,
      metadata: {
        ...historical.metadata,
        custom: { agui: { pendingToolCallIds: ["x"] } },
      },
    };
    let attempts = 0;
    const core = await loaded(
      [user("u"), stored, assistant("b", [{ type: "text", text: "old B" }])],
      async (input, subscriber) => {
        attempts++;
        text(subscriber, "a", "replayed A");
        text(subscriber, "b", "replayed B");
        emit(subscriber, {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: { type: "success", pendingToolCallIds: ["y"] },
        });
      },
    );

    await resume(core, "u");
    expect(contents(core, "a")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ toolCallId: "x" }),
        expect.objectContaining({ toolCallId: "y" }),
      ]),
    );
    expect(core.getPendingToolCalls()).toEqual({
      messageId: "a",
      toolCallIds: ["y"],
    });
    expect(attempts).toBe(1);
  });

  it.each(["complete", "incomplete"] as const)(
    "admits a retained call from initially %s A when the final producer lists it",
    async (initial) => {
      let attempts = 0;
      const core = await loaded(
        [
          user("u"),
          assistant(
            "a",
            [call("y")],
            initial === "complete"
              ? { type: "complete", reason: "stop" }
              : { type: "incomplete", reason: "error", error: "old failure" },
          ),
          assistant("b", [{ type: "text", text: "old B" }]),
        ],
        async (input, subscriber) => {
          attempts++;
          text(subscriber, "a", "replayed A");
          text(subscriber, "b", "replayed B");
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: { type: "success", pendingToolCallIds: ["y"] },
          });
        },
      );

      await resume(core, "u");
      expect(contents(core, "a")).toContainEqual(
        expect.objectContaining({ toolCallId: "y" }),
      );
      expect(core.getPendingToolCalls()).toEqual({
        messageId: "a",
        toolCallIds: ["y"],
      });
      expect(attempts).toBe(1);
    },
  );

  it("does not continue a normal run after the server resolves a held call", async () => {
    let attempts = 0;
    const core = await loaded([user("u")], async (input, subscriber) => {
      attempts++;
      if (attempts > 1) {
        emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
        return;
      }
      text(subscriber, "a", "answer A");
      emit(subscriber, {
        type: "TOOL_CALL_START",
        toolCallId: "x",
        toolCallName: "lookup",
      });
      emit(subscriber, { type: "TOOL_CALL_END", toolCallId: "x" });
      text(subscriber, "b", "answer B");
      emit(subscriber, {
        type: "TOOL_CALL_RESULT",
        toolCallId: "x",
        messageId: "result-x",
        content: "server result",
      });
      emit(subscriber, {
        type: "RUN_FINISHED",
        runId: input.runId,
        outcome: { type: "success", pendingToolCallIds: ["x"] },
      });
    });

    await resume(core, "u");
    expect(contents(core, "a")).toContainEqual(
      expect.objectContaining({ toolCallId: "x", result: "server result" }),
    );
    expect(
      core.getMessages().find((message) => message.id === "a")?.status,
    ).toMatchObject({ type: "complete" });
    expect(core.getPendingToolCalls()).toBeNull();
    expect(attempts).toBe(1);
  });

  it.each(["frontend", "server"] as const)(
    "continues a running replay only for a %s result on its retained call",
    async (source) => {
      let attempts = 0;
      let delivered: readonly unknown[] | undefined;
      let core!: AgUiThreadController;
      core = await loaded(
        [
          user("u"),
          assistant("a", [call("x")], {
            type: "requires-action",
            reason: "tool-calls",
          }),
        ],
        async (input, subscriber) => {
          attempts++;
          emit(subscriber, { type: "RUN_STARTED", runId: input.runId });
          if (attempts > 1) {
            delivered = input.messages;
            text(subscriber, "continued", "result delivered");
            emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
            return;
          }
          text(subscriber, "a", "replayed A");
          if (source === "frontend") {
            core.addToolResult({
              messageId: "a",
              toolCallId: "x",
              toolName: "lookup",
              result: "frontend result",
              isError: false,
            });
          } else {
            emit(subscriber, {
              type: "TOOL_CALL_RESULT",
              toolCallId: "x",
              messageId: "result-x",
              content: "server result",
            });
          }
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: { type: "success", pendingToolCallIds: ["x"] },
          });
        },
      );

      await resume(core, "u");
      expect(contents(core, "a")).toContainEqual(
        expect.objectContaining({
          toolCallId: "x",
          result: source === "frontend" ? "frontend result" : "server result",
        }),
      );
      expect(core.getPendingToolCalls()).toBeNull();
      if (source === "frontend") {
        await vi.waitFor(() => expect(attempts).toBe(2));
        expect(delivered).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              role: "tool",
              toolCallId: "x",
              content: expect.stringContaining("frontend result"),
            }),
          ]),
        );
      } else {
        expect(attempts).toBe(1);
      }
    },
  );

  it.each(["server-event", "snapshot-ack", "snapshot-missing"] as const)(
    "continues a pre-ID frontend result only when %s has not acknowledged it",
    async (ack) => {
      let attempts = 0;
      let delivered: readonly unknown[] | undefined;
      let core!: AgUiThreadController;
      core = await loaded(
        [
          user("u"),
          assistant("a", [call("x")], {
            type: "requires-action",
            reason: "tool-calls",
          }),
        ],
        async (input, subscriber) => {
          attempts++;
          emit(subscriber, { type: "RUN_STARTED", runId: input.runId });
          if (attempts > 1) {
            delivered = input.messages;
            text(subscriber, "continued", "result delivered");
            emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
            return;
          }
          core.addToolResult({
            messageId: "a",
            toolCallId: "x",
            toolName: "lookup",
            result: "frontend x",
            isError: false,
          });
          if (ack === "server-event") {
            emit(subscriber, {
              type: "TOOL_CALL_RESULT",
              toolCallId: "x",
              messageId: "result-x",
              content: "frontend x",
            });
          } else {
            emit(subscriber, {
              type: "MESSAGES_SNAPSHOT",
              messages: [
                { id: "u", role: "user", content: "u" },
                {
                  id: "a",
                  role: "assistant",
                  content: "",
                  toolCalls: [
                    {
                      id: "x",
                      type: "function",
                      function: { name: "lookup", arguments: "{}" },
                    },
                  ],
                },
                ...(ack === "snapshot-ack"
                  ? [
                      {
                        id: "result-x",
                        role: "tool",
                        tool_call_id: "x",
                        content: "frontend x",
                      },
                    ]
                  : []),
              ],
            });
          }
          text(subscriber, "a", "replayed A");
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: { type: "success", pendingToolCallIds: ["x"] },
          });
        },
      );

      await resume(core, "u");
      expect(contents(core, "a")).toContainEqual(
        expect.objectContaining({ toolCallId: "x", result: "frontend x" }),
      );
      expect(core.getPendingToolCalls()).toBeNull();
      if (ack === "snapshot-missing") {
        await vi.waitFor(() => expect(attempts).toBe(2));
        expect(delivered).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              role: "tool",
              toolCallId: "x",
              content: expect.stringContaining("frontend x"),
            }),
          ]),
        );
      } else {
        expect(attempts).toBe(1);
      }
    },
  );

  it("keeps the unacknowledged result when a pre-ID pair has only one server echo", async () => {
    let attempts = 0;
    let delivered: readonly unknown[] | undefined;
    let core!: AgUiThreadController;
    core = await loaded(
      [
        user("u"),
        assistant("a", [call("x"), call("y")], {
          type: "requires-action",
          reason: "tool-calls",
        }),
      ],
      async (input, subscriber) => {
        attempts++;
        emit(subscriber, { type: "RUN_STARTED", runId: input.runId });
        if (attempts > 1) {
          delivered = input.messages;
          text(subscriber, "continued", "result delivered");
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
          return;
        }
        for (const toolCallId of ["x", "y"]) {
          core.addToolResult({
            messageId: "a",
            toolCallId,
            toolName: "lookup",
            result: `frontend ${toolCallId}`,
            isError: false,
          });
        }
        emit(subscriber, {
          type: "TOOL_CALL_RESULT",
          toolCallId: "x",
          messageId: "result-x",
          content: "frontend x",
        });
        text(subscriber, "a", "replayed A");
        emit(subscriber, {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: { type: "success", pendingToolCallIds: ["x", "y"] },
        });
      },
    );

    await resume(core, "u");
    expect(core.getPendingToolCalls()).toBeNull();
    await vi.waitFor(() => expect(attempts).toBe(2));
    expect(delivered).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "tool",
          toolCallId: "y",
          content: expect.stringContaining("frontend y"),
        }),
      ]),
    );
  });

  it.each([
    ["user", "u", false, 2],
    ["assistant", "a", true, 1],
  ] as const)(
    "continues a stored result only when the %s-parent request omitted it",
    async (_parentKind, parentId, requestIncludesResult, expectedAttempts) => {
      let attempts = 0;
      const requests: (readonly unknown[])[] = [];
      const core = await loaded(
        [user("u"), assistant("a", [call("x", { result: "stored x" })])],
        async (input, subscriber) => {
          attempts++;
          requests.push(input.messages ?? []);
          if (attempts === 1) {
            text(subscriber, "a", "replayed A");
            emit(subscriber, {
              type: "TOOL_CALL_START",
              toolCallId: "x",
              toolCallName: "lookup",
            });
            emit(subscriber, { type: "TOOL_CALL_END", toolCallId: "x" });
            emit(subscriber, {
              type: "RUN_FINISHED",
              runId: input.runId,
              outcome: { type: "success", pendingToolCallIds: ["x"] },
            });
            return;
          }
          text(subscriber, "continued", "stored result delivered");
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
        },
      );

      await resume(core, parentId);

      if (requestIncludesResult) {
        expect(toolResultCount(requests[0] ?? [], "x")).toBe(1);
      } else {
        expect(toolResultCount(requests[0] ?? [], "x")).toBe(0);
      }
      if (expectedAttempts === 2) {
        await vi.waitFor(() => expect(attempts).toBe(2));
        expect(toolResultCount(requests[1] ?? [], "x")).toBe(1);
      }
      expect(attempts).toBe(expectedAttempts);
      expect(core.getPendingToolCalls()).toBeNull();
    },
  );

  it("delivers an eligible result after replay advances from A to B without re-emitting its call", async () => {
    const originalA = assistant("a", [call("x"), call("hidden")], {
      type: "requires-action",
      reason: "tool-calls",
    });
    const storedA: ThreadAssistantMessage = {
      ...originalA,
      metadata: {
        ...originalA.metadata,
        custom: { agui: { pendingToolCallIds: ["x"] } },
      },
    };
    let attempts = 0;
    let delivered: readonly unknown[] = [];
    let core!: AgUiThreadController;
    core = await loaded(
      [user("u"), storedA, assistant("b", [{ type: "text", text: "old B" }])],
      async (input, subscriber) => {
        attempts++;
        if (attempts > 1) {
          delivered = input.messages ?? [];
          text(subscriber, "continued", "eligible result delivered");
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
          return;
        }

        expect(core.getPendingToolCalls()).toEqual({
          messageId: "a",
          toolCallIds: ["x"],
        });
        core.addToolResult({
          messageId: "a",
          toolCallId: "x",
          toolName: "lookup",
          result: "frontend x",
          isError: false,
        });
        expect(core.getPendingToolCalls()).toBeNull();
        text(subscriber, "a", "replayed A");
        text(subscriber, "b", "replayed B");
        emit(subscriber, {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: { type: "success", pendingToolCallIds: ["x"] },
        });
      },
    );

    await resume(core, "u");
    await vi.waitFor(() => expect(attempts).toBe(2));

    expect(ids(core)).toEqual(["u", "a", "b", "continued"]);
    expect(contents(core, "a")).toContainEqual(
      expect.objectContaining({ toolCallId: "x", result: "frontend x" }),
    );
    const hidden = contents(core, "a").find(
      (part) => part.type === "tool-call" && part.toolCallId === "hidden",
    );
    if (hidden?.type !== "tool-call") throw new Error("missing hidden call");
    expect(hidden.result).toBeUndefined();
    expect(contents(core, "b")).toEqual([{ type: "text", text: "replayed B" }]);
    expect(toolResultCount(delivered, "x")).toBe(1);
    expect(toolResultCount(delivered, "hidden")).toBe(0);
    expect(core.getPendingToolCalls()).toBeNull();
  });

  it("answers an interrupt on retained A once while preserving later B in the selected turn", async () => {
    const inputs: unknown[] = [];
    let attempts = 0;
    const core = await loaded(
      [
        user("u"),
        assistant("a", [call("x")], {
          type: "requires-action",
          reason: "tool-calls",
        }),
        assistant("b", [{ type: "text", text: "old B" }]),
      ],
      async (input, subscriber) => {
        attempts++;
        inputs.push(input);
        if (attempts === 1) {
          text(subscriber, "a", "replayed A");
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: {
              type: "interrupt",
              interrupts: [
                { id: "gate", reason: "tool_call", toolCallId: "x" },
              ],
            },
          });
          return;
        }
        text(subscriber, "continued", "approval resumed");
        emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
      },
    );

    await resume(core, "u");

    expect(core.getPendingInterrupts()).toEqual({
      messageId: "a",
      interrupts: [{ id: "gate", reason: "tool_call", toolCallId: "x" }],
    });
    expect(ids(core)).toEqual(["u", "a", "b"]);
    await core.respondToToolApproval({ approvalId: "gate", approved: true });

    expect(attempts).toBe(2);
    expect(inputs).toHaveLength(2);
    expect(inputs[1]).toMatchObject({
      resume: [
        {
          interruptId: "gate",
          status: "resolved",
          payload: { approved: true },
        },
      ],
    });
    expect(ids(core)).toEqual(["u", "a", "b", "continued"]);
    expect(contents(core, "b")).toEqual([{ type: "text", text: "old B" }]);
  });

  it.each([
    ["after replaying A and B", true, true],
    ["without terminal admission after replaying A and B", false, true],
    ["after replaying only B", true, false],
  ] as const)(
    "delivers a stored result %s only when x is terminally admitted",
    async (_scenario, admitted, replayA) => {
      let attempts = 0;
      const requests: (readonly unknown[])[] = [];
      const core = await loaded(
        [
          user("u"),
          assistant("a", [call("x", { result: "stored x" })]),
          assistant("b", [{ type: "text", text: "old B" }]),
        ],
        async (input, subscriber) => {
          attempts++;
          requests.push(input.messages ?? []);
          if (attempts > 1) {
            text(subscriber, "continued", "stored x delivered");
            emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
            return;
          }

          if (replayA) text(subscriber, "a", "replayed A");
          text(subscriber, "b", "replayed B");
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            ...(admitted
              ? { outcome: { type: "success", pendingToolCallIds: ["x"] } }
              : {}),
          });
        },
      );

      await resume(core, "u");
      expect(toolResultCount(requests[0] ?? [], "x")).toBe(0);
      if (admitted) {
        await vi.waitFor(() => expect(attempts).toBe(2));
        expect(toolResultCount(requests[1] ?? [], "x")).toBe(1);
      } else {
        expect(attempts).toBe(1);
        expect(requests).toHaveLength(1);
        expect(toolResultCount(requests.flat(), "x")).toBe(0);
      }
      expect(contents(core, "a")).toContainEqual(
        expect.objectContaining({ toolCallId: "x", result: "stored x" }),
      );
      expect(contents(core, "b")).toEqual([
        { type: "text", text: "replayed B" },
      ]);
      expect(core.getPendingToolCalls()).toBeNull();
    },
  );

  it.each([
    ["same-gate approval", "gate", true, 2],
    ["same-gate denial", "gate", false, 2],
    ["changed-gate control", "old-gate", true, 1],
  ] as const)(
    "preserves only the matching recorded decision across a replay snapshot: %s",
    async (_scenario, previousGate, approved, expectedAttempts) => {
      let attempts = 0;
      const inputs: unknown[] = [];
      let snapshotApproval: unknown;
      const core = await loaded(
        [
          user("u"),
          assistant(
            "a",
            [
              call("x", {
                approval: {
                  id: previousGate,
                  approved,
                  reason: "recorded decision",
                },
              }),
            ],
            { type: "incomplete", reason: "error", error: "disconnected" },
          ),
        ],
        async (input, subscriber) => {
          attempts++;
          inputs.push(input);
          if (attempts > 1) {
            text(subscriber, "continued", "approval sent");
            emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
            return;
          }

          text(subscriber, "a", "replayed answer");
          emit(subscriber, {
            type: "MESSAGES_SNAPSHOT",
            messages: [
              { id: "u", role: "user", content: "u" },
              {
                id: "a",
                role: "assistant",
                content: "snapshot answer",
                toolCalls: [
                  {
                    id: "x",
                    type: "function",
                    function: { name: "lookup", arguments: "{}" },
                  },
                ],
                metadata: {
                  custom: {
                    agui: {
                      interrupts: [
                        { id: "gate", reason: "tool_call", toolCallId: "x" },
                      ],
                    },
                  },
                },
              },
            ],
          });
          const part = contents(core, "a").find(
            (item) => item.type === "tool-call" && item.toolCallId === "x",
          );
          snapshotApproval =
            part?.type === "tool-call" ? part.approval : undefined;
          emit(subscriber, {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: {
              type: "interrupt",
              interrupts: [
                { id: "gate", reason: "tool_call", toolCallId: "x" },
              ],
            },
          });
        },
      );

      await resume(core, "u");
      if (expectedAttempts === 2) {
        await vi.waitFor(() => expect(attempts).toBe(2));
        expect(snapshotApproval).toMatchObject({
          id: "gate",
          approved,
          reason: "recorded decision",
        });
        expect(inputs[1]).toMatchObject({
          resume: [
            {
              interruptId: "gate",
              status: "resolved",
              payload: { approved, reason: "recorded decision" },
            },
          ],
        });
      } else {
        expect(attempts).toBe(1);
        expect(snapshotApproval).toMatchObject({ id: "gate" });
        expect(snapshotApproval).not.toHaveProperty("approved");
      }
    },
  );
});
