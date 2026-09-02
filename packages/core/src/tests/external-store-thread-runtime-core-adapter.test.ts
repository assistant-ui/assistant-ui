import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ExternalStoreThreadRuntimeCore,
  hasUpcomingMessage,
} from "../runtimes/external-store/external-store-thread-runtime-core";
import type { ExternalStoreAdapter } from "../runtimes/external-store/external-store-adapter";
import type { ModelContextProvider } from "../model-context/types";
import type { AppendMessage, ThreadMessage } from "../types/message";
import { createMessageQueue } from "../runtime/queue/message-queue";
import { getThreadMessageText } from "../utils/text";
import { invalidateThreadRuntime } from "../runtime/utils/thread-runtime-lifecycle";

const createContextProvider = (): ModelContextProvider => ({
  getModelContext: () => ({}),
});

const createUserMessage = (id: string, text = "Hello"): ThreadMessage =>
  ({
    id,
    role: "user" as const,
    createdAt: new Date(),
    content: [{ type: "text" as const, text }],
    attachments: [],
    metadata: {
      custom: {},
    },
  }) as ThreadMessage;

const createAssistantMessage = (id: string, text = "Hi there"): ThreadMessage =>
  ({
    id,
    role: "assistant" as const,
    createdAt: new Date(),
    content: [{ type: "text" as const, text }],
    status: { type: "complete" as const, reason: "stop" as const },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as ThreadMessage;

const createBaseAdapter = (
  overrides: Partial<ExternalStoreAdapter<ThreadMessage>> = {},
): ExternalStoreAdapter<ThreadMessage> => ({
  messages: [],
  onNew: vi.fn(async () => {}),
  ...overrides,
});

const captureUnhandledRejections = async (
  run: () => Promise<void>,
): Promise<unknown[]> => {
  const rejections: unknown[] = [];
  const onUnhandledRejection = (reason: unknown) => {
    rejections.push(reason);
  };
  process.on("unhandledRejection", onUnhandledRejection);
  try {
    await run();
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    process.removeListener("unhandledRejection", onUnhandledRejection);
  }
  return rejections;
};

describe("ExternalStoreThreadRuntimeCore adapter contract", () => {
  let contextProvider: ModelContextProvider;

  beforeEach(() => {
    contextProvider = createContextProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hasUpcomingMessage is true only while running without an assistant tail", () => {
    expect(hasUpcomingMessage(true, [createUserMessage("u1")])).toBe(true);
    expect(hasUpcomingMessage(true, [createAssistantMessage("a1")])).toBe(
      false,
    );
    expect(hasUpcomingMessage(false, [createUserMessage("u1")])).toBe(false);
    expect(hasUpcomingMessage(true, [])).toBe(true);
  });

  it("derives capabilities from adapter handler presence", () => {
    const bare = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      createBaseAdapter(),
    );
    expect(bare.capabilities.edit).toBe(false);
    expect(bare.capabilities.reload).toBe(false);
    expect(bare.capabilities.cancel).toBe(false);
    expect(bare.capabilities.switchToBranch).toBe(false);
    expect(bare.capabilities.unstable_copy).toBe(true);

    const full = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      createBaseAdapter({
        onEdit: vi.fn(async () => {}),
        onReload: vi.fn(async () => {}),
        onCancel: vi.fn(async () => {}),
        setMessages: vi.fn(),
        unstable_capabilities: { copy: false },
      }),
    );
    expect(full.capabilities.edit).toBe(true);
    expect(full.capabilities.reload).toBe(true);
    expect(full.capabilities.cancel).toBe(true);
    expect(full.capabilities.switchToBranch).toBe(true);
    expect(full.capabilities.unstable_copy).toBe(false);
  });

  describe("append", () => {
    it("calls onNew when parentId matches last message id", async () => {
      const onNew = vi.fn(async () => {});
      const messages = [createUserMessage("u1"), createAssistantMessage("a1")];
      const adapter = createBaseAdapter({ messages, onNew });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      const appendMessage: AppendMessage = {
        role: "user",
        content: [{ type: "text", text: "Follow up" }],
        attachments: [],
        createdAt: new Date(),
        parentId: "a1",
        sourceId: null,
        runConfig: undefined,
        metadata: { custom: {} },
      } as AppendMessage;

      await core.append(appendMessage);
      expect(onNew).toHaveBeenCalledWith(appendMessage);
    });

    it("calls onEdit when parentId does not match last message id", async () => {
      const onEdit = vi.fn(async () => {});
      const onNew = vi.fn(async () => {});
      const messages = [createUserMessage("u1"), createAssistantMessage("a1")];
      const adapter = createBaseAdapter({ messages, onNew, onEdit });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      const appendMessage: AppendMessage = {
        role: "user",
        content: [{ type: "text", text: "Edit" }],
        attachments: [],
        createdAt: new Date(),
        parentId: "u1",
        sourceId: null,
        runConfig: undefined,
        metadata: { custom: {} },
      } as AppendMessage;

      await core.append(appendMessage);
      expect(onEdit).toHaveBeenCalledWith(appendMessage);
      expect(onNew).not.toHaveBeenCalled();
    });

    it("throws when adapter has no onEdit and parentId differs from head", async () => {
      const messages = [createUserMessage("u1"), createAssistantMessage("a1")];
      const adapter = createBaseAdapter({ messages });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      const appendMessage: AppendMessage = {
        role: "user",
        content: [{ type: "text", text: "Edit" }],
        attachments: [],
        createdAt: new Date(),
        parentId: "u1",
        sourceId: null,
        runConfig: undefined,
        metadata: { custom: {} },
      } as AppendMessage;

      await expect(core.append(appendMessage)).rejects.toThrow(
        "Runtime does not support editing messages.",
      );
    });
  });

  describe("startRun", () => {
    it("delegates to onReload", async () => {
      const onReload = vi.fn(async () => {});
      const adapter = createBaseAdapter({ onReload });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      await core.startRun({ parentId: "msg-1", sourceId: null, runConfig: {} });
      expect(onReload).toHaveBeenCalledWith("msg-1", {
        parentId: "msg-1",
        sourceId: null,
        runConfig: {},
      });
    });

    it("throws when adapter has no onReload", async () => {
      const adapter = createBaseAdapter();
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      await expect(
        core.startRun({ parentId: "msg-1", sourceId: null, runConfig: {} }),
      ).rejects.toThrow("Runtime does not support reloading messages.");
    });
  });

  describe("cancelRun", () => {
    it("delegates to onCancel", () => {
      const onCancel = vi.fn();
      const messages = [createUserMessage("u1"), createAssistantMessage("a1")];
      const adapter = createBaseAdapter({
        messages,
        onCancel,
        setMessages: vi.fn(),
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      core.cancelRun();
      expect(onCancel).toHaveBeenCalled();
    });

    it("throws when adapter has no onCancel", () => {
      const adapter = createBaseAdapter();
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      expect(() => core.cancelRun()).toThrow(
        "Runtime does not support cancelling runs.",
      );
    });

    it("keeps a partially-streamed optimistic message on cancel", async () => {
      const optimisticAssistant = {
        ...createAssistantMessage("server-msg", "partial answer"),
        status: { type: "running" as const },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
          isOptimistic: true,
        },
      } as ThreadMessage;
      const setMessages = vi.fn();
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1"), optimisticAssistant],
        isRunning: true,
        onCancel: vi.fn(),
        setMessages,
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      core.cancelRun();

      await new Promise((resolve) => setTimeout(resolve, 0));
      const lastCall = setMessages.mock.lastCall?.[0] as ThreadMessage[];
      expect(lastCall.map((m) => m.id)).toContain("server-msg");
    });

    it("does not revert a store update that lands before the resync flushes", async () => {
      const optimisticAssistant = {
        ...createAssistantMessage("server-msg", "partial answer"),
        status: { type: "running" as const },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
          isOptimistic: true,
        },
      } as ThreadMessage;
      const setMessages = vi.fn();
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1"), optimisticAssistant],
        isRunning: true,
        onCancel: vi.fn(),
        setMessages,
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      core.cancelRun();

      // The store settles the cancelled turn and re-supplies it in the same
      // tick as the cancel.
      core.__internal_setAdapter(
        createBaseAdapter({
          messages: [
            createUserMessage("u1"),
            createAssistantMessage("server-msg", "partial answer (stopped)"),
          ],
          isRunning: false,
          onCancel: vi.fn(),
          setMessages,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(setMessages).toHaveBeenCalled();
      const lastCall = setMessages.mock.lastCall?.[0] as ThreadMessage[];
      const texts = lastCall.map(getThreadMessageText);
      expect(texts).toContain("partial answer (stopped)");
      expect(texts).not.toContain("partial answer");
    });

    it("does not resync after the runtime is invalidated", async () => {
      const setMessages = vi.fn();
      const core = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        createBaseAdapter({
          messages: [createAssistantMessage("a1", "partial answer")],
          isRunning: true,
          onCancel: vi.fn(),
          setMessages,
        }),
      );

      core.cancelRun();
      invalidateThreadRuntime(core);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(setMessages).not.toHaveBeenCalled();
    });

    it("re-applies the user leaf rollback when the store updates before the flush", async () => {
      const messages = [createUserMessage("u1", "cancel me")];
      const setMessages = vi.fn();
      const adapter = createBaseAdapter({
        messages,
        isRunning: true,
        onCancel: vi.fn(),
        setMessages,
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      core.cancelRun();

      // The host flips isRunning after onCancel; the store still holds the
      // rolled-back message because only the deferred resync removes it.
      core.__internal_setAdapter(
        createBaseAdapter({
          messages,
          isRunning: false,
          onCancel: vi.fn(),
          setMessages,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(core.composer.text).toBe("cancel me");
      expect(setMessages).toHaveBeenCalled();
      const lastCall = setMessages.mock.lastCall?.[0] as ThreadMessage[];
      expect(lastCall.map((m) => m.id)).not.toContain("u1");
      expect(core.export().messages.map((m) => m.message.id)).not.toContain(
        "u1",
      );
    });

    it("keeps a rolled-back user leaf the store answered in the gap and takes the draft back", async () => {
      const setMessages = vi.fn();
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1", "cancel me")],
        isRunning: true,
        onCancel: vi.fn(),
        setMessages,
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      core.cancelRun();
      expect(core.composer.text).toBe("cancel me");

      core.__internal_setAdapter(
        createBaseAdapter({
          messages: [
            createUserMessage("u1", "cancel me"),
            createAssistantMessage("a1", "answered anyway"),
          ],
          isRunning: false,
          onCancel: vi.fn(),
          setMessages,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(core.composer.text).toBe("");
      const lastCall = setMessages.mock.lastCall?.[0] as ThreadMessage[];
      expect(lastCall.map((m) => m.id)).toEqual(["u1", "a1"]);
    });

    it("leaves an edited draft alone when the store answered in the gap", async () => {
      const setMessages = vi.fn();
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1", "cancel me")],
        isRunning: true,
        onCancel: vi.fn(),
        setMessages,
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      core.cancelRun();
      core.composer.setText("edited");

      core.__internal_setAdapter(
        createBaseAdapter({
          messages: [
            createUserMessage("u1", "cancel me"),
            createAssistantMessage("a1", "answered anyway"),
          ],
          isRunning: false,
          onCancel: vi.fn(),
          setMessages,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(core.composer.text).toBe("edited");
      const lastCall = setMessages.mock.lastCall?.[0] as ThreadMessage[];
      expect(lastCall.map((m) => m.id)).toEqual(["u1", "a1"]);
    });

    it("drops a placeholder regenerated between cancel and flush", async () => {
      const setMessages = vi.fn();
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1", "cancel me")],
        isRunning: true,
        onCancel: vi.fn(),
        setMessages,
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      core.cancelRun();

      core.__internal_setAdapter(
        createBaseAdapter({
          messages: [createUserMessage("u1", "cancel me")],
          isRunning: true,
          onCancel: vi.fn(),
          setMessages,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(core.composer.text).toBe("cancel me");
      const lastCall = setMessages.mock.lastCall?.[0] as ThreadMessage[];
      expect(lastCall).toEqual([]);
    });

    it("evicts an empty optimistic head on cancel", async () => {
      const optimisticAssistant = {
        ...createAssistantMessage("server-msg", ""),
        content: [],
        status: { type: "running" as const },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
          isOptimistic: true,
        },
      } as ThreadMessage;
      const setMessages = vi.fn();
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1"), optimisticAssistant],
        isRunning: true,
        onCancel: vi.fn(),
        setMessages,
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      core.cancelRun();

      await new Promise((resolve) => setTimeout(resolve, 0));
      const lastCall = setMessages.mock.lastCall?.[0] as ThreadMessage[];
      expect(lastCall.map((m) => m.id)).not.toContain("server-msg");
    });

    it("pauses a queue instead of dispatching the next message", async () => {
      const dispatched: string[] = [];
      const queue = createMessageQueue({
        run: (message) => {
          dispatched.push(getThreadMessageText(message));
        },
      });
      const adapter = createBaseAdapter({
        isRunning: true,
        onCancel: vi.fn(),
        queue: queue.adapter,
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      const appendAtTail = (text: string) =>
        core.append({
          role: "user",
          content: [{ type: "text", text }],
          attachments: [],
          createdAt: new Date(),
          parentId: core.messages.at(-1)?.id ?? null,
          sourceId: null,
          runConfig: undefined,
          metadata: { custom: {} },
        } as AppendMessage);

      await appendAtTail("first");
      await appendAtTail("queued");

      core.cancelRun();
      // the aborted run settles; a queue host reports that the same way it
      // reports any other run ending
      queue.notifyIdle();

      expect(dispatched).toEqual(["first"]);
      expect(queue.adapter.steerItems.map((item) => item.prompt)).toEqual([
        "queued",
      ]);
    });

    it("keeps a trailing user message out of the composer without setMessages", async () => {
      const userMessage = createUserMessage("u1", "Do not duplicate me");
      const adapter = createBaseAdapter({
        messages: [userMessage],
        isRunning: true,
        onCancel: vi.fn(),
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      core.cancelRun();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(core.composer.text).toBe("");
      expect(core.export().messages.map((m) => m.message.id)).toContain("u1");
    });

    it("keeps the message in the thread when the composer is busy", async () => {
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1", "cancel me")],
        isRunning: true,
        onCancel: vi.fn(),
        setMessages: vi.fn(),
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      core.composer.setText("something else");

      core.cancelRun();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(core.composer.text).toBe("something else");
      expect(core.export().messages.map((m) => m.message.id)).toContain("u1");
    });

    it("keeps a message with non-text content in the thread", async () => {
      const userMessage = {
        ...createUserMessage("u1", "look at this"),
        content: [
          { type: "text" as const, text: "look at this" },
          { type: "image" as const, image: "https://example.com/cat.png" },
        ],
      } as ThreadMessage;
      const adapter = createBaseAdapter({
        messages: [userMessage],
        isRunning: true,
        onCancel: vi.fn(),
        setMessages: vi.fn(),
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      core.cancelRun();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(core.composer.text).toBe("");
      expect(core.export().messages.map((m) => m.message.id)).toContain("u1");
    });

    it("restores the message whole when the composer is free", async () => {
      const attachment = {
        id: "a1",
        type: "file" as const,
        name: "spec.pdf",
        contentType: "application/pdf",
        status: { type: "complete" as const },
        content: [],
      };
      const quote = { text: "quoted", messageId: "m-1" };
      const userMessage = {
        ...createUserMessage("u1", "cancel me"),
        attachments: [attachment],
        metadata: { custom: { quote } },
      } as ThreadMessage;
      const adapter = createBaseAdapter({
        messages: [userMessage],
        isRunning: true,
        onCancel: vi.fn(),
        setMessages: vi.fn(),
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      core.cancelRun();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(core.composer.text).toBe("cancel me");
      expect(core.composer.attachments).toEqual([attachment]);
      expect(core.composer.quote).toEqual(quote);
      expect(core.export().messages.map((m) => m.message.id)).not.toContain(
        "u1",
      );
    });
  });

  describe("optimistic assistant message", () => {
    it("adds optimistic assistant message when running with last user message", () => {
      const userMsg = createUserMessage("u1");
      const adapter = createBaseAdapter({
        messages: [userMsg],
        isRunning: true,
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      const messages = core.messages;
      expect(messages.length).toBe(2);
      expect(messages[0]!.id).toBe("u1");
      expect(messages[1]!.role).toBe("assistant");
      expect(messages[1]!.content).toEqual([]);
    });

    it("does not add optimistic message when last message is assistant", () => {
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1"), createAssistantMessage("a1")],
        isRunning: true,
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      const messages = core.messages;
      expect(messages.length).toBe(2);
      expect(messages[1]!.role).toBe("assistant");
      expect(messages[1]!.id).toBe("a1");
    });

    it("does not add optimistic message when not running", () => {
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1")],
        isRunning: false,
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      expect(core.messages.length).toBe(1);
    });
  });

  it("updates isDisabled from adapter", () => {
    const adapter = createBaseAdapter({ isDisabled: true });
    const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
    expect(core.isDisabled).toBe(true);

    core.__internal_setAdapter(createBaseAdapter({ isDisabled: false }));
    expect(core.isDisabled).toBe(false);
  });

  it("does not notify subscribers when the same adapter reference is passed", () => {
    const adapter = createBaseAdapter({
      messages: [createUserMessage("u1")],
    });
    const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
    const spy = vi.fn();
    core.subscribe(spy);
    spy.mockClear();

    core.__internal_setAdapter(adapter);
    expect(spy).not.toHaveBeenCalled();
  });

  it("notifies subscribers when adapter changes", () => {
    const adapter1 = createBaseAdapter({
      messages: [createUserMessage("u1")],
    });
    const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter1);

    const callback = vi.fn();
    core.subscribe(callback);
    callback.mockClear();

    const adapter2 = createBaseAdapter({
      messages: [createUserMessage("u1"), createAssistantMessage("a1")],
    });
    core.__internal_setAdapter(adapter2);
    expect(callback).toHaveBeenCalled();
  });

  describe("switchToBranch", () => {
    it("throws when setMessages is not provided", () => {
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1")],
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      expect(() => core.switchToBranch("u1")).toThrow(
        "Runtime does not support switching branches.",
      );
    });

    it("silently ignores branch switch while running", () => {
      const setMessages = vi.fn();
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1"), createAssistantMessage("a1")],
        isRunning: true,
        setMessages,
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      core.switchToBranch("u1");
      expect(setMessages).not.toHaveBeenCalled();
    });
  });

  describe("exportExternalState and importExternalState", () => {
    it("delegates export to adapter", () => {
      const state = { key: "value" };
      const adapter = createBaseAdapter({
        onExportExternalState: vi.fn(() => state),
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      expect(core.exportExternalState()).toEqual(state);
    });

    it("throws on export when adapter has no onExportExternalState", () => {
      const adapter = createBaseAdapter();
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      expect(() => core.exportExternalState()).toThrow(
        "Runtime does not support exporting external states.",
      );
    });

    it("delegates import to adapter", () => {
      const onLoadExternalState = vi.fn();
      const adapter = createBaseAdapter({ onLoadExternalState });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      const state = { key: "value" };
      core.importExternalState(state);
      expect(onLoadExternalState).toHaveBeenCalledWith(state);
    });

    it("throws on import when adapter has no onLoadExternalState", () => {
      const adapter = createBaseAdapter();
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      expect(() => core.importExternalState({})).toThrow(
        "Runtime does not support importing external states.",
      );
    });
  });

  describe("unsupported adapter operations", () => {
    it("beginEdit throws when adapter has no onEdit", () => {
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1")],
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      expect(() => core.beginEdit("u1")).toThrow(
        "Runtime does not support editing.",
      );
    });

    it("addToolResult throws when adapter has no onAddToolResult", () => {
      const adapter = createBaseAdapter();
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      expect(() =>
        core.addToolResult({
          messageId: "m1",
          toolName: "tool",
          toolCallId: "tc1",
          result: {},
          isError: false,
        }),
      ).toThrow("Runtime does not support tool results.");
    });

    it("resumeRun throws when adapter has no onResume", async () => {
      const adapter = createBaseAdapter();
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      await expect(
        core.resumeRun({ parentId: "msg-1" } as any),
      ).rejects.toThrow("Runtime does not support resuming runs.");
    });

    it("throws when adapter has neither messages nor messageRepository", () => {
      const adapter = {
        onNew: vi.fn(async () => {}),
      } as unknown as ExternalStoreAdapter<ThreadMessage>;

      expect(
        () => new ExternalStoreThreadRuntimeCore(contextProvider, adapter),
      ).toThrow(
        "ExternalStoreAdapter must provide either 'messages' or 'messageRepository'",
      );
    });
  });

  describe("tool callbacks", () => {
    it("keeps the runtime running until an executing client tool settles", async () => {
      let resolveTool!: (value: { forecast: string }) => void;
      const execute = vi.fn(
        () =>
          new Promise<{ forecast: string }>((resolve) => {
            resolveTool = resolve;
          }),
      );
      const core = new ExternalStoreThreadRuntimeCore(
        {
          getModelContext: () => ({
            tools: {
              weatherSearch: {
                parameters: { type: "object", properties: {} },
                execute,
              },
            },
          }),
        },
        createBaseAdapter({
          unstable_enableToolInvocations: true,
          isRunning: false,
        }),
      );
      const onRunEnd = vi.fn();
      const onUpdate = vi.fn();
      core.unstable_on("runEnd", onRunEnd);
      core.subscribe(onUpdate);

      core.__internal_setAdapter(
        createBaseAdapter({
          unstable_enableToolInvocations: true,
          isRunning: false,
          messages: [
            {
              ...createAssistantMessage("a1"),
              status: { type: "requires-action", reason: "tool-calls" },
              content: [
                {
                  type: "tool-call",
                  toolCallId: "tc1",
                  toolName: "weatherSearch",
                  args: { city: "London" },
                  argsText: '{"city":"London"}',
                },
              ],
            },
          ],
        }),
      );

      await vi.waitFor(() => expect(core.isRunning).toBe(true));
      expect(onRunEnd).not.toHaveBeenCalled();

      onUpdate.mockClear();
      resolveTool({ forecast: "sunny" });

      await vi.waitFor(() => expect(core.isRunning).toBe(false));
      expect(onRunEnd).toHaveBeenCalledOnce();
      expect(onUpdate).toHaveBeenCalled();
    });

    it("mirrors the adapter running value when tool invocations are disabled", () => {
      const core = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        createBaseAdapter(),
      );

      expect(core.isRunning).toBeUndefined();

      core.__internal_setAdapter(createBaseAdapter({ isRunning: false }));
      expect(core.isRunning).toBe(false);

      core.__internal_setAdapter(createBaseAdapter({ isRunning: true }));
      expect(core.isRunning).toBe(true);
    });

    it("passes an undefined adapter running value through when no tool is executing", () => {
      const core = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        createBaseAdapter({ unstable_enableToolInvocations: true }),
      );

      expect(core.isRunning).toBeUndefined();
    });

    it("stops running when the session resets during a tool execution", async () => {
      const execute = vi.fn(() => new Promise<never>(() => {}));
      const core = new ExternalStoreThreadRuntimeCore(
        {
          getModelContext: () => ({
            tools: {
              weatherSearch: {
                parameters: { type: "object", properties: {} },
                execute,
              },
            },
          }),
        },
        createBaseAdapter({
          unstable_enableToolInvocations: true,
          isRunning: false,
        }),
      );
      const onRunEnd = vi.fn();
      core.unstable_on("runEnd", onRunEnd);

      core.__internal_setAdapter(
        createBaseAdapter({
          unstable_enableToolInvocations: true,
          isRunning: false,
          messages: [
            {
              ...createAssistantMessage("a1"),
              status: { type: "requires-action", reason: "tool-calls" },
              content: [
                {
                  type: "tool-call",
                  toolCallId: "tc1",
                  toolName: "weatherSearch",
                  args: { city: "London" },
                  argsText: '{"city":"London"}',
                },
              ],
            },
          ],
        }),
      );

      await vi.waitFor(() => expect(core.isRunning).toBe(true));

      core.unstable_notifySessionReset();

      expect(core.isRunning).toBe(false);
      expect(onRunEnd).toHaveBeenCalledOnce();

      execute.mockClear();
      core.__internal_setAdapter(
        createBaseAdapter({
          unstable_enableToolInvocations: true,
          isRunning: false,
          messages: [
            {
              ...createAssistantMessage("a2"),
              status: { type: "requires-action", reason: "tool-calls" },
              content: [
                {
                  type: "tool-call",
                  toolCallId: "tc2",
                  toolName: "weatherSearch",
                  args: { city: "Paris" },
                  argsText: '{"city":"Paris"}',
                },
              ],
            },
          ],
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(execute).not.toHaveBeenCalled();
      expect(core.isRunning).toBe(false);
    });

    it("handles rejected automatic tool result callbacks", async () => {
      const error = new Error("tool result failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const execute = vi.fn(async () => ({ forecast: "sunny" }));
      let callbackCalls = 0;
      const onAddToolResult = () => {
        callbackCalls += 1;
        return Promise.reject(error);
      };
      const core = new ExternalStoreThreadRuntimeCore(
        {
          getModelContext: () => ({
            tools: {
              weatherSearch: {
                parameters: { type: "object", properties: {} },
                execute,
              },
            },
          }),
        },
        createBaseAdapter({
          unstable_enableToolInvocations: true,
          onAddToolResult,
        }),
      );

      const rejections = await captureUnhandledRejections(async () => {
        core.__internal_setAdapter(
          createBaseAdapter({
            unstable_enableToolInvocations: true,
            isRunning: false,
            messages: [
              {
                ...createAssistantMessage("a1"),
                status: { type: "requires-action", reason: "tool-calls" },
                content: [
                  {
                    type: "tool-call",
                    toolCallId: "tc1",
                    toolName: "weatherSearch",
                    args: { city: "London" },
                    argsText: '{"city":"London"}',
                  },
                ],
              },
            ],
            onAddToolResult,
          }),
        );

        await vi.waitFor(() =>
          expect(consoleError).toHaveBeenCalledWith(
            "[ExternalStoreThreadRuntimeCore] onAddToolResult callback rejected",
            error,
          ),
        );
      });

      expect(execute).toHaveBeenCalledOnce();
      expect(callbackCalls).toBe(1);
      expect(rejections).toEqual([]);
    });

    it("handles rejected direct tool result callbacks", async () => {
      const error = new Error("tool result failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      let callbackCalls = 0;
      const core = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        createBaseAdapter({
          onAddToolResult: () => {
            callbackCalls += 1;
            return Promise.reject(error);
          },
        }),
      );

      const rejections = await captureUnhandledRejections(async () => {
        core.addToolResult({
          messageId: "m1",
          toolName: "weatherSearch",
          toolCallId: "tc1",
          result: { forecast: "sunny" },
          isError: false,
        });

        await vi.waitFor(() =>
          expect(consoleError).toHaveBeenCalledWith(
            "[ExternalStoreThreadRuntimeCore] onAddToolResult callback rejected",
            error,
          ),
        );
      });

      expect(callbackCalls).toBe(1);
      expect(rejections).toEqual([]);
    });

    it("handles rejected onRespondToToolApproval callbacks", async () => {
      const error = new Error("approval failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      let callbackCalls = 0;
      const core = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        createBaseAdapter({
          onRespondToToolApproval: () => {
            callbackCalls += 1;
            return Promise.reject(error);
          },
        }),
      );

      const rejections = await captureUnhandledRejections(async () => {
        core.respondToToolApproval({
          approvalId: "approval-1",
          approved: true,
        });

        await vi.waitFor(() =>
          expect(consoleError).toHaveBeenCalledWith(
            "[ExternalStoreThreadRuntimeCore] onRespondToToolApproval callback rejected",
            error,
          ),
        );
      });

      expect(callbackCalls).toBe(1);
      expect(rejections).toEqual([]);
    });

    it("handles rejected onCancel callbacks", async () => {
      const error = new Error("cancel failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      let callbackCalls = 0;
      const core = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        createBaseAdapter({
          onCancel: () => {
            callbackCalls += 1;
            return Promise.reject(error);
          },
        }),
      );

      const rejections = await captureUnhandledRejections(async () => {
        core.cancelRun();

        await vi.waitFor(() =>
          expect(consoleError).toHaveBeenCalledWith(
            "[ExternalStoreThreadRuntimeCore] onCancel callback rejected",
            error,
          ),
        );
      });

      expect(callbackCalls).toBe(1);
      expect(rejections).toEqual([]);
    });
  });

  describe("messageRepository incremental sync", () => {
    const u1 = createUserMessage("u1");
    const a1 = createAssistantMessage("a1");

    const repoAdapter = (
      messages: { message: ThreadMessage; parentId: string | null }[],
      headId: string | null,
      overrides: Partial<ExternalStoreAdapter<ThreadMessage>> = {},
    ): ExternalStoreAdapter<ThreadMessage> => ({
      messageRepository: { headId, messages },
      onNew: vi.fn(async () => {}),
      ...overrides,
    });

    it("imports the initial repository", () => {
      const core = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        repoAdapter([{ message: u1, parentId: null }], "u1"),
      );
      expect(core.messages.map((m) => m.id)).toEqual(["u1"]);
    });

    it("adds a message when the repository is replaced", () => {
      const core = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        repoAdapter([{ message: u1, parentId: null }], "u1"),
      );
      core.__internal_setAdapter(
        repoAdapter(
          [
            { message: u1, parentId: null },
            { message: a1, parentId: "u1" },
          ],
          "a1",
        ),
      );
      expect(core.messages.map((m) => m.id)).toEqual(["u1", "a1"]);
    });

    it("deletes a message no longer present in the new repository", () => {
      const core = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        repoAdapter(
          [
            { message: u1, parentId: null },
            { message: a1, parentId: "u1" },
          ],
          "a1",
        ),
      );
      expect(core.messages.map((m) => m.id)).toEqual(["u1", "a1"]);

      core.__internal_setAdapter(
        repoAdapter([{ message: u1, parentId: null }], "u1"),
      );
      expect(core.messages.map((m) => m.id)).toEqual(["u1"]);
    });

    it("matches a fresh import when built incrementally", () => {
      const incremental = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        repoAdapter([{ message: u1, parentId: null }], "u1"),
      );
      incremental.__internal_setAdapter(
        repoAdapter(
          [
            { message: u1, parentId: null },
            { message: a1, parentId: "u1" },
          ],
          "a1",
        ),
      );
      const fresh = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        repoAdapter(
          [
            { message: u1, parentId: null },
            { message: a1, parentId: "u1" },
          ],
          "a1",
        ),
      );
      expect(incremental.messages.map((m) => m.id)).toEqual(
        fresh.messages.map((m) => m.id),
      );
    });

    it("coalesces an isRunning flip on an unchanged repository reference", () => {
      const messageRepository = {
        headId: "u1",
        messages: [{ message: u1, parentId: null }],
      };
      const onNew = vi.fn(async () => {});
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, {
        messageRepository,
        onNew,
        isRunning: false,
      });
      expect(core.messages.map((m) => m.id)).toEqual(["u1"]);

      core.__internal_setAdapter({ messageRepository, onNew, isRunning: true });
      expect(core.messages.length).toBe(2);
      expect(core.messages[1]!.role).toBe("assistant");

      core.__internal_setAdapter({
        messageRepository,
        onNew,
        isRunning: false,
      });
      expect(core.messages.map((m) => m.id)).toEqual(["u1"]);
    });
  });
});
