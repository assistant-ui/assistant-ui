import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloudChatCore } from "./CloudChatCore";

const { persistMock, loadMessagesMock, MessagePersistenceMock } = vi.hoisted(
  () => {
    const persist = vi.fn<(...args: unknown[]) => Promise<void>>();
    const loadMessages = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();

    const MockedClass = vi.fn(
      class {
        persist = persist;
        loadMessages = loadMessages;
      },
    );

    return {
      persistMock: persist,
      loadMessagesMock: loadMessages,
      MessagePersistenceMock: MockedClass,
    };
  },
);

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

function createCore(overrides?: {
  onSyncError?: (...args: unknown[]) => void;
  generateTitle?: (...args: unknown[]) => Promise<string | null>;
  chatConfig?: Record<string, unknown>;
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

  const core = new CloudChatCore({} as never, refs);
  return core;
}

describe("CloudChatCore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistMock.mockResolvedValue(undefined);
    loadMessagesMock.mockResolvedValue([]);
    chatOptionsRef.current = null;
  });

  it("forwards async tool call completion to the AI SDK chat", () => {
    const completion = Promise.resolve();
    const onToolCall = vi.fn(() => completion);
    const core = createCore({ chatConfig: { onToolCall } });

    core.createChat("chat-1", {} as never);

    const wrappedOnToolCall = chatOptionsRef.current?.onToolCall;
    expect(wrappedOnToolCall).toBeTypeOf("function");
    const result = (
      wrappedOnToolCall as (options: unknown) => PromiseLike<void> | void
    )({ toolCall: {} });

    expect(onToolCall).toHaveBeenCalledWith({ toolCall: {} });
    expect(result).toBe(completion);
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

    core.createChat("chat-1", {} as never);

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

    core.createChat("chat-1", {} as never);

    const wrappedOnFinish = chatOptionsRef.current?.onFinish;
    expect(wrappedOnFinish).toBeTypeOf("function");
    const result = (wrappedOnFinish as (event: unknown) => unknown)({});

    expect(result).toBeUndefined();
    await vi.waitFor(() => expect(onSyncError).toHaveBeenCalledWith(error));
  });
});
