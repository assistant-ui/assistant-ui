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

vi.mock("../chat/MessagePersistence", () => ({
  MessagePersistence: MessagePersistenceMock,
}));

function createCore(overrides?: {
  onSyncError?: (...args: unknown[]) => void;
  generateTitle?: (...args: unknown[]) => void;
}) {
  const generateTitle = overrides?.generateTitle ?? vi.fn();
  const onSyncError = overrides?.onSyncError;

  const refs = {
    threadStore: { generateTitle } as never,
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
  });

  it("generates a title once for a newly created thread after assistant output", async () => {
    const generateTitle = vi.fn();
    const core = createCore({ generateTitle });

    const meta = { threadId: "thread-1", loading: null, loaded: false };
    const registry = {
      getMeta: vi.fn().mockReturnValue(meta),
      getOrCreateMeta: vi.fn().mockReturnValue(meta),
      get: vi.fn().mockReturnValue({
        messages: [{ id: "m-1", role: "assistant" }],
      }),
      getOrCreate: vi.fn(),
    } as never;

    core.titlePolicy.markNewThread("thread-1");
    await core.persistChatMessages("chat-1", registry);
    await core.persistChatMessages("chat-1", registry);

    expect(persistMock).toHaveBeenCalled();
    expect(generateTitle).toHaveBeenCalledTimes(1);
    expect(generateTitle).toHaveBeenCalledWith("thread-1");
  });

  it("routes load errors to onSyncError and clears loading state", async () => {
    const onSyncError = vi.fn();
    const failure = new Error("load failed");
    loadMessagesMock.mockRejectedValue(failure);

    const core = createCore({ onSyncError });

    const meta = {
      threadId: "thread-1",
      loading: Promise.resolve(),
      loaded: false,
    };
    const registry = {
      getOrCreateMeta: vi.fn().mockReturnValue(meta),
      getOrCreate: vi.fn().mockReturnValue({ messages: [] }),
    } as never;

    await core.loadThreadMessages("thread-1", "chat-1", registry, {
      cancelled: false,
    });

    expect(onSyncError).toHaveBeenCalledWith(failure);
    expect(meta.loading).toBeNull();
  });
});
