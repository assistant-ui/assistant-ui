import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloudChatCore } from "../../core/CloudChatCore";

const { persistMock, MessagePersistenceMock } = vi.hoisted(() => {
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
    MessagePersistenceMock: MockedClass,
  };
});

vi.mock("../../chat/MessagePersistence", () => ({
  MessagePersistence: MessagePersistenceMock,
}));

function createCore() {
  const generateTitle = vi.fn();

  const refs = {
    threads: { generateTitle } as never,
    chatConfig: {} as never,
    callbacks: {} as never,
    onSyncError: undefined,
  };

  const core = new CloudChatCore({} as never, refs);
  return { core, generateTitle };
}

function mockRegistry(threadId: string, messages: unknown[]) {
  return {
    getMeta: vi.fn().mockReturnValue({ threadId }),
    getOrCreateMeta: vi.fn().mockReturnValue({ threadId }),
    get: vi.fn().mockReturnValue({ messages }),
    getOrCreate: vi.fn(),
  } as never;
}

describe("Contract: Title policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistMock.mockResolvedValue(undefined);
  });

  it("generates title exactly once for a newly created thread", async () => {
    const { core, generateTitle } = createCore();

    const registry = mockRegistry("thread-1", [
      { id: "m-1", role: "assistant" },
    ]);

    core.titlePolicy.markNewThread("thread-1");

    await core.persistChatMessages("chat-1", registry);
    await core.persistChatMessages("chat-1", registry);
    await core.persistChatMessages("chat-1", registry);

    expect(generateTitle).toHaveBeenCalledTimes(1);
    expect(generateTitle).toHaveBeenCalledWith("thread-1");
  });

  it("does not generate title for threads not marked as new", async () => {
    const { core, generateTitle } = createCore();

    const registry = mockRegistry("thread-1", [
      { id: "m-1", role: "assistant" },
    ]);

    // Do NOT call markNewThread
    await core.persistChatMessages("chat-1", registry);

    expect(generateTitle).not.toHaveBeenCalled();
  });

  it("does not generate title without assistant messages", async () => {
    const { core, generateTitle } = createCore();

    const registry = mockRegistry("thread-1", [{ id: "m-1", role: "user" }]);

    core.titlePolicy.markNewThread("thread-1");
    await core.persistChatMessages("chat-1", registry);

    expect(generateTitle).not.toHaveBeenCalled();
  });

  it("shouldGenerateTitle returns correct boolean", () => {
    const { core } = createCore();

    // Not marked as new — false
    expect(
      core.titlePolicy.shouldGenerateTitle("thread-1", [
        { id: "m-1", role: "assistant" } as never,
      ]),
    ).toBe(false);

    // Mark as new, has assistant message — true
    core.titlePolicy.markNewThread("thread-1");
    expect(
      core.titlePolicy.shouldGenerateTitle("thread-1", [
        { id: "m-1", role: "assistant" } as never,
      ]),
    ).toBe(true);

    // After marking generated — false
    core.titlePolicy.markTitleGenerated("thread-1");
    expect(
      core.titlePolicy.shouldGenerateTitle("thread-1", [
        { id: "m-1", role: "assistant" } as never,
      ]),
    ).toBe(false);
  });
});
