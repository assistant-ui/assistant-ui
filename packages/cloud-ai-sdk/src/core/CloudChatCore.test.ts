import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatRegistry } from "../chat/ChatRegistry";
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
  cloud?: Record<string, unknown>;
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
    (overrides?.cloud ?? {}) as never,
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
    clock = 150;
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

  it("forwards transport stream errors and releases the source reader", async () => {
    let controller: ReadableStreamDefaultController | undefined;
    const source = new ReadableStream({
      start(sourceController) {
        controller = sourceController;
      },
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
    const error = new Error("stream failed");
    controller!.error(error);

    await expect(stream.getReader().read()).rejects.toBe(error);
    expect(source.locked).toBe(false);
  });

  it("allows cancellation after a tokenless source has closed", async () => {
    const source = new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "text-start", id: "part-1" });
        controller.close();
      },
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
    await vi.waitFor(() => expect(source.locked).toBe(false));

    await expect(stream.cancel(new Error("stopped"))).resolves.toBeUndefined();
  });

  it("does not continue a new-thread send after registry disposal", async () => {
    let resolveThread!: (value: { thread_id: string }) => void;
    const createThread = vi.fn(
      () =>
        new Promise<{ thread_id: string }>((resolve) => {
          resolveThread = resolve;
        }),
    );
    const selectThread = vi.fn();
    const refresh = vi.fn();
    const sendMessages = vi.fn();
    const core = new CloudChatCore(
      {} as never,
      {
        threads: {
          cloud: { threads: { create: createThread } },
          selectThread,
          refresh,
        } as never,
        chatConfig: {},
      },
      { sendMessages, reconnectToStream: vi.fn() },
    );
    const stop = vi.fn().mockResolvedValue(undefined);
    const chatRegistry = new ChatRegistry(
      () => ({ messages: [], stop }) as never,
    );
    chatRegistry.getOrCreate("chat-1");
    const persist = vi.spyOn(core, "persist").mockResolvedValue(undefined);

    const send = core.createTransport("chat-1", chatRegistry).sendMessages({
      trigger: "submit-message",
      messages: [],
      abortSignal: new AbortController().signal,
    } as never);
    await vi.waitFor(() => expect(createThread).toHaveBeenCalledOnce());

    await chatRegistry.stopAll();
    resolveThread({ thread_id: "thread-1" });

    await expect(send).rejects.toMatchObject({ name: "AbortError" });
    expect(stop).toHaveBeenCalledOnce();
    expect(chatRegistry.getMeta("chat-1")?.threadId).toBeNull();
    expect(chatRegistry.getChatKeyForThread("thread-1")).toBeUndefined();
    expect(selectThread).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
    expect(sendMessages).not.toHaveBeenCalled();
  });

  describe("trackToolApprovalResponded", () => {
    const message = (
      id: string,
      role: "user" | "assistant",
      parts: unknown[],
    ) => ({ id, role, parts }) as never;
    const pending = () =>
      message("assistant-1", "assistant", [
        {
          type: "tool-delete",
          toolCallId: "tc-1",
          state: "approval-requested",
          input: {},
          approval: { id: "approval-1" },
        },
      ]);
    const answered = (approved: boolean) =>
      message("assistant-1", "assistant", [
        {
          type: "tool-delete",
          toolCallId: "tc-1",
          state: "approval-responded",
          input: {},
          approval: { id: "approval-1", approved },
        },
      ]);

    it.each([
      [true, "tool_approved"],
      [false, "tool_rejected"],
    ] as const)(
      "reports the decision the SDK recorded (approved=%s) without message text",
      async (approved, kind) => {
        const track = vi.fn();
        const core = createCore({ cloud: { events: { track } } });
        getResolvedRemoteIdMock.mockReturnValue("remote-assistant-1");

        core.trackToolApprovalResponded("thread-1", [answered(approved)], {
          id: "approval-1",
          approved,
        });

        await vi.waitFor(() => expect(track).toHaveBeenCalledOnce());
        expect(track).toHaveBeenCalledWith({
          kind,
          thread_id: "thread-1",
          message_id: "remote-assistant-1",
        });
      },
    );

    it("ignores decisions the SDK did not record", async () => {
      const track = vi.fn();
      const core = createCore({ cloud: { events: { track } } });
      const decision = { id: "approval-1", approved: false };
      // No thread yet.
      core.trackToolApprovalResponded(null, [answered(false)], decision);
      // Unknown approval id.
      core.trackToolApprovalResponded("thread-1", [answered(false)], {
        ...decision,
        id: "unknown",
      });
      // Still pending, or answered the other way.
      core.trackToolApprovalResponded("thread-1", [pending()], decision);
      core.trackToolApprovalResponded("thread-1", [answered(true)], decision);
      // Only the last message can be answered.
      core.trackToolApprovalResponded(
        "thread-1",
        [
          answered(false),
          message("user-2", "user", [{ type: "text", text: "next" }]),
        ],
        decision,
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(track).not.toHaveBeenCalled();
    });

    it("reports each approval once", async () => {
      const track = vi.fn();
      const core = createCore({ cloud: { events: { track } } });
      const decision = { id: "approval-1", approved: true };
      core.trackToolApprovalResponded("thread-1", [answered(true)], decision);
      core.trackToolApprovalResponded("thread-1", [answered(true)], decision);

      await vi.waitFor(() => expect(track).toHaveBeenCalledOnce());
    });
  });

  it("resolves engagement message IDs through persistence", async () => {
    const track = vi.fn();
    const core = createCore({ cloud: { events: { track } } });
    getResolvedRemoteIdMock.mockReturnValue("remote-user-1");

    core.engagementReporter.messageSent("thread-1", {
      messageId: "user-1",
      chars: 4,
      attachments: 0,
    });

    await vi.waitFor(() => expect(track).toHaveBeenCalledOnce());
    expect(getResolvedRemoteIdMock).toHaveBeenCalledWith("thread-1", "user-1");
    expect(track).toHaveBeenCalledWith({
      kind: "message_sent",
      thread_id: "thread-1",
      message_id: "remote-user-1",
      props: { chars: 4, attachments: 0 },
    });
  });

  it("reports the last submitted user message's counts", async () => {
    const sendMessages = vi.fn(() => Promise.resolve(new ReadableStream()));
    const core = createCore({
      baseTransport: { sendMessages, reconnectToStream: vi.fn() },
    });
    const user = {
      id: "user-1",
      role: "user",
      parts: [
        { type: "text", text: "hello" },
        {
          type: "file",
          mediaType: "image/png",
          filename: "image.png",
          url: "https://example.com/image.png",
        },
        { type: "text", text: " world" },
      ],
    };
    const assistant = { id: "assistant-1", role: "assistant", parts: [] };
    const chatRegistry = {
      getMeta: () => ({ threadId: "thread-1" }),
      get: () => undefined,
    } as never;
    vi.spyOn(core, "ensureThreadId").mockResolvedValue("thread-1");
    vi.spyOn(core, "persist").mockResolvedValue(undefined);
    const runStarted = vi
      .spyOn(core.engagementReporter, "runStarted")
      .mockImplementation(() => undefined);
    const messageSent = vi
      .spyOn(core.engagementReporter, "messageSent")
      .mockImplementation(() => undefined);
    const transport = core.createTransport("chat-1", chatRegistry);

    await transport.sendMessages({
      trigger: "submit-message",
      messages: [user],
    } as never);
    expect(messageSent).toHaveBeenCalledTimes(1);
    expect(runStarted).toHaveBeenCalledWith("thread-1");
    expect(messageSent).toHaveBeenCalledWith("thread-1", {
      messageId: "user-1",
      chars: 11,
      attachments: 1,
    });

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
    expect(runStarted).toHaveBeenCalledTimes(1);
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
    const chatOptions = chatOptionsRef.current!;
    (chatOptions.onError as (error: Error) => void)(error);
    (chatOptions.onFinish as (event: unknown) => void)({
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

  it("persists streamed content without Cloud finish effects after disposal", async () => {
    const onFinish = vi.fn();
    const core = createCore({ chatConfig: { onFinish } });
    const messages = [{ id: "assistant-1", role: "assistant", parts: [] }];
    const stop = vi.fn().mockResolvedValue(undefined);
    const chatRegistry = new ChatRegistry(() => ({ messages, stop }) as never);
    chatRegistry.getOrCreate("chat-1", "thread-1");
    const persistChatMessages = vi
      .spyOn(core, "persistChatMessages")
      .mockResolvedValue(undefined);
    const persist = vi.spyOn(core, "persist").mockResolvedValue(undefined);
    const runStopped = vi.spyOn(core.engagementReporter, "runStopped");

    core.createChat("chat-1", chatRegistry);
    await chatRegistry.stopAll();
    const wrappedOnFinish = chatOptionsRef.current?.onFinish;
    expect(wrappedOnFinish).toBeTypeOf("function");
    (wrappedOnFinish as (event: unknown) => void)({
      isAbort: true,
      isDisconnect: false,
      isError: false,
    });

    expect(stop).toHaveBeenCalledOnce();
    expect(onFinish).toHaveBeenCalledOnce();
    expect(runStopped).not.toHaveBeenCalled();
    expect(persistChatMessages).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledWith("thread-1", messages);
  });

  it("keeps the run open across a tool loop continuation so an abort still reports the stop", async () => {
    const track = vi.fn();
    const sendMessages = vi.fn(() => Promise.resolve(new ReadableStream()));
    const core = createCore({
      cloud: { events: { track } },
      baseTransport: { sendMessages, reconnectToStream: vi.fn() },
    });
    const user = { id: "user-1", role: "user", parts: [] };
    const assistant = {
      id: "assistant-1",
      role: "assistant",
      parts: [
        { type: "step-start" },
        {
          type: "tool-search",
          toolCallId: "tool-1",
          state: "output-available",
          input: {},
          output: {},
        },
      ],
    };
    const chat = { messages: [user, assistant] };
    const chatRegistry = {
      getMeta: () => ({ threadId: "thread-1" }),
      get: () => chat,
      isDisposed: false,
    } as never;
    vi.spyOn(core, "ensureThreadId").mockResolvedValue("thread-1");
    vi.spyOn(core, "persist").mockResolvedValue(undefined);
    vi.spyOn(core, "persistChatMessages").mockResolvedValue(undefined);
    const runEnded = vi.spyOn(core.engagementReporter, "runEnded");

    core.createChat("chat-1", chatRegistry);
    const transport = core.createTransport("chat-1", chatRegistry);
    const onFinish = chatOptionsRef.current!.onFinish as (
      event: unknown,
    ) => void;
    await transport.sendMessages({
      trigger: "submit-message",
      messages: [user],
    } as never);
    onFinish({
      isAbort: false,
      isDisconnect: false,
      isError: false,
      finishReason: "tool-calls",
    });
    expect(runEnded).not.toHaveBeenCalled();

    await transport.sendMessages({
      trigger: "submit-message",
      messageId: "assistant-1",
      messages: [user, assistant],
    } as never);
    onFinish({ isAbort: true, isDisconnect: false, isError: false });

    expect(runEnded).toHaveBeenCalledOnce();
    await vi.waitFor(() =>
      expect(track).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "run_stopped", thread_id: "thread-1" }),
      ),
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
