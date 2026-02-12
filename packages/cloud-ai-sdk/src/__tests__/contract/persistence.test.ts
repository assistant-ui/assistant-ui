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
  const refs = {
    threadStore: { generateTitle: vi.fn() } as never,
    callbacks: {} as never,
    onSyncError: undefined,
  };

  return new CloudChatCore({} as never, refs);
}

describe("Contract: Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistMock.mockResolvedValue(undefined);
    loadMessagesMock.mockResolvedValue([]);
  });

  it("persist delegates to MessagePersistence with correct args", async () => {
    const core = createCore();

    const messages = [
      { id: "m-1", role: "user" },
      { id: "m-2", role: "assistant" },
    ] as never[];

    await core.persist("thread-1", messages, {
      roles: ["user"],
      strict: true,
    });

    expect(persistMock).toHaveBeenCalledWith(
      "thread-1",
      messages,
      core.mountedRef,
      { roles: ["user"], strict: true },
    );
  });

  it("load delegates to MessagePersistence.loadMessages", async () => {
    const core = createCore();

    const expected = [{ id: "m-1", role: "user" }];
    loadMessagesMock.mockResolvedValue(expected);

    const result = await core.load("thread-1");
    expect(result).toEqual(expected);
    expect(loadMessagesMock).toHaveBeenCalledWith("thread-1");
  });

  it("persist errors route to onSyncError via MessagePersistence constructor callback", () => {
    const onSyncError = vi.fn();
    const refs = {
      threadStore: { generateTitle: vi.fn() } as never,
      callbacks: {} as never,
      onSyncError,
    };

    new CloudChatCore({} as never, refs);

    expect(MessagePersistenceMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Function),
    );

    const firstCall = MessagePersistenceMock.mock.calls[0] as
      | unknown[]
      | undefined;
    const errorHandler = firstCall?.[1] as ((err: unknown) => void) | undefined;
    expect(errorHandler).toBeTypeOf("function");
    if (!errorHandler) {
      throw new Error("MessagePersistence constructor callback was not set");
    }
    const testError = new Error("persist failed");
    errorHandler(testError);

    expect(onSyncError).toHaveBeenCalledWith(testError);
  });
});
