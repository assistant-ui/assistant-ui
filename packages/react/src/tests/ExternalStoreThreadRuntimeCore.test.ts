import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ExternalStoreThreadRuntimeCore,
  hasUpcomingMessage,
} from "../legacy-runtime/runtime-cores/external-store/ExternalStoreThreadRuntimeCore";
import type { ExternalStoreAdapter } from "../legacy-runtime/runtime-cores/external-store/ExternalStoreAdapter";
import type { ModelContextProvider } from "../model-context/ModelContextTypes";
import type { AppendMessage, ThreadMessage } from "../types/AssistantTypes";

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

describe("ExternalStoreThreadRuntimeCore", () => {
  let contextProvider: ModelContextProvider;

  beforeEach(() => {
    contextProvider = createContextProvider();
  });

  describe("hasUpcomingMessage", () => {
    it("returns true when running and last message is not assistant", () => {
      const messages = [createUserMessage("u1")];
      expect(hasUpcomingMessage(true, messages)).toBe(true);
    });

    it("returns false when running and last message is assistant", () => {
      const messages = [createAssistantMessage("a1")];
      expect(hasUpcomingMessage(true, messages)).toBe(false);
    });

    it("returns false when not running", () => {
      const messages = [createUserMessage("u1")];
      expect(hasUpcomingMessage(false, messages)).toBe(false);
    });

    it("returns true for empty messages when running", () => {
      expect(hasUpcomingMessage(true, [])).toBe(true);
    });
  });

  describe("capabilities derived from adapter", () => {
    it("enables edit when onEdit is provided", () => {
      const adapter = createBaseAdapter({
        onEdit: vi.fn(async () => {}),
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      expect(core.capabilities.edit).toBe(true);
    });

    it("disables edit when onEdit is not provided", () => {
      const adapter = createBaseAdapter();
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      expect(core.capabilities.edit).toBe(false);
    });

    it("enables reload when onReload is provided", () => {
      const adapter = createBaseAdapter({
        onReload: vi.fn(async () => {}),
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      expect(core.capabilities.reload).toBe(true);
    });

    it("disables reload when onReload is not provided", () => {
      const adapter = createBaseAdapter();
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      expect(core.capabilities.reload).toBe(false);
    });

    it("enables cancel when onCancel is provided", () => {
      const adapter = createBaseAdapter({
        onCancel: vi.fn(async () => {}),
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      expect(core.capabilities.cancel).toBe(true);
    });

    it("disables cancel when onCancel is not provided", () => {
      const adapter = createBaseAdapter();
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      expect(core.capabilities.cancel).toBe(false);
    });

    it("enables switchToBranch when setMessages is provided", () => {
      const adapter = createBaseAdapter({
        setMessages: vi.fn(),
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      expect(core.capabilities.switchToBranch).toBe(true);
    });

    it("defaults unstable_copy to true", () => {
      const adapter = createBaseAdapter();
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      expect(core.capabilities.unstable_copy).toBe(true);
    });

    it("disables unstable_copy when explicitly set to false", () => {
      const adapter = createBaseAdapter({
        unstable_capabilities: { copy: false },
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      expect(core.capabilities.unstable_copy).toBe(false);
    });
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

  describe("adapter update via __internal_setAdapter", () => {
    it("updates capabilities when adapter changes", () => {
      const adapter1 = createBaseAdapter();
      const core = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        adapter1,
      );
      expect(core.capabilities.edit).toBe(false);

      const adapter2 = createBaseAdapter({
        onEdit: vi.fn(async () => {}),
      });
      core.__internal_setAdapter(adapter2);
      expect(core.capabilities.edit).toBe(true);
    });

    it("updates isDisabled from adapter", () => {
      const adapter = createBaseAdapter({ isDisabled: true });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      expect(core.isDisabled).toBe(true);

      core.__internal_setAdapter(createBaseAdapter({ isDisabled: false }));
      expect(core.isDisabled).toBe(false);
    });

    it("updates suggestions from adapter", () => {
      const suggestions = [{ prompt: "Tell me a joke" }];
      const adapter = createBaseAdapter({ suggestions });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      expect(core.suggestions).toEqual(suggestions);
    });

    it("skips update when same adapter reference is passed", () => {
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1")],
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);
      const spy = vi.fn();
      core.subscribe(spy);
      spy.mockClear();

      // Same reference — should not notify
      core.__internal_setAdapter(adapter);
      expect(spy).not.toHaveBeenCalled();
    });
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

      // Should not throw, should silently return
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

  describe("beginEdit", () => {
    it("throws when adapter has no onEdit", () => {
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1")],
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      expect(() => core.beginEdit("u1")).toThrow(
        "Runtime does not support editing.",
      );
    });
  });

  describe("subscribe", () => {
    it("notifies subscribers when adapter changes", () => {
      const adapter1 = createBaseAdapter({
        messages: [createUserMessage("u1")],
      });
      const core = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        adapter1,
      );

      const callback = vi.fn();
      core.subscribe(callback);
      callback.mockClear();

      const adapter2 = createBaseAdapter({
        messages: [createUserMessage("u1"), createAssistantMessage("a1")],
      });
      core.__internal_setAdapter(adapter2);
      expect(callback).toHaveBeenCalled();
    });

    it("returns unsubscribe function", () => {
      const adapter = createBaseAdapter({
        messages: [createUserMessage("u1")],
      });
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      const callback = vi.fn();
      const unsub = core.subscribe(callback);
      callback.mockClear();

      unsub();

      core.__internal_setAdapter(
        createBaseAdapter({
          messages: [createUserMessage("u1"), createAssistantMessage("a1")],
        }),
      );
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("addToolResult", () => {
    it("throws when adapter has no onAddToolResult", () => {
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
  });

  describe("resumeRun", () => {
    it("throws when adapter has no onResume", async () => {
      const adapter = createBaseAdapter();
      const core = new ExternalStoreThreadRuntimeCore(contextProvider, adapter);

      await expect(
        core.resumeRun({ parentId: "msg-1" } as any),
      ).rejects.toThrow("Runtime does not support resuming runs.");
    });
  });

  describe("adapter requires messages or messageRepository", () => {
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
});
