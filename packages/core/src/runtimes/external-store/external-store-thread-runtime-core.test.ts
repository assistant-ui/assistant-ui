import { describe, expect, it, vi } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import { createMessageQueue } from "../../runtime/queue/message-queue";
import type { Unstable_RecordToolInteractionOptions } from "../../runtime/interfaces/thread-runtime-core";
import {
  ExportedMessageRepository,
  MessageRepository,
} from "../../runtime/utils/message-repository";
import {
  fromThreadMessageLike,
  type ThreadMessageLike,
} from "../../runtime/utils/thread-message-like";
import type { AppendMessage, ThreadMessage } from "../../types/message";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import { ExternalStoreRuntimeCore } from "./external-store-runtime-core";
import { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";

const modelContextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

const interaction: Unstable_RecordToolInteractionOptions = {
  messageId: "message-1",
  toolCallId: "call-1",
  interaction: {
    type: "action",
    payload: { action: "toggle" },
    occurredAt: 0,
  },
};

const createRuntime = (overrides: Partial<ExternalStoreAdapter> = {}) =>
  new ExternalStoreThreadRuntimeCore(modelContextProvider, {
    messages: [],
    onNew: async () => {},
    ...overrides,
  } as ExternalStoreAdapter);

describe("ExternalStoreThreadRuntimeCore shared message queue", () => {
  const tail = (id: string) =>
    fromThreadMessageLike({ id, role: "assistant", content: id }, id, {
      type: "complete",
      reason: "stop",
    });
  const message = (parentId: string, steer = false): AppendMessage => ({
    parentId,
    sourceId: null,
    role: "user",
    createdAt: new Date(0),
    content: [{ type: "text", text: `after ${parentId}` }],
    metadata: { custom: {} },
    runConfig: {},
    steer,
  });

  it.each([false, true])(
    "dispatches through the runtime that queued the item (steer: %s)",
    async (steer) => {
      const run = vi.fn();
      const queue = createMessageQueue({ run });
      queue.notifyBusy();
      const storeA: ExternalStoreAdapter = {
        messages: [tail("a1")],
        onNew: async () => {},
        queue: queue.adapter,
      };
      const runtimeA = new ExternalStoreThreadRuntimeCore(
        {
          getModelContext: () => ({
            unstable_composerMetadata: { owner: "a" },
          }),
        },
        storeA,
      );
      await runtimeA.append(message("a1", steer));

      const runtimeB = createRuntime({
        messages: [tail("b1")],
        queue: queue.adapter,
      });
      await runtimeB.append(message("b1"));
      runtimeA.__internal_setAdapter({
        ...storeA,
        messages: [tail("a1"), tail("a2")],
      });
      expect(run).not.toHaveBeenCalled();

      queue.notifyIdle();

      expect(run).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          parentId: "a2",
          metadata: { custom: { owner: "a" } },
        }),
        { steer: false },
      );
      queue.notifyIdle();
      expect(run).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ parentId: "b1" }),
        { steer: false },
      );
    },
  );

  it("flushes pending items through the replacement core after a thread switch", async () => {
    const run = vi.fn();
    const queue = createMessageQueue({ run });
    queue.notifyBusy();
    const store: ExternalStoreAdapter = {
      messages: [tail("a1")],
      onNew: async () => {},
      queue: queue.adapter,
      adapters: { threadList: { threadId: "a" } },
    };
    const runtime = new ExternalStoreRuntimeCore(store);
    await runtime.threads.getMainThreadRuntimeCore().append(message("a1"));
    runtime.setAdapter({
      ...store,
      messages: [tail("b1")],
      adapters: { threadList: { threadId: "b" } },
    });
    runtime.setAdapter({
      ...store,
      messages: [tail("b1"), tail("b2")],
      adapters: { threadList: { threadId: "b" } },
    });

    queue.notifyIdle();

    expect(run).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ parentId: "b2" }),
      { steer: false },
    );
  });
});

type FeedbackSource = {
  id: string;
  role: "assistant" | "user";
  text: string;
  submittedFeedback?: { type: "positive" | "negative"; comment?: string };
};

const feedbackMessage = (message: FeedbackSource): ThreadMessageLike => ({
  id: message.id,
  role: message.role,
  content: [{ type: "text", text: message.text }],
  ...(message.submittedFeedback && {
    metadata: { submittedFeedback: message.submittedFeedback },
  }),
});

const createFeedbackStore = (
  messages: readonly FeedbackSource[],
  convertMessage: (
    message: FeedbackSource,
  ) => ThreadMessageLike = feedbackMessage,
) =>
  ({
    messages,
    convertMessage,
    onNew: async () => {},
    adapters: { feedback: { submit: vi.fn() } },
  }) as unknown as ExternalStoreAdapter<any>;

const createFeedbackRuntime = (
  messages: readonly FeedbackSource[],
  convertMessage?: (message: FeedbackSource) => ThreadMessageLike,
) =>
  new ExternalStoreThreadRuntimeCore(
    modelContextProvider,
    createFeedbackStore(messages, convertMessage),
  );

const feedbackUser: FeedbackSource = {
  id: "u1",
  role: "user",
  text: "hi",
};
const feedbackAssistant: FeedbackSource = {
  id: "a1",
  role: "assistant",
  text: "hello",
};

describe("ExternalStoreThreadRuntimeCore interaction recording", () => {
  it("delegates interaction records to the adapter", async () => {
    const onRecordToolInteraction = vi.fn(async () => {});
    const runtime = createRuntime({
      unstable_onRecordToolInteraction: onRecordToolInteraction,
    });

    await runtime.unstable_recordToolInteraction(interaction);

    expect(onRecordToolInteraction).toHaveBeenCalledExactlyOnceWith(
      interaction,
    );
  });

  it("rejects when the adapter does not record interactions", async () => {
    const runtime = createRuntime();

    await expect(
      runtime.unstable_recordToolInteraction(interaction),
    ).rejects.toThrow("Runtime does not support recording tool interactions.");
  });
});

describe("ExternalStoreThreadRuntimeCore submitted feedback", () => {
  it("preserves feedback when the host supplies a new array and converter", () => {
    const messages = [feedbackUser, feedbackAssistant];
    const runtime = createFeedbackRuntime(messages, (message) =>
      feedbackMessage(message),
    );

    runtime.submitFeedback({ messageId: "a1", type: "positive" });
    runtime.__internal_setAdapter(
      createFeedbackStore([...messages], (message) => feedbackMessage(message)),
    );

    expect(
      runtime.getMessageById("a1")?.message.metadata.submittedFeedback,
    ).toEqual({ type: "positive" });
  });

  it("preserves feedback when a new array reuses the converter cache", () => {
    const messages = [feedbackUser, feedbackAssistant];
    const converter = (message: FeedbackSource) => feedbackMessage(message);
    const runtime = createFeedbackRuntime(messages, converter);

    runtime.submitFeedback({ messageId: "a1", type: "positive" });
    runtime.__internal_setAdapter(
      createFeedbackStore([...messages], converter),
    );

    expect(
      runtime.getMessageById("a1")?.message.metadata.submittedFeedback,
    ).toEqual({ type: "positive" });
  });

  it("does not move feedback to a new message at a positional fallback id", () => {
    const withoutIds = (message: FeedbackSource): ThreadMessageLike => ({
      role: message.role,
      content: [{ type: "text", text: message.text }],
    });
    const messages = [feedbackUser, feedbackAssistant];
    const runtime = createFeedbackRuntime(messages, withoutIds);
    const ratedId = runtime.messages[1]!.id;

    runtime.submitFeedback({ messageId: ratedId, type: "positive" });
    runtime.__internal_setAdapter(
      createFeedbackStore(
        [
          { id: "u0", role: "user", text: "earlier" },
          { id: "a0", role: "assistant", text: "earlier reply" },
          ...messages,
        ],
        withoutIds,
      ),
    );

    expect(runtime.messages[1]?.metadata.submittedFeedback).toBeUndefined();
    expect(runtime.messages[3]?.metadata.submittedFeedback).toBeUndefined();
  });

  it("keeps a voted message's identity across identical host snapshots", () => {
    const messages = [feedbackUser, feedbackAssistant];
    const converter = (message: FeedbackSource) => feedbackMessage(message);
    const runtime = createFeedbackRuntime(messages, converter);

    runtime.submitFeedback({ messageId: "a1", type: "positive" });
    const votedMessage = runtime.getMessageById("a1")!.message;
    for (let i = 0; i < 5; i++) {
      runtime.__internal_setAdapter(
        createFeedbackStore([...messages], converter),
      );
      expect(runtime.getMessageById("a1")!.message).toBe(votedMessage);
    }

    runtime.submitFeedback({ messageId: "a1", type: "negative" });
    const revisedMessage = runtime.getMessageById("a1")!.message;
    expect(revisedMessage.metadata.submittedFeedback).toEqual({
      type: "negative",
    });
    runtime.__internal_setAdapter(
      createFeedbackStore([...messages], converter),
    );
    expect(runtime.getMessageById("a1")!.message).toBe(revisedMessage);
    for (let i = 0; i < 5; i++) {
      runtime.__internal_setAdapter(
        createFeedbackStore([...messages], converter),
      );
      expect(runtime.getMessageById("a1")!.message).toBe(revisedMessage);
    }
  });

  it("preserves feedback across exported repository snapshots", () => {
    const createMessageRepository = () =>
      ExportedMessageRepository.fromArray([
        { id: "u1", role: "user", content: "hi" },
        { id: "a1", role: "assistant", content: "hello" },
      ]);
    const createStore = () =>
      ({
        messageRepository: createMessageRepository(),
        onNew: async () => {},
        adapters: { feedback: { submit: vi.fn() } },
      }) as ExternalStoreAdapter;
    const runtime = new ExternalStoreThreadRuntimeCore(
      modelContextProvider,
      createStore(),
    );

    runtime.submitFeedback({ messageId: "a1", type: "positive" });
    runtime.__internal_setAdapter(createStore());

    expect(
      runtime.getMessageById("a1")?.message.metadata.submittedFeedback,
    ).toEqual({ type: "positive" });
  });

  it("keeps a later local rating against the original host value", () => {
    const messages = [feedbackUser, feedbackAssistant];
    const converter = (message: FeedbackSource) => feedbackMessage(message);
    const runtime = createFeedbackRuntime(messages, converter);

    runtime.submitFeedback({ messageId: "a1", type: "positive" });
    runtime.submitFeedback({ messageId: "a1", type: "negative" });
    runtime.__internal_setAdapter(
      createFeedbackStore([...messages], converter),
    );

    expect(
      runtime.getMessageById("a1")?.message.metadata.submittedFeedback,
    ).toEqual({ type: "negative" });
  });

  it("honors changed host feedback and a later host clear", () => {
    const messages = [
      feedbackUser,
      {
        ...feedbackAssistant,
        submittedFeedback: { type: "positive" as const },
      },
    ];
    const converter = (message: FeedbackSource) => feedbackMessage(message);
    const runtime = createFeedbackRuntime(messages, converter);

    runtime.submitFeedback({ messageId: "a1", type: "negative" });
    runtime.__internal_setAdapter(
      createFeedbackStore(
        [
          feedbackUser,
          { ...feedbackAssistant, submittedFeedback: { type: "negative" } },
        ],
        converter,
      ),
    );
    expect(
      runtime.getMessageById("a1")?.message.metadata.submittedFeedback,
    ).toEqual({ type: "negative" });

    runtime.__internal_setAdapter(
      createFeedbackStore([feedbackUser, feedbackAssistant], converter),
    );
    expect(
      runtime.getMessageById("a1")?.message.metadata.submittedFeedback,
    ).toBeUndefined();
  });

  it("drops feedback for a message removed by the host", () => {
    const messages = [feedbackUser, feedbackAssistant];
    const converter = (message: FeedbackSource) => feedbackMessage(message);
    const runtime = createFeedbackRuntime(messages, converter);

    runtime.submitFeedback({ messageId: "a1", type: "positive" });
    runtime.__internal_setAdapter(
      createFeedbackStore([feedbackUser], converter),
    );
    runtime.__internal_setAdapter(
      createFeedbackStore([feedbackUser, feedbackAssistant], converter),
    );

    expect(
      runtime.getMessageById("a1")?.message.metadata.submittedFeedback,
    ).toBeUndefined();
  });

  it("does not carry feedback through a thread reset", () => {
    const messages = [feedbackUser, feedbackAssistant];
    const converter = (message: FeedbackSource) => feedbackMessage(message);
    const runtime = createFeedbackRuntime(messages, converter);

    runtime.submitFeedback({ messageId: "a1", type: "positive" });
    runtime.reset(messages.map(feedbackMessage));
    runtime.__internal_setAdapter(
      createFeedbackStore([...messages], converter),
    );

    expect(
      runtime.getMessageById("a1")?.message.metadata.submittedFeedback,
    ).toBeUndefined();
  });
});

describe("ExternalStoreThreadRuntimeCore earlier messages", () => {
  it("reports earlier messages only when the adapter can load them", () => {
    expect(createRuntime({ hasEarlier: true }).hasEarlier).toBe(false);
    expect(createRuntime({ onLoadEarlier: async () => {} }).hasEarlier).toBe(
      false,
    );
    expect(
      createRuntime({ hasEarlier: true, onLoadEarlier: async () => {} })
        .hasEarlier,
    ).toBe(true);
  });

  it("shares one in-flight load and reports it until it settles", async () => {
    let finish!: () => void;
    const onLoadEarlier = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    const runtime = createRuntime({ hasEarlier: true, onLoadEarlier });
    const notified = vi.fn();
    runtime.subscribe(notified);

    const first = runtime.loadEarlier();
    const second = runtime.loadEarlier();
    expect(second).toBe(first);
    expect(runtime.isLoadingEarlier).toBe(true);
    expect(notified).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(onLoadEarlier).toHaveBeenCalledTimes(1);

    finish();
    await first;
    expect(runtime.isLoadingEarlier).toBe(false);
    expect(notified).toHaveBeenCalledTimes(2);
  });

  it("logs a rejected load and clears the loading state", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const runtime = createRuntime({
      hasEarlier: true,
      onLoadEarlier: async () => {
        throw new Error("offline");
      },
    });

    await runtime.loadEarlier();
    expect(runtime.isLoadingEarlier).toBe(false);
    expect(error).toHaveBeenCalledWith(
      "[ExternalStoreThreadRuntimeCore] onLoadEarlier callback rejected",
      new Error("offline"),
    );
    error.mockRestore();
  });

  it("resolves without calling the adapter when nothing earlier exists", async () => {
    const onLoadEarlier = vi.fn(async () => {});
    const runtime = createRuntime({ hasEarlier: false, onLoadEarlier });

    await runtime.loadEarlier();
    expect(onLoadEarlier).not.toHaveBeenCalled();
    expect(runtime.isLoadingEarlier).toBe(false);
  });
});

describe("ExternalStoreThreadRuntimeCore deletion during reload", () => {
  const message = (id: string, role: "user" | "assistant") =>
    fromThreadMessageLike({ id, role, content: id }, id, {
      type: "complete",
      reason: "stop",
    });

  const setup = ({ reloadFails = false } = {}) => {
    let current = [
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
      message("a2", "assistant"),
    ];
    let isRunning = false;
    let confirm!: () => void;
    let decline!: () => void;
    let ignore!: () => void;
    const onDelete = vi.fn(
      (id: string) =>
        new Promise<void>((resolve, reject) => {
          confirm = () => {
            current = current.filter((m) => m.id !== id);
            resolve();
          };
          decline = () => reject(new Error("deletion declined"));
          ignore = resolve;
        }),
    );
    const onReload = vi.fn(async (parentId: string | null) => {
      if (reloadFails) throw new Error("reload failed");
      isRunning = true;
      current = current.slice(
        0,
        current.findIndex((m) => m.id === parentId) + 1,
      );
    });
    const setMessages = vi.fn((messages: readonly ThreadMessage[]) => {
      current = [...messages];
    });
    const store = () =>
      ({
        messages: current,
        isRunning,
        onDelete,
        onReload,
        setMessages,
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(store());
    return {
      runtime,
      confirmDelete: () => confirm(),
      declineDelete: () => decline(),
      ignoreDelete: () => ignore(),
      regenerate: () =>
        runtime.startRun({ parentId: "u1", sourceId: "a1", runConfig: {} }),
      rerender: () => {
        current = [...current];
        runtime.__internal_setAdapter(store());
      },
      finishRun: () => {
        current = [message("u1", "user"), message("a1b", "assistant")];
        isRunning = false;
        runtime.__internal_setAdapter(store());
      },
      switchToOldBranch: () => {
        runtime.switchToBranch("a1");
        return setMessages.mock.lastCall?.[0].map((m) => m.id);
      },
    };
  };

  it("does not restore a message deleted while an earlier reply regenerates", async () => {
    const {
      runtime,
      confirmDelete,
      regenerate,
      rerender,
      finishRun,
      switchToOldBranch,
    } = setup();

    const deletion = runtime.deleteMessage("u2");
    await regenerate();
    rerender();
    confirmDelete();
    await deletion;
    rerender();
    finishRun();

    expect(switchToOldBranch()).toEqual(["u1", "a1", "a2"]);
  });

  it("keeps a message the host declined to delete on the old branch", async () => {
    const {
      runtime,
      declineDelete,
      regenerate,
      rerender,
      finishRun,
      switchToOldBranch,
    } = setup();

    const deletion = runtime.deleteMessage("u2");
    await regenerate();
    rerender();
    declineDelete();
    await expect(deletion).rejects.toThrow("deletion declined");
    rerender();
    finishRun();

    expect(switchToOldBranch()).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("keeps a message the host still carries when the reload fails", async () => {
    const { runtime, ignoreDelete, regenerate } = setup({
      reloadFails: true,
    });

    const deletion = runtime.deleteMessage("u2");
    await expect(regenerate()).rejects.toThrow("reload failed");
    ignoreDelete();
    await deletion;

    expect(runtime.messages.map((m) => m.id)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("evicts a deletion the host publishes after the reload failed", async () => {
    const { runtime, confirmDelete, regenerate, rerender } = setup({
      reloadFails: true,
    });

    const deletion = runtime.deleteMessage("u2");
    await expect(regenerate()).rejects.toThrow("reload failed");
    confirmDelete();
    await deletion;
    rerender();

    expect(runtime.messages.map((m) => m.id)).toEqual(["u1", "a1", "a2"]);
    expect(runtime.getBranches("a2")).toEqual(["a2"]);
  });

  it("evicts an id-less message deleted from the old branch", async () => {
    type Raw = { role: "user" | "assistant"; text: string };
    let current: Raw[] = [
      { role: "user", text: "u1" },
      { role: "assistant", text: "a1" },
      { role: "user", text: "u2" },
      { role: "assistant", text: "a2" },
    ];
    let isRunning = false;
    let confirm!: () => void;
    const onDelete = vi.fn(
      (id: string) =>
        new Promise<void>((resolve) => {
          confirm = () => {
            current = current.filter(
              (_, index) => index !== Number(id.split("_").at(-1)),
            );
            resolve();
          };
        }),
    );
    const convertMessage = (raw: Raw): ThreadMessageLike => ({
      role: raw.role,
      content: raw.text,
    });
    const store = () =>
      ({
        messages: current,
        isRunning,
        convertMessage,
        onNew: async () => {},
        onDelete,
        onReload: async (parentId: string | null) => {
          isRunning = true;
          current = current.slice(0, Number(parentId?.split("_").at(-1)) + 1);
        },
        setMessages: vi.fn(),
      }) as ExternalStoreAdapter<Raw>;
    const runtime = new ExternalStoreThreadRuntimeCore(
      modelContextProvider,
      store(),
    );
    const ids = runtime.messages.map((m) => m.id);

    const deletion = runtime.deleteMessage(ids[2]!);
    await runtime.startRun({
      parentId: ids[0]!,
      sourceId: ids[1]!,
      runConfig: {},
    });
    runtime.__internal_setAdapter(store());
    confirm();
    await deletion;

    expect(runtime.getMessageById(ids[2]!)).toBeUndefined();
    expect(runtime.getMessageById(ids[3]!)?.parentId).toBe(ids[1]);
  });

  it("does not settle a replacement repository's same-id delete from an older callback", async () => {
    const repositories = [new MessageRepository(), new MessageRepository()];
    const messages = [
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
    ];
    let resolveOld!: () => void;
    let rejectNew!: (error: Error) => void;
    let isRunning = false;
    const oldDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveOld = resolve;
        }),
    );
    const newDelete = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectNew = reject;
        }),
    );
    const store = (index: number) =>
      ({
        messages,
        isRunning,
        unstable_messageRepositoryInstance: repositories[index],
        onNew: async () => {},
        onDelete: index === 0 ? oldDelete : newDelete,
        onReload: async () => {
          isRunning = true;
        },
        setMessages: vi.fn(),
      }) as ExternalStoreAdapter;
    const runtime = new ExternalStoreThreadRuntimeCore(
      modelContextProvider,
      store(0),
    );
    const oldDeletion = runtime.deleteMessage("u2");
    runtime.__internal_setAdapter(store(1));
    const newDeletion = runtime.deleteMessage("u2");
    await runtime.startRun({ parentId: "u1", sourceId: "a1", runConfig: {} });
    runtime.__internal_setAdapter({ ...store(1), messages: [messages[0]!] });
    resolveOld();
    await oldDeletion;

    expect(runtime.getMessageById("u2")?.message.id).toBe("u2");
    rejectNew(new Error("declined"));
    await expect(newDeletion).rejects.toThrow("declined");
    expect(runtime.getMessageById("u2")?.message.id).toBe("u2");
  });
});
