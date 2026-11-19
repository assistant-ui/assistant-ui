import { describe, expect, it, vi } from "vitest";
import type { AbstractAgent } from "@ag-ui/client";
import type {
  AppendMessage,
  ExportedMessageRepository,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
} from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import { toAgUiMessages } from "./adapter/conversions";
import type { AgUiSubscriber } from "./adapter/subscriber";
import { makeLogger } from "./logger";

const question = (parentId: string | null = null): AppendMessage => ({
  parentId,
  sourceId: null,
  role: "user",
  content: [{ type: "text", text: "question" }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(0),
  runConfig: {},
});

function createController(
  run: (
    input: { runId: string; messages: unknown[] },
    subscriber: AgUiSubscriber,
  ) => Promise<void>,
  history?: ThreadHistoryAdapter,
) {
  const runAgent = vi.fn(run);
  const core = new AgUiThreadController({
    agent: { runAgent } as unknown as AbstractAgent,
    logger: makeLogger(),
    showThinking: true,
    ...(history ? { history } : {}),
  });
  return { core, runAgent };
}

function reasoning(subscriber: AgUiSubscriber) {
  subscriber.onReasoningMessageStartEvent?.({
    event: { type: "REASONING_MESSAGE_START", messageId: "reasoning" },
  });
  subscriber.onReasoningMessageContentEvent?.({
    event: {
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "reasoning",
      delta: "thinking",
    },
  });
  subscriber.onReasoningMessageEndEvent?.({
    event: { type: "REASONING_MESSAGE_END", messageId: "reasoning" },
  });
}

function text(
  subscriber: AgUiSubscriber,
  id = "server-answer",
  delta = "answer",
) {
  subscriber.onTextMessageStartEvent?.({
    event: { type: "TEXT_MESSAGE_START", messageId: id },
  });
  subscriber.onTextMessageContentEvent?.({
    event: { type: "TEXT_MESSAGE_CONTENT", messageId: id, delta },
  });
  subscriber.onTextMessageEndEvent?.({
    event: { type: "TEXT_MESSAGE_END", messageId: id },
  });
}

function snapshot(
  core: AgUiThreadController,
  subscriber: AgUiSubscriber,
  content = "answer",
) {
  subscriber.onMessagesSnapshotEvent?.({
    event: {
      type: "MESSAGES_SNAPSHOT",
      messages: [
        { id: core.getMessages()[0]!.id, role: "user", content: "question" },
        { id: "server-answer", role: "assistant", content },
      ],
    },
  });
}

describe("AgUiThreadController wire message identity", () => {
  it.each(["text", "tool-call"] as const)(
    "keeps a reasoning-first assistant mounted when a %s event names it",
    async (eventType) => {
      let localId!: string;
      const { core } = createController(async (input, subscriber) => {
        reasoning(subscriber);
        localId = core.getMessages().at(-1)!.id;
        expect(core.getMessages().at(-1)!.metadata.isOptimistic).toBe(true);
        if (eventType === "text") text(subscriber);
        else
          subscriber.onToolCallStartEvent?.({
            event: {
              type: "TOOL_CALL_START",
              toolCallId: "call",
              toolCallName: "lookup",
              parentMessageId: "server-answer",
            },
          });
        expect(core.getMessages().at(-1)).toMatchObject({
          id: localId,
          metadata: { custom: { agui: { messageId: "server-answer" } } },
        });
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: input.runId },
        });
      });
      await core.append(question());
      expect(core.getMessages().at(-1)!.id).toBe(localId);
      expect(core.getMessageRepository().headId).toBe(localId);
      expect(core.getMessages().at(-1)!.metadata.isOptimistic).toBeUndefined();
    },
  );

  it("sends the wire id on the next run while retaining the original row id", async () => {
    let localId!: string;
    const { core, runAgent } = createController(async (input, subscriber) => {
      if (runAgent.mock.calls.length === 1) {
        reasoning(subscriber);
        localId = core.getMessages().at(-1)!.id;
        text(subscriber);
      }
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: input.runId },
      });
    });
    await core.append(question());
    await core.append(question(core.getMessages().at(-1)!.id));
    expect(runAgent.mock.calls[1]![0].messages).toContainEqual(
      expect.objectContaining({
        id: "server-answer",
        role: "assistant",
        content: "answer",
      }),
    );
    expect(
      core.getMessages().find((message) => message.id === localId),
    ).toMatchObject({
      id: localId,
      metadata: { custom: { agui: { messageId: "server-answer" } } },
    });
  });

  it("merges a wire-id snapshot into the live local-id assistant", async () => {
    let localId!: string;
    const { core } = createController(async (input, subscriber) => {
      reasoning(subscriber);
      localId = core.getMessages().at(-1)!.id;
      text(subscriber);
      snapshot(core, subscriber, "answer from snapshot");
      expect(
        core.getMessages().filter((message) => message.role === "assistant"),
      ).toMatchObject([
        {
          id: localId,
          content: expect.arrayContaining([
            { type: "text", text: "answer from snapshot" },
          ]),
          metadata: { custom: { agui: { messageId: "server-answer" } } },
        },
      ]);
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: input.runId },
      });
    });
    await core.append(question());
    expect(core.getMessages().at(-1)!.id).toBe(localId);
    expect(core.getMessageRepository().messages).toHaveLength(2);
  });

  it("resumes a tool result through the local id and sends the wire id", async () => {
    let localId!: string;
    const { core, runAgent } = createController(async (input, subscriber) => {
      if (runAgent.mock.calls.length === 1) {
        reasoning(subscriber);
        localId = core.getMessages().at(-1)!.id;
        subscriber.onToolCallStartEvent?.({
          event: {
            type: "TOOL_CALL_START",
            toolCallId: "call",
            toolCallName: "lookup",
            parentMessageId: "server-answer",
          },
        });
        subscriber.onToolCallArgsEvent?.({
          event: { type: "TOOL_CALL_ARGS", toolCallId: "call", delta: "{}" },
        });
        subscriber.onToolCallEndEvent?.({
          event: { type: "TOOL_CALL_END", toolCallId: "call" },
        });
      }
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: input.runId },
      });
    });
    await core.append(question());
    expect(core.getPendingToolCalls()).toEqual({
      messageId: localId,
      toolCallIds: ["call"],
    });
    core.addToolResult({
      messageId: localId,
      toolCallId: "call",
      toolName: "lookup",
      result: "found",
      isError: false,
    });
    await vi.waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
    expect(runAgent.mock.calls[1]![0].messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "server-answer",
          role: "assistant",
          toolCalls: [expect.objectContaining({ id: "call" })],
        }),
        expect.objectContaining({
          role: "tool",
          toolCallId: "call",
          content: "found",
        }),
      ]),
    );
    expect(
      core.getMessages().find((message) => message.id === localId),
    ).toMatchObject({
      id: localId,
      metadata: { custom: { agui: { messageId: "server-answer" } } },
    });
  });

  it("persists the local id and wire id and dedupes a snapshot after reload", async () => {
    const stored: ExportedMessageRepository = { messages: [] };
    const history: ThreadHistoryAdapter = {
      load: async () => structuredClone(stored),
      append: vi.fn(async (item) => {
        stored.messages.push(structuredClone(item));
        stored.headId = item.message.id;
      }),
    };
    let localId!: string;
    const { core } = createController(async (input, subscriber) => {
      reasoning(subscriber);
      localId = core.getMessages().at(-1)!.id;
      text(subscriber);
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: input.runId },
      });
    }, history);
    await core.__internal_load();
    await core.append(question());
    await vi.waitFor(() => expect(stored.messages).toHaveLength(2));
    expect(stored.messages[1]!.message).toMatchObject({
      id: localId,
      metadata: { custom: { agui: { messageId: "server-answer" } } },
    });

    const { core: reloaded } = createController(async (input, subscriber) => {
      expect(input.messages).toContainEqual(
        expect.objectContaining({ id: "server-answer", role: "assistant" }),
      );
      snapshot(reloaded, subscriber, "reloaded answer");
      text(subscriber, "server-answer", "reloaded answer");
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: input.runId },
      });
    }, history);
    await reloaded.__internal_load();
    expect(reloaded.getMessages().at(-1)!.id).toBe(localId);
    await reloaded.resume({ parentId: localId, sourceId: null, runConfig: {} });
    expect(
      reloaded.getMessages().filter((message) => message.role === "assistant"),
    ).toMatchObject([
      {
        id: localId,
        metadata: { custom: { agui: { messageId: "server-answer" } } },
      },
    ]);
    expect(reloaded.getMessageRepository().messages).toHaveLength(2);
  });

  it("routes late events to a retained local-id assistant after a new frame", async () => {
    let localId!: string;
    const { core } = createController(async (input, subscriber) => {
      reasoning(subscriber);
      localId = core.getMessages().at(-1)!.id;
      text(subscriber);
      text(subscriber, "second-answer", "second");
      subscriber.onTextMessageContentEvent?.({
        event: {
          type: "TEXT_MESSAGE_CONTENT",
          messageId: "server-answer",
          delta: " extended",
        },
      });
      snapshot(core, subscriber, "answer extended");
      expect(
        core.getMessages().find((message) => message.id === localId),
      ).toMatchObject({
        id: localId,
        content: expect.arrayContaining([
          { type: "text", text: "answer extended" },
        ]),
      });
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: input.runId },
      });
    });
    await core.append(question());
    expect(
      core
        .getMessageRepository()
        .messages.filter(({ message }) => message.id === localId),
    ).toHaveLength(1);
  });

  it.each(["id", "wire id"] as const)(
    "drops the placeholder on a collision with an existing %s",
    async (identity) => {
      let placeholderId!: string;
      const { core } = createController(async (input, subscriber) => {
        reasoning(subscriber);
        placeholderId = core.getMessages().at(-1)!.id;
        text(subscriber);
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: input.runId },
        });
      });
      core.applyExternalMessages([
        {
          id: identity === "id" ? "server-answer" : "existing-local",
          role: "assistant",
          content: [{ type: "text", text: "existing" }],
          status: { type: "complete", reason: "unknown" },
          createdAt: new Date(0),
          metadata: {
            custom:
              identity === "id" ? {} : { agui: { messageId: "server-answer" } },
            unstable_state: null,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
          },
        },
      ]);
      await core.append(question(core.getMessages().at(-1)!.id));
      expect(
        core
          .getMessageRepository()
          .messages.some(({ message }) => message.id === placeholderId),
      ).toBe(false);
      expect(
        core
          .getMessageRepository()
          .messages.filter(({ message }) => message.role === "assistant")
          .map(({ message }) => message),
      ).toMatchObject([{ content: [{ type: "text", text: "existing" }] }]);
    },
  );

  it("leaves a directly imported server-id assistant without a wire-id override", async () => {
    const { core } = createController(async (input, subscriber) => {
      snapshot(core, subscriber);
      const importedId = core.getMessages().at(-1)!.id;
      expect(importedId).toBe("server-answer");
      text(subscriber);
      expect(core.getMessages().at(-1)!.id).toBe(importedId);
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: input.runId },
      });
    });
    await core.append(question());
    expect(
      (core.getMessages().at(-1) as ThreadAssistantMessage).metadata.custom
        .agui ?? {},
    ).not.toHaveProperty("messageId");
    expect(toAgUiMessages(core.getMessages())).toContainEqual(
      expect.objectContaining({ id: "server-answer", role: "assistant" }),
    );
  });
});
