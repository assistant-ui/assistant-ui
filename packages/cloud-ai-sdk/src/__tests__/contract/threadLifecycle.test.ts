import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloudChatCore } from "../../core/CloudChatCore";

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

vi.mock("../../chat/MessagePersistence", () => ({
  MessagePersistence: MessagePersistenceMock,
}));

function createCore() {
  const generateTitle = vi.fn();
  const selectThread = vi.fn();
  const refresh = vi.fn().mockResolvedValue(true);
  const createThread = vi.fn().mockResolvedValue({ thread_id: "new-thread-1" });

  const cloud = {
    threads: { create: createThread },
  } as never;

  const refs = {
    threadStore: {
      cloud,
      generateTitle,
      selectThread,
      refresh,
    } as never,
    callbacks: {} as never,
    onSyncError: undefined,
  };

  const core = new CloudChatCore(cloud, refs);
  return { core, createThread, selectThread, refresh, generateTitle };
}

describe("Contract: Thread lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistMock.mockResolvedValue(undefined);
    loadMessagesMock.mockResolvedValue([]);
  });

  it("deduplicates concurrent thread creation for same chatKey", async () => {
    const { core, createThread } = createCore();

    const meta = {
      threadId: null,
      creatingThread: null,
      loading: null,
      loaded: false,
    };
    const registry = {
      getOrCreateMeta: vi.fn().mockReturnValue(meta),
      setThreadId: vi.fn(),
    } as never;

    // Fire two concurrent ensureThreadId calls
    const [id1, id2] = await Promise.all([
      core.ensureThreadId("chat-1", registry),
      core.ensureThreadId("chat-1", registry),
    ]);

    expect(createThread).toHaveBeenCalledTimes(1);
    expect(id1).toBe("new-thread-1");
    expect(id2).toBe("new-thread-1");
  });

  it("cancellation prevents hydration of loaded messages", async () => {
    const { core } = createCore();

    loadMessagesMock.mockResolvedValue([
      { id: "m-1", role: "user", parts: [] },
    ]);

    const meta = {
      threadId: "thread-1",
      loading: null,
      loaded: false,
    };
    const chatInstance = { messages: [] as unknown[] };
    const registry = {
      getOrCreateMeta: vi.fn().mockReturnValue(meta),
      getOrCreate: vi.fn().mockReturnValue(chatInstance),
    } as never;

    const cancelledRef = { cancelled: true };
    await core.loadThreadMessages("thread-1", "chat-1", registry, cancelledRef);

    // Messages should NOT have been set because the load was cancelled
    expect(chatInstance.messages).toEqual([]);
    expect(meta.loaded).toBe(false);
  });

  it("load error routes to onSyncError when not cancelled", async () => {
    const onSyncError = vi.fn();
    const { core } = createCore();
    core.options.onSyncError = onSyncError;

    const failure = new Error("network error");
    loadMessagesMock.mockRejectedValue(failure);

    const meta = {
      threadId: "thread-1",
      loading: null,
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

  it("load error is suppressed when cancelled", async () => {
    const onSyncError = vi.fn();
    const { core } = createCore();
    core.options.onSyncError = onSyncError;

    loadMessagesMock.mockRejectedValue(new Error("cancelled load"));

    const meta = {
      threadId: "thread-1",
      loading: null,
      loaded: false,
    };
    const registry = {
      getOrCreateMeta: vi.fn().mockReturnValue(meta),
      getOrCreate: vi.fn().mockReturnValue({ messages: [] }),
    } as never;

    await core.loadThreadMessages("thread-1", "chat-1", registry, {
      cancelled: true,
    });

    expect(onSyncError).not.toHaveBeenCalled();
  });
});
