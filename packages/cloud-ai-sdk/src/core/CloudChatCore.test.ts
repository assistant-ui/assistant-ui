import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CloudChatCore } from "./CloudChatCore";

const {
  persistMock,
  loadMessagesMock,
  getResolvedRemoteIdMock,
  MessagePersistenceMock,
} = vi.hoisted(() => {
  const persist = vi.fn<(...args: unknown[]) => Promise<void>>();
  const loadMessages = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();
  const getResolvedRemoteId =
    vi.fn<(...args: unknown[]) => string | undefined>();

  const MockedClass = vi.fn(
    class {
      persist = persist;
      loadMessages = loadMessages;
      getResolvedRemoteId = getResolvedRemoteId;
    },
  );

  return {
    persistMock: persist,
    loadMessagesMock: loadMessages,
    getResolvedRemoteIdMock: getResolvedRemoteId,
    MessagePersistenceMock: MockedClass,
  };
});

const chatOptionsRef = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock("@ai-sdk/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ai-sdk/react")>()),
  Chat: class {
    constructor(options: Record<string, unknown>) {
      chatOptionsRef.current = options;
    }
  },
}));

vi.mock("../chat/MessagePersistence", () => ({
  MessagePersistence: MessagePersistenceMock,
}));

const registry = { getMeta: () => undefined, get: () => undefined } as never;

function createCore(overrides?: {
  onSyncError?: (...args: unknown[]) => void;
  generateTitle?: (...args: unknown[]) => Promise<string | null>;
  chatConfig?: Record<string, unknown>;
  baseTransport?: Record<string, unknown>;
}) {
  const generateTitle =
    overrides?.generateTitle ??
    vi
      .fn<(...args: unknown[]) => Promise<string | null>>()
      .mockResolvedValue("Generated title");
  const onSyncError = overrides?.onSyncError;

  const refs = {
    threads: { generateTitle } as never,
    chatConfig: (overrides?.chatConfig ?? {}) as never,
    callbacks: {} as never,
    onSyncError: onSyncError as ((error: Error) => void) | undefined,
  };

  const core = new CloudChatCore(
    {} as never,
    refs,
    (overrides?.baseTransport ?? {}) as never,
  );
  return core;
}

describe("CloudChatCore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistMock.mockResolvedValue(undefined);
    loadMessagesMock.mockResolvedValue([]);
    getResolvedRemoteIdMock.mockReset();
    chatOptionsRef.current = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stops automatic title generation once a run reports a title", async () => {
    const generateTitle = vi
      .fn<(...args: unknown[]) => Promise<string | null>>()
      .mockResolvedValue("Explicit title");
    const core = createCore({ generateTitle });
    const messages = [{ id: "m1", role: "assistant" }];
    const registry = {
      getMeta: () => ({ threadId: "thread-1" }),
      get: () => ({ messages }),
    } as never;
    core.titlePolicy.markNewThread("thread-1");

    await core.persistChatMessages("chat-1", registry);
    await Promise.resolve();
    await core.persistChatMessages("chat-1", registry);

    expect(generateTitle).toHaveBeenCalledOnce();
  });

  it("retries automatic title generation when a run reports no title", async () => {
    const generateTitle = vi
      .fn<(...args: unknown[]) => Promise<string | null>>()
      .mockResolvedValue(null);
    const core = createCore({ generateTitle });
    const messages = [{ id: "m1", role: "assistant" }];
    const registry = {
      getMeta: () => ({ threadId: "thread-1" }),
      get: () => ({ messages }),
    } as never;
    core.titlePolicy.markNewThread("thread-1");

    await core.persistChatMessages("chat-1", registry);
    await Promise.resolve();
    await core.persistChatMessages("chat-1", registry);

    expect(generateTitle).toHaveBeenCalledTimes(2);
  });

  it("forwards async tool call completion to the AI SDK chat", () => {
    const completion = Promise.resolve();
    const onToolCall = vi.fn(() => completion);
    const core = createCore({ chatConfig: { onToolCall } });

    core.createChat("chat-1", registry);

    const wrappedOnToolCall = chatOptionsRef.current?.onToolCall;
    expect(wrappedOnToolCall).toBeTypeOf("function");
    const result = (
      wrappedOnToolCall as (options: unknown) => PromiseLike<void> | void
    )({ toolCall: {} });

    expect(onToolCall).toHaveBeenCalledWith({ toolCall: {} });
    expect(result).toBe(completion);
  });

  it("uses the current render config when creating a chat", () => {
    const initialMessages = [{ id: "initial" }];
    const currentMessages = [{ id: "current" }];
    const core = createCore({ chatConfig: { messages: initialMessages } });

    core.createChat("chat-1", registry, {
      messages: currentMessages,
    } as never);

    expect(chatOptionsRef.current?.messages).toBe(currentMessages);
  });

  it("reports transport duration, first-token timing, and remote assistant IDs", async () => {
    const now = vi.spyOn(Date, "now");
    let clock = 100;
    now.mockImplementation(() => clock);
    let controller: ReadableStreamDefaultController | undefined;
    const source = new ReadableStream({
      start(streamController) {
        controller = streamController;
      },
    });
    const sendMessages = vi.fn().mockResolvedValue(source);
    const core = createCore({
      baseTransport: { sendMessages, reconnectToStream: vi.fn() },
    });
    const messages = [{ id: "assistant-1", role: "assistant", parts: [] }];
    const chatRegistry = {
      getMeta: () => ({ threadId: "thread-1" }),
      get: () => ({ messages }),
    } as never;
    vi.spyOn(core, "ensureThreadId").mockResolvedValue("thread-1");
    vi.spyOn(core, "persist").mockResolvedValue(undefined);
    vi.spyOn(core.engagementReporter, "messageSent").mockImplementation(
      () => undefined,
    );
    const report = vi
      .spyOn(core.telemetryReporter, "reportFromMessages")
      .mockResolvedValue(undefined);

    core.createChat("chat-1", chatRegistry);
    const stream = await core
      .createTransport("chat-1", chatRegistry)
      .sendMessages({
        messages,
      } as never);
    clock = 125;
    expect(controller).toBeDefined();
    controller!.enqueue({ type: "text-start", id: "part-1" });
    controller!.enqueue({ type: "text-delta", id: "part-1", delta: "hi" });
    controller!.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await stream.pipeTo(new WritableStream());
    expect(source.locked).toBe(false);
    clock = 180;
    const onFinish = chatOptionsRef.current?.onFinish as (
      event: unknown,
    ) => void;
    onFinish({ isAbort: false, isDisconnect: false, isError: false });

    await vi.waitFor(() => expect(report).toHaveBeenCalledOnce());
    expect(report).toHaveBeenCalledWith(
      "thread-1",
      messages,
      { isAbort: false, isDisconnect: false, isError: false },
      { durationMs: 80, firstTokenMs: 25 },
      expect.any(Function),
    );
    const resolveRemoteId = report.mock.calls[0]![4]!;
    resolveRemoteId("assistant-1");
    expect(getResolvedRemoteIdMock).toHaveBeenCalledWith(
      "thread-1",
      "assistant-1",
    );
  });

  it("cancels the transport stream while waiting for the first token", async () => {
    const cancel = vi.fn();
    const source = new ReadableStream({ cancel });
    const sendMessages = vi.fn().mockResolvedValue(source);
    const core = createCore({
      baseTransport: { sendMessages, reconnectToStream: vi.fn() },
    });
    vi.spyOn(core, "ensureThreadId").mockResolvedValue("thread-1");
    vi.spyOn(core, "persist").mockResolvedValue(undefined);

    const stream = await core
      .createTransport("chat-1", registry)
      .sendMessages({ messages: [] } as never);
    const reason = new Error("stopped");
    const cancellation = stream.cancel(reason);

    await vi.waitFor(() => expect(cancel).toHaveBeenCalledOnce(), {
      timeout: 250,
    });
    await cancellation;
    expect(cancel).toHaveBeenCalledWith(reason);
    expect(source.locked).toBe(false);
  });

  it("cancels the transport stream after observing the first token", async () => {
    let controller: ReadableStreamDefaultController | undefined;
    const cancel = vi.fn();
    const source = new ReadableStream({
      start(sourceController) {
        controller = sourceController;
      },
      cancel,
    });
    const sendMessages = vi.fn().mockResolvedValue(source);
    const core = createCore({
      baseTransport: { sendMessages, reconnectToStream: vi.fn() },
    });
    vi.spyOn(core, "ensureThreadId").mockResolvedValue("thread-1");
    vi.spyOn(core, "persist").mockResolvedValue(undefined);

    const stream = await core
      .createTransport("chat-1", registry)
      .sendMessages({ messages: [] } as never);
    controller!.enqueue({ type: "text-delta", id: "part-1", delta: "hi" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const reason = new Error("stopped");
    await stream.cancel(reason);

    expect(cancel).toHaveBeenCalledWith(reason);
    expect(source.locked).toBe(false);
  });

  it("reports message_sent for a user submission only", async () => {
    const sendMessages = vi.fn(() => Promise.resolve(new ReadableStream()));
    const core = createCore({
      baseTransport: { sendMessages, reconnectToStream: vi.fn() },
    });
    const user = { id: "user-1", role: "user", parts: [] };
    const assistant = { id: "assistant-1", role: "assistant", parts: [] };
    const chatRegistry = {
      getMeta: () => ({ threadId: "thread-1" }),
      get: () => undefined,
    } as never;
    vi.spyOn(core, "ensureThreadId").mockResolvedValue("thread-1");
    vi.spyOn(core, "persist").mockResolvedValue(undefined);
    const messageSent = vi
      .spyOn(core.engagementReporter, "messageSent")
      .mockImplementation(() => undefined);
    const transport = core.createTransport("chat-1", chatRegistry);

    await transport.sendMessages({
      trigger: "submit-message",
      messages: [user],
    } as never);
    expect(messageSent).toHaveBeenCalledTimes(1);

    await transport.sendMessages({
      trigger: "submit-message",
      messageId: "assistant-1",
      messages: [user, assistant],
    } as never);
    await transport.sendMessages({
      trigger: "regenerate-message",
      messages: [user, assistant],
    } as never);
    expect(messageSent).toHaveBeenCalledTimes(1);
  });

  it("hands the stream error to the run report", async () => {
    const source = new ReadableStream();
    const sendMessages = vi.fn().mockResolvedValue(source);
    const core = createCore({
      baseTransport: { sendMessages, reconnectToStream: vi.fn() },
    });
    const messages = [{ id: "assistant-1", role: "assistant", parts: [] }];
    const chatRegistry = {
      getMeta: () => ({ threadId: "thread-1" }),
      get: () => ({ messages }),
    } as never;
    vi.spyOn(core, "ensureThreadId").mockResolvedValue("thread-1");
    vi.spyOn(core, "persist").mockResolvedValue(undefined);
    const report = vi
      .spyOn(core.telemetryReporter, "reportFromMessages")
      .mockResolvedValue(undefined);

    core.createChat("chat-1", chatRegistry);
    await core
      .createTransport("chat-1", chatRegistry)
      .sendMessages({ trigger: "submit-message", messages } as never);
    const error = new Error("boom");
    (chatOptionsRef.current?.onError as (error: Error) => void)(error);
    (chatOptionsRef.current?.onFinish as (event: unknown) => void)({
      isAbort: false,
      isDisconnect: false,
      isError: true,
    });

    await vi.waitFor(() => expect(report).toHaveBeenCalledOnce());
    expect(report.mock.calls[0]![2]).toEqual({
      isAbort: false,
      isDisconnect: false,
      isError: true,
      error,
    });
  });

  it("preserves synchronous finish callback failures", () => {
    const error = new Error("finish failed");
    const onFinish = vi.fn(() => {
      throw error;
    });
    const core = createCore({ chatConfig: { onFinish } });
    const persistChatMessages = vi
      .spyOn(core, "persistChatMessages")
      .mockResolvedValue(undefined);

    core.createChat("chat-1", registry);

    const wrappedOnFinish = chatOptionsRef.current?.onFinish;
    expect(wrappedOnFinish).toBeTypeOf("function");

    expect(() => (wrappedOnFinish as (event: unknown) => unknown)({})).toThrow(
      error,
    );
    expect(persistChatMessages).toHaveBeenCalledWith(
      "chat-1",
      expect.anything(),
      {},
    );
  });

  it("reports finish persistence failures", async () => {
    const error = new Error("persistence failed");
    const onSyncError = vi.fn();
    const core = createCore({ onSyncError });
    vi.spyOn(core, "persistChatMessages").mockRejectedValue(error);

    core.createChat("chat-1", registry);

    const wrappedOnFinish = chatOptionsRef.current?.onFinish;
    expect(wrappedOnFinish).toBeTypeOf("function");
    const result = (wrappedOnFinish as (event: unknown) => unknown)({});

    expect(result).toBeUndefined();
    await vi.waitFor(() => expect(onSyncError).toHaveBeenCalledWith(error));
  });

  it("handles rejected sync error callbacks", async () => {
    const persistenceError = new Error("persistence failed");
    const callbackError = new Error("telemetry failed");
    const onSyncError = vi.fn(() => Promise.reject(callbackError));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const core = createCore({ onSyncError });
    vi.spyOn(core, "persistChatMessages").mockRejectedValue(persistenceError);

    core.createChat("chat-1", registry);

    const wrappedOnFinish = chatOptionsRef.current?.onFinish;
    expect(wrappedOnFinish).toBeTypeOf("function");
    (wrappedOnFinish as (event: unknown) => unknown)({});

    await vi.waitFor(() => {
      expect(onSyncError).toHaveBeenCalledWith(persistenceError);
      expect(consoleError).toHaveBeenCalledWith(
        "[cloud-ai-sdk] onSyncError callback threw an error",
        callbackError,
      );
    });
  });
});
