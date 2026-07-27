import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ExternalStoreThreadRuntimeCore,
  hasUpcomingMessage,
} from "../runtimes/external-store/external-store-thread-runtime-core";
import type { ExternalStoreAdapter } from "../runtimes/external-store/external-store-adapter";
import type { ModelContextProvider } from "../model-context/types";
import type { AppendMessage, ThreadMessage } from "../types/message";

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

describe("ExternalStoreThreadRuntimeCore adapter contract", () => {
  let contextProvider: ModelContextProvider;

  beforeEach(() => {
    contextProvider = createContextProvider();
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
