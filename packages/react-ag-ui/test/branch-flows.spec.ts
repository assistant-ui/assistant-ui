"use client";

import { describe, expect, it, vi } from "vitest";
import { ExportedMessageRepository } from "@assistant-ui/core";
import type {
  AppendMessage,
  ChatModelRunResult,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import type { HttpAgent } from "@ag-ui/client";
import { AgUiThreadRuntimeCore } from "../src/runtime/AgUiThreadRuntimeCore";
import { makeLogger } from "../src/runtime/logger";

const createAppendMessage = (
  overrides: Partial<AppendMessage> = {},
): AppendMessage => ({
  role: "user",
  content: [{ type: "text" as const, text: "hi" }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(),
  parentId: overrides.parentId ?? null,
  sourceId: overrides.sourceId ?? null,
  runConfig: overrides.runConfig ?? {},
  startRun: overrides.startRun ?? true,
});

const noopLogger = makeLogger();

const createCore = (
  agent: HttpAgent,
  hooks: { history?: ThreadHistoryAdapter } = {},
) =>
  new AgUiThreadRuntimeCore({
    agent,
    logger: noopLogger,
    showThinking: true,
    ...(hooks.history ? { history: hooks.history } : {}),
    notifyUpdate: () => {},
  });

const finalizingAgent = (text: string) =>
  ({
    runAgent: vi.fn(async (_input, subscriber) => {
      subscriber.onTextMessageContentEvent?.({
        event: { type: "TEXT_MESSAGE_CONTENT", delta: text },
      });
      subscriber.onRunFinalized?.();
    }),
  }) as unknown as HttpAgent;

const emitAssistantText = (
  subscriber: any,
  messageId: string,
  delta: string,
) => {
  subscriber.onTextMessageStartEvent?.({
    event: { type: "TEXT_MESSAGE_START", messageId },
  });
  subscriber.onTextMessageContentEvent?.({
    event: { type: "TEXT_MESSAGE_CONTENT", messageId, delta },
  });
  subscriber.onTextMessageEndEvent?.({
    event: { type: "TEXT_MESSAGE_END", messageId },
  });
};

describe("AgUiThreadRuntimeCore branch flows", () => {
  it("append: records the visible pair and persists user then assistant with correct parents", async () => {
    const agent = finalizingAgent("Hello");
    const append = vi.fn().mockResolvedValue(undefined);
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
    };

    const core = createCore(agent, { history: historyAdapter });
    await core.append(createAppendMessage());

    const messages = core.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe("user");
    expect(messages[1]!.role).toBe("assistant");

    const userId = messages[0]!.id;
    const assistantId = messages[1]!.id;

    expect(append.mock.calls[0]?.[0]).toMatchObject({
      parentId: null,
      message: { id: userId, role: "user" },
    });
    expect(append.mock.calls[1]?.[0]).toMatchObject({
      parentId: userId,
      message: { id: assistantId, role: "assistant" },
    });
  });

  it("append at the root again replaces the visible pair with a fresh sibling turn", async () => {
    let callCount = 0;
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        callCount++;
        subscriber.onTextMessageContentEvent?.({
          event: {
            type: "TEXT_MESSAGE_CONTENT",
            delta: callCount === 1 ? "first reply" : "second reply",
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const append = vi.fn().mockResolvedValue(undefined);
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
    };
    const core = createCore(agent, { history: historyAdapter });

    await core.append(createAppendMessage());
    const firstUserId = core.getMessages()[0]!.id;
    const firstAssistantId = core.getMessages()[1]!.id;

    append.mockClear();
    await core.append(createAppendMessage({ parentId: null }));

    const messages = core.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages.map((m) => m.id)).not.toContain(firstUserId);
    expect(messages.map((m) => m.id)).not.toContain(firstAssistantId);
    expect(messages[0]!.role).toBe("user");
    expect(messages[1]!.role).toBe("assistant");

    const newUserId = messages[0]!.id;
    expect(append.mock.calls[0]?.[0]).toMatchObject({
      parentId: null,
      message: { id: newUserId, role: "user" },
    });
  });

  it("reload: regenerates the assistant reply and persists it under the same parent", async () => {
    let callCount = 0;
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        callCount++;
        subscriber.onTextMessageContentEvent?.({
          event: {
            type: "TEXT_MESSAGE_CONTENT",
            delta: callCount === 1 ? "first" : "second",
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const append = vi.fn().mockResolvedValue(undefined);
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
    };
    const core = createCore(agent, { history: historyAdapter });

    await core.append(createAppendMessage());
    const userId = core.getMessages()[0]!.id;

    append.mockClear();
    await core.reload(userId);

    const messages = core.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0]!.id).toBe(userId);
    const newAssistant = messages[1] as ThreadAssistantMessage;
    expect(newAssistant.content[0]).toMatchObject({
      type: "text",
      text: "second",
    });

    expect(append.mock.calls.at(-1)?.[0]).toMatchObject({
      parentId: userId,
      message: { id: newAssistant.id, role: "assistant" },
    });
  });

  it("reload: preserves branch parents and snapshot-delivered assistant ids", async () => {
    let runCount = 0;
    let userId = "";
    let previousAssistantId = "";
    const regeneratedAssistantId = "assistant-regenerated";
    const snapshotAssistantId = "assistant-from-snapshot";
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        runCount++;
        if (runCount === 1) {
          subscriber.onTextMessageContentEvent?.({
            event: { type: "TEXT_MESSAGE_CONTENT", delta: "first" },
          });
          subscriber.onRunFinalized?.();
          return;
        }

        subscriber.onMessagesSnapshotEvent?.({
          event: {
            type: "MESSAGES_SNAPSHOT",
            messages: [
              { id: userId, role: "user", content: "hi" },
              {
                id: runCount === 2 ? previousAssistantId : snapshotAssistantId,
                role: "assistant",
                content: runCount === 2 ? "first" : "snapshot",
              },
            ],
          },
        });
        emitAssistantText(
          subscriber,
          runCount === 2 ? regeneratedAssistantId : snapshotAssistantId,
          runCount === 2 ? "second" : "continued",
        );
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;
    const append = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
      update,
    };
    const core = createCore(agent, { history: historyAdapter });

    await core.append(createAppendMessage());
    const initialMessages = core.getMessages();
    userId = initialMessages[0]!.id;
    previousAssistantId = initialMessages[1]!.id;
    append.mockClear();

    await core.reload(userId);

    expect
      .soft(core.getMessages().map(({ id }) => id))
      .toEqual([userId, regeneratedAssistantId]);
    expect.soft(append.mock.calls.at(-1)?.[0]).toMatchObject({
      parentId: userId,
      message: { id: regeneratedAssistantId, role: "assistant" },
    });

    await core.reload(userId);

    const messages = core.getMessages();
    expect(messages.map(({ id }) => id)).toEqual([userId, snapshotAssistantId]);
    expect((messages[1] as ThreadAssistantMessage).content[0]).toMatchObject({
      type: "text",
      text: "continued",
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      parentId: userId,
      message: {
        id: snapshotAssistantId,
        role: "assistant",
        content: [{ type: "text", text: "continued" }],
      },
    });
  });

  it("reload: follows a snapshot head introduced during a branch run", async () => {
    let runCount = 0;
    let userId = "";
    const snapshotStepId = "assistant-snapshot-step";
    const followupAssistantId = "assistant-followup";
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        runCount++;
        if (runCount === 1) {
          subscriber.onTextMessageContentEvent?.({
            event: { type: "TEXT_MESSAGE_CONTENT", delta: "first" },
          });
          subscriber.onRunFinalized?.();
          return;
        }

        subscriber.onMessagesSnapshotEvent?.({
          event: {
            type: "MESSAGES_SNAPSHOT",
            messages: [
              { id: userId, role: "user", content: "hi" },
              {
                id: snapshotStepId,
                role: "assistant",
                content: "snapshot step",
              },
            ],
          },
        });
        emitAssistantText(subscriber, followupAssistantId, "continued");
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;
    const core = createCore(agent);

    await core.append(createAppendMessage());
    userId = core.getMessages()[0]!.id;

    await core.reload(userId);

    expect(core.getMessages().map(({ id }) => id)).toEqual([
      userId,
      snapshotStepId,
      followupAssistantId,
    ]);
    expect(
      core
        .getMessageRepository()
        .messages.find(({ message }) => message.id === followupAssistantId),
    ).toMatchObject({ parentId: snapshotStepId });
  });

  it("updates history when a snapshot refreshes the active server assistant", async () => {
    const serverAssistantId = "assistant-server";
    const update = vi.fn().mockResolvedValue(undefined);
    const append = vi.fn().mockResolvedValue(undefined);
    const agent = {
      runAgent: vi.fn(async (input: any, subscriber: any) => {
        const userId = input.messages.find(
          ({ role }: { role: string }) => role === "user",
        ).id;
        subscriber.onTextMessageStartEvent?.({
          event: {
            type: "TEXT_MESSAGE_START",
            messageId: serverAssistantId,
          },
        });
        subscriber.onTextMessageContentEvent?.({
          event: {
            type: "TEXT_MESSAGE_CONTENT",
            messageId: serverAssistantId,
            delta: "before",
          },
        });
        subscriber.onMessagesSnapshotEvent?.({
          event: {
            type: "MESSAGES_SNAPSHOT",
            messages: [
              { id: userId, role: "user", content: "hi" },
              {
                id: serverAssistantId,
                role: "assistant",
                content: "snapshot",
              },
            ],
          },
        });
        subscriber.onTextMessageContentEvent?.({
          event: {
            type: "TEXT_MESSAGE_CONTENT",
            messageId: serverAssistantId,
            delta: " after",
          },
        });
        subscriber.onTextMessageEndEvent?.({
          event: {
            type: "TEXT_MESSAGE_END",
            messageId: serverAssistantId,
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
      update,
    };
    const core = createCore(agent, { history: historyAdapter });

    await core.append(createAppendMessage());

    const messages = core.getMessages();
    const assistant = messages[1] as ThreadAssistantMessage;
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      parentId: messages[0]!.id,
      message: { id: serverAssistantId, role: "assistant" },
    });
    expect(update.mock.calls[0]?.[0].message.content).toEqual(
      assistant.content,
    );
    expect(
      append.mock.calls.some(([item]) => item.message.id === serverAssistantId),
    ).toBe(false);
  });

  it("does not rewrite a previous assistant when regeneration reuses its id", async () => {
    let runCount = 0;
    let userId = "";
    let previousAssistantId = "";
    const update = vi.fn().mockResolvedValue(undefined);
    const append = vi.fn().mockResolvedValue(undefined);
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        runCount++;
        if (runCount === 1) {
          subscriber.onTextMessageContentEvent?.({
            event: { type: "TEXT_MESSAGE_CONTENT", delta: "first" },
          });
          subscriber.onRunFinalized?.();
          return;
        }

        subscriber.onMessagesSnapshotEvent?.({
          event: {
            type: "MESSAGES_SNAPSHOT",
            messages: [
              { id: userId, role: "user", content: "hi" },
              {
                id: previousAssistantId,
                role: "assistant",
                content: "first",
              },
            ],
          },
        });
        emitAssistantText(subscriber, previousAssistantId, "replacement");
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
      update,
    };
    const core = createCore(agent, { history: historyAdapter });

    await core.append(createAppendMessage());
    const initialMessages = core.getMessages();
    userId = initialMessages[0]!.id;
    previousAssistantId = initialMessages[1]!.id;
    append.mockClear();

    await core.reload(userId);

    const messages = core.getMessages();
    expect(messages.map(({ id }) => id)).toEqual([userId, previousAssistantId]);
    expect((messages[1] as ThreadAssistantMessage).content).toEqual([
      { type: "text", text: "first" },
    ]);
    expect(update).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
  });

  it("persists snapshot assistants with append-only history", async () => {
    const serverAssistantId = "assistant-server";
    const append = vi.fn().mockResolvedValue(undefined);
    const agent = {
      runAgent: vi.fn(async (input: any, subscriber: any) => {
        const userId = input.messages.find(
          ({ role }: { role: string }) => role === "user",
        ).id;
        subscriber.onMessagesSnapshotEvent?.({
          event: {
            type: "MESSAGES_SNAPSHOT",
            messages: [
              { id: userId, role: "user", content: "hi" },
              {
                id: serverAssistantId,
                role: "assistant",
                content: "snapshot",
              },
            ],
          },
        });
        emitAssistantText(subscriber, serverAssistantId, " after");
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
    };
    const core = createCore(agent, { history: historyAdapter });

    await core.append(createAppendMessage());

    expect(
      append.mock.calls.some(([item]) => item.message.id === serverAssistantId),
    ).toBe(true);
  });

  it("retains persisted assistants after a snapshot clears the visible path", async () => {
    const serverAssistantId = "assistant-server";
    let runCount = 0;
    const append = vi.fn().mockResolvedValue(undefined);
    const agent = {
      runAgent: vi.fn(async (_input: any, subscriber: any) => {
        runCount++;
        emitAssistantText(
          subscriber,
          serverAssistantId,
          runCount === 1 ? "first" : "second",
        );
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
    };
    const core = createCore(agent, { history: historyAdapter });

    await core.append(createAppendMessage());
    core.applyExternalMessages([]);
    await core.reload(null);

    expect(
      append.mock.calls.filter(
        ([item]) => item.message.id === serverAssistantId,
      ),
    ).toHaveLength(1);
  });

  it("retries a failed append on the next persistable transition", async () => {
    const serverAssistantId = "assistant-server";
    let assistantAppends = 0;
    const append = vi.fn().mockImplementation(({ message }: any) => {
      if (message.id === serverAssistantId && ++assistantAppends === 1) {
        return Promise.reject(new Error("write failed"));
      }
      return Promise.resolve(undefined);
    });
    const agent = {
      runAgent: vi.fn(async (_input: any, subscriber: any) => {
        emitAssistantText(subscriber, serverAssistantId, "answer");
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
    };
    const core = createCore(agent, { history: historyAdapter });

    await core.append(createAppendMessage());
    await vi.waitFor(() => expect(assistantAppends).toBe(1));

    core.applyExternalMessages([]);
    await core.reload(null);
    await vi.waitFor(() => expect(assistantAppends).toBe(2));

    core.applyExternalMessages([]);
    await core.reload(null);
    expect(assistantAppends).toBe(2);
  });

  it("does not start a second append while one is in flight", async () => {
    const serverAssistantId = "assistant-server";
    let resolveAppend = () => {};
    const gate = new Promise<void>((resolve) => {
      resolveAppend = resolve;
    });
    const append = vi.fn().mockImplementation(({ message }: any) => {
      if (message.id === serverAssistantId) return gate;
      return Promise.resolve(undefined);
    });
    const agent = {
      runAgent: vi.fn(async (_input: any, subscriber: any) => {
        emitAssistantText(subscriber, serverAssistantId, "answer");
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
    };
    const core = createCore(agent, { history: historyAdapter });

    const assistantAppends = () =>
      append.mock.calls.filter(
        ([item]: any[]) => item.message.id === serverAssistantId,
      ).length;

    await core.append(createAppendMessage());
    expect(assistantAppends()).toBe(1);

    core.applyExternalMessages([]);
    await core.reload(null);
    expect(assistantAppends()).toBe(1);

    resolveAppend();
    core.applyExternalMessages([]);
    await core.reload(null);
    expect(assistantAppends()).toBe(1);
  });

  it("retries a failed update and keeps routing persisted ids to update", async () => {
    const serverAssistantId = "assistant-server";
    let updates = 0;
    const update = vi.fn().mockImplementation(() => {
      updates++;
      if (updates === 1) return Promise.reject(new Error("write failed"));
      return Promise.resolve(undefined);
    });
    const append = vi.fn().mockResolvedValue(undefined);
    const agent = {
      runAgent: vi.fn(async (input: any, subscriber: any) => {
        const userId = input.messages.find(
          ({ role }: { role: string }) => role === "user",
        )?.id;
        subscriber.onMessagesSnapshotEvent?.({
          event: {
            type: "MESSAGES_SNAPSHOT",
            messages: [
              ...(userId ? [{ id: userId, role: "user", content: "hi" }] : []),
              {
                id: serverAssistantId,
                role: "assistant",
                content: "snapshot",
              },
            ],
          },
        });
        emitAssistantText(subscriber, serverAssistantId, " after");
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
      update,
    };
    const core = createCore(agent, { history: historyAdapter });

    await core.append(createAppendMessage());
    await vi.waitFor(() => expect(updates).toBe(1));

    core.applyExternalMessages([]);
    await core.reload(null);
    await vi.waitFor(() => expect(updates).toBe(2));

    expect(
      append.mock.calls.some(([item]) => item.message.id === serverAssistantId),
    ).toBe(false);
  });

  it("keeps a recreated stable assistant after switching branches", async () => {
    const serverAssistantId = "server-assistant";
    let core: AgUiThreadRuntimeCore;
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onTextMessageStartEvent?.({
          event: {
            type: "TEXT_MESSAGE_START",
            messageId: serverAssistantId,
          },
        });
        subscriber.onTextMessageContentEvent?.({
          event: {
            type: "TEXT_MESSAGE_CONTENT",
            messageId: serverAssistantId,
            delta: "Hello",
          },
        });

        const userMessage = core
          .getMessages()
          .find(({ role }) => role === "user");
        core.applyExternalMessages([userMessage!]);

        subscriber.onTextMessageContentEvent?.({
          event: {
            type: "TEXT_MESSAGE_CONTENT",
            messageId: serverAssistantId,
            delta: " world",
          },
        });
        subscriber.onTextMessageEndEvent?.({
          event: {
            type: "TEXT_MESSAGE_END",
            messageId: serverAssistantId,
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;
    core = createCore(agent);

    await core.append(createAppendMessage());

    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.id).toBe(serverAssistantId);
    expect(assistant.metadata.isOptimistic).not.toBe(true);
    await core.append(createAppendMessage({ parentId: null, startRun: false }));
    expect(
      core.getMessageRepository().messages.map(({ message }) => message.id),
    ).toContain(serverAssistantId);
  });

  it("reload: runAgent input reflects only the visible message path", async () => {
    const runInputs: any[] = [];
    let callCount = 0;
    const agent = {
      runAgent: vi.fn(async (input: any, subscriber: any) => {
        runInputs.push(input);
        callCount++;
        subscriber.onTextMessageContentEvent?.({
          event: {
            type: "TEXT_MESSAGE_CONTENT",
            delta: callCount === 1 ? "first" : "second",
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());
    const userId = core.getMessages()[0]!.id;

    await core.reload(userId);

    const secondInput = runInputs[1];
    expect(secondInput.messages).toHaveLength(1);
    expect(secondInput.messages[0]).toMatchObject({ id: userId, role: "user" });
  });

  it("append after a branchable load persists the new turn under the visible head", async () => {
    const agent = {
      runAgent: vi.fn(async (_input, subscriber) => {
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const repository = ExportedMessageRepository.fromBranchableArray(
      [
        {
          message: {
            id: "u1",
            role: "user",
            content: [{ type: "text", text: "Hello" }],
          },
          parentId: null,
        },
        {
          message: {
            id: "a1",
            role: "assistant",
            content: [{ type: "text", text: "Option A" }],
          },
          parentId: "u1",
        },
        {
          message: {
            id: "a2",
            role: "assistant",
            content: [{ type: "text", text: "Option B" }],
          },
          parentId: "u1",
        },
      ],
      { headId: "a2" },
    );

    const append = vi.fn().mockResolvedValue(undefined);
    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue(repository),
      append,
    };

    const core = createCore(agent, { history: historyAdapter });
    await core.__internal_load();

    await core.append(createAppendMessage({ parentId: "a2" }));

    const messages = core.getMessages();
    expect(messages[0]!.id).toBe("u1");
    expect(messages[1]!.id).toBe("a2");
    expect(messages[2]!.role).toBe("user");

    const newUserId = messages[2]!.id;
    expect(append.mock.calls[0]?.[0]).toMatchObject({
      parentId: "a2",
      message: { id: newUserId, role: "user" },
    });
  });

  it("MESSAGES_SNAPSHOT echoing the appended user id refreshes the visible path with the server assistant", async () => {
    let echoedUserId = "";
    const agent = {
      runAgent: vi.fn(async (input: any, subscriber: any) => {
        echoedUserId = input.messages.find(
          (m: { role: string }) => m.role === "user",
        ).id;
        subscriber.onMessagesSnapshotEvent?.({
          event: {
            type: "MESSAGES_SNAPSHOT",
            messages: [
              { id: echoedUserId, role: "user", content: "hi" },
              {
                id: "server-assistant-1",
                role: "assistant",
                content: "hello there",
              },
            ],
          },
        });
        subscriber.onRunFinalized?.();
      }),
    } as unknown as HttpAgent;

    const core = createCore(agent);
    await core.append(createAppendMessage());

    const messages = core.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0]!.id).toBe(echoedUserId);
    expect(messages[0]!.role).toBe("user");
    const assistant = messages[1] as ThreadAssistantMessage;
    expect(assistant.id).toBe("server-assistant-1");
    expect(assistant.content[0]).toMatchObject({
      type: "text",
      text: "hello there",
    });
  });

  it("resume after loading a linear two-message history replays without re-running the agent", async () => {
    const runAgent = vi.fn(async (_input, subscriber) => {
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent } as unknown as HttpAgent;

    const userMessage: ThreadMessage = {
      id: "msg-1",
      role: "user",
      createdAt: new Date(),
      content: [{ type: "text", text: "Hello" }],
      metadata: { custom: {} },
    };
    const assistantMessage: ThreadAssistantMessage = {
      id: "msg-2",
      role: "assistant",
      createdAt: new Date(),
      status: { type: "complete", reason: "unknown" },
      content: [{ type: "text", text: "partial" }],
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };

    const resume = vi.fn(async function* (): AsyncGenerator<
      ChatModelRunResult,
      void,
      unknown
    > {
      yield { content: [{ type: "text", text: "resumed content" }] };
      yield { status: { type: "complete", reason: "unknown" } };
    });

    const historyAdapter: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({
        headId: "msg-2",
        messages: [
          { message: userMessage, parentId: null },
          { message: assistantMessage, parentId: "msg-1" },
        ],
        unstable_resume: true,
      }),
      resume,
      append: vi.fn().mockResolvedValue(undefined),
    };

    const core = createCore(agent, { history: historyAdapter });
    await core.__internal_load();

    expect(runAgent).not.toHaveBeenCalled();
    expect(resume).toHaveBeenCalledTimes(1);

    const messages = core.getMessages();
    const tail = messages.at(-1) as ThreadAssistantMessage;
    expect(messages.map((m) => m.id).slice(0, 2)).toEqual(["msg-1", "msg-2"]);
    expect(tail.content.at(-1)).toMatchObject({
      type: "text",
      text: "resumed content",
    });
    expect(tail.metadata.isOptimistic).toBeUndefined();
    expect(tail.id.startsWith("__optimistic__")).toBe(false);
  });
});
