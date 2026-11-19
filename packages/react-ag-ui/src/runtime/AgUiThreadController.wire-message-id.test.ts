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
  it("streams current and retained text without exporting existing messages", async () => {
    let exportCalls = -1;
    const { core } = createController(async (input, subscriber) => {
      reasoning(subscriber);
      const exportRepository = vi.spyOn(core["session"], "export");
      subscriber.onTextMessageStartEvent?.({
        event: { type: "TEXT_MESSAGE_START", messageId: "server-answer" },
      });
      for (let index = 0; index < 3000; index++) {
        subscriber.onTextMessageContentEvent?.({
          event: {
            type: "TEXT_MESSAGE_CONTENT",
            messageId: "server-answer",
            delta: "a",
          },
        });
      }
      subscriber.onTextMessageEndEvent?.({
        event: { type: "TEXT_MESSAGE_END", messageId: "server-answer" },
      });
      text(subscriber, "second-answer", "second");
      subscriber.onTextMessageContentEvent?.({
        event: {
          type: "TEXT_MESSAGE_CONTENT",
          messageId: "server-answer",
          delta: " extended",
        },
      });
      exportCalls = exportRepository.mock.calls.length;
      exportRepository.mockRestore();
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: input.runId },
      });
    });
    core.applyExternalMessages(
      Array.from({ length: 2000 }, (_, index) => ({
        id: `history-${index}`,
        role: "user" as const,
        content: [{ type: "text" as const, text: "history" }],
        attachments: [],
        createdAt: new Date(0),
        metadata: { custom: {} },
      })),
    );
    await core.append(question("history-1999"));
    expect(exportCalls).toBe(0);
    expect(core.getMessages().slice(-2)).toMatchObject([
      {
        content: expect.arrayContaining([
          { type: "text", text: `${"a".repeat(3000)} extended` },
        ]),
        metadata: { custom: { agui: { messageId: "server-answer" } } },
      },
      {
        content: [{ type: "text", text: "second" }],
        metadata: { custom: { agui: { messageId: "second-answer" } } },
      },
    ]);
  });

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

  it("persists the same wire id independently after switching threads", async () => {
    const threads: ExportedMessageRepository[] = [
      { messages: [] },
      { messages: [] },
    ];
    let thread = 0;
    const history: ThreadHistoryAdapter = {
      load: async () => structuredClone(threads[thread]!),
      append: async (item) => {
        threads[thread]!.messages.push(structuredClone(item));
      },
    };
    const { core } = createController(async (input, subscriber) => {
      reasoning(subscriber);
      text(subscriber, "server-answer", `thread ${thread}`);
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: input.runId },
      });
    }, history);

    await core.append(question());
    await vi.waitFor(() => expect(threads[0]!.messages).toHaveLength(2));
    const firstId = core.getMessages().at(-1)!.id;
    core.applyExternalMessages([]);
    core.resetThreadState();
    thread = 1;
    await core.append(question());
    await vi.waitFor(() => expect(threads[1]!.messages).toHaveLength(2));

    const secondId = core.getMessages().at(-1)!.id;
    expect(secondId).not.toBe(firstId);
    expect(threads[0]!.messages[1]!.message).toMatchObject({
      id: firstId,
      content: expect.arrayContaining([{ type: "text", text: "thread 0" }]),
    });
    expect(threads[1]!.messages[1]).toMatchObject({
      parentId: core.getMessages()[0]!.id,
      message: {
        id: secondId,
        content: expect.arrayContaining([{ type: "text", text: "thread 1" }]),
        metadata: { custom: { agui: { messageId: "server-answer" } } },
      },
    });
  });

  it.each(["wire", "local"] as const)(
    "updates the persisted %s id and parents after reloading and recreating an assistant",
    async (identity) => {
      const stored: ExportedMessageRepository = { messages: [] };
      const store = (item: Parameters<ThreadHistoryAdapter["append"]>[0]) => {
        const index = stored.messages.findIndex(
          ({ message }) => message.id === item.message.id,
        );
        if (index === -1) stored.messages.push(structuredClone(item));
        else stored.messages[index] = structuredClone(item);
      };
      const history: ThreadHistoryAdapter = {
        load: async () => structuredClone(stored),
        append: vi.fn(async (item) => {
          store(item);
          stored.headId = item.message.id;
        }),
        update: vi.fn(async (item) => store(item)),
      };
      const { core } = createController(async (input, subscriber) => {
        if (identity === "wire") snapshot(core, subscriber);
        else reasoning(subscriber);
        text(subscriber);
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: input.runId },
        });
      }, history);
      await core.append(question());
      await vi.waitFor(() => expect(stored.messages).toHaveLength(2));
      const persistedId = stored.messages[1]!.message.id;
      if (identity === "wire") expect(persistedId).toBe("server-answer");

      let runs = 0;
      const { core: reloaded } = createController(async (input, subscriber) => {
        reasoning(subscriber);
        text(
          subscriber,
          ++runs === 1 ? "server-answer" : "child-answer",
          "updated",
        );
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: input.runId },
        });
      }, history);
      await reloaded.__internal_load();
      const user = reloaded.getMessages()[0]!;
      reloaded.applyExternalMessages([user]);
      await reloaded.reload(user.id);
      const recreatedId = reloaded.getMessages().at(-1)!.id;
      expect(recreatedId).not.toBe(persistedId);
      await vi.waitFor(() =>
        expect(history.update).toHaveBeenCalledWith(
          expect.objectContaining({
            parentId: user.id,
            message: expect.objectContaining({ id: persistedId }),
          }),
        ),
      );
      await reloaded.append(question(recreatedId));
      await vi.waitFor(() => expect(stored.messages).toHaveLength(4));
      expect(stored.messages[1]!.message).toMatchObject({
        id: persistedId,
        content: expect.arrayContaining([{ type: "text", text: "updated" }]),
      });
      expect(stored.messages[2]!.parentId).toBe(persistedId);
      expect(stored.messages[3]!.parentId).toBe(stored.messages[2]!.message.id);
      expect(reloaded.getMessages()[1]!.id).toBe(recreatedId);

      const { core: restored } = createController(async () => {}, history);
      await restored.__internal_load();
      expect(restored.getMessages().map(({ id }) => id)).toEqual(
        stored.messages.map(({ message }) => message.id),
      );
    },
  );

  it.each(["resolve", "reject"] as const)(
    "isolates a previous thread's pending append when it %ss",
    async (ending) => {
      let finish!: () => void;
      let fail!: (error: Error) => void;
      const pending = new Promise<void>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      });
      let thread = 0;
      const appends = [vi.fn(), vi.fn()];
      const history: ThreadHistoryAdapter = {
        load: async () => ({ messages: [] }),
        append: async (item) => {
          appends[thread]!(item);
          if (thread === 0 && item.message.role === "assistant") await pending;
        },
        update: vi.fn(async () => {}),
      };
      const { core } = createController(async (input, subscriber) => {
        snapshot(core, subscriber, `thread ${thread}`);
        text(subscriber, "server-answer", " updated");
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: input.runId },
        });
      }, history);
      await core.append(question());
      expect(appends[0]).toHaveBeenCalledTimes(2);

      core.applyExternalMessages([]);
      core.resetThreadState();
      thread = 1;
      await core.append(question());
      expect(appends[1]).toHaveBeenCalledTimes(2);
      if (ending === "resolve") {
        finish();
        await pending;
      } else {
        fail(new Error("write failed"));
        await expect(pending).rejects.toThrow("write failed");
      }
      core.applyExternalMessages([core.getMessages()[0]!]);
      await core.reload(core.getMessages()[0]!.id);
      await vi.waitFor(() => expect(history.update).toHaveBeenCalled());
      expect(appends[1]).toHaveBeenCalledTimes(2);
      expect(core.getMessages().at(-1)).toMatchObject({
        id: "server-answer",
        content: [{ type: "text", text: "thread 1 updated" }],
      });
    },
  );

  it("keeps the new placeholder when its wire id equals another row's local id", async () => {
    let firstId!: string;
    let secondId!: string;
    let runs = 0;
    const { core } = createController(async (input, subscriber) => {
      reasoning(subscriber);
      if (++runs === 1) {
        firstId = core.getMessages().at(-1)!.id;
        text(subscriber);
      } else {
        secondId = core.getMessages().at(-1)!.id;
        text(subscriber, firstId, "second answer");
      }
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: input.runId },
      });
    });
    await core.append(question());
    await core.append(question(firstId));
    expect(secondId).not.toBe(firstId);
    expect(
      core.getMessages().filter(({ role }) => role === "assistant"),
    ).toMatchObject([
      {
        id: firstId,
        content: expect.arrayContaining([{ type: "text", text: "answer" }]),
        metadata: { custom: { agui: { messageId: "server-answer" } } },
      },
      {
        id: secondId,
        content: expect.arrayContaining([
          { type: "text", text: "second answer" },
        ]),
        metadata: { custom: { agui: { messageId: firstId } } },
      },
    ]);
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
