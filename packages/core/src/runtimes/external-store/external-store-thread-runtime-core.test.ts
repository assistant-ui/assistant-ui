import { describe, expect, it, vi } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import { createMessageQueue } from "../../runtime/queue/message-queue";
import type { Unstable_RecordToolInteractionOptions } from "../../runtime/interfaces/thread-runtime-core";
import { ExportedMessageRepository } from "../../runtime/utils/message-repository";
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

  it("settles the queued runtime's cancel rollback before a shared queue dispatch", async () => {
    const user = (id: string, text: string) =>
      fromThreadMessageLike({ id, role: "user", content: text }, id, {
        type: "complete",
        reason: "stop",
      });
    const writes: string[] = [];
    let hostA = [tail("a0"), user("a1", "unanswered")];
    const setMessagesA = vi.fn((messages: readonly ThreadMessage[]) => {
      writes.push("rollback");
      hostA = [...messages];
    });
    const run = vi.fn((queued: AppendMessage) => {
      writes.push("send");
      expect(queued.parentId).toBe("a0");
      hostA = [...hostA, user("a2", "next")];
    });
    const queue = createMessageQueue({ run });
    queue.notifyBusy();
    const runtimeA = createRuntime({
      messages: hostA,
      isRunning: true,
      onCancel: vi.fn(),
      setMessages: setMessagesA,
      queue: queue.adapter,
    });

    vi.useFakeTimers({ toFake: ["setTimeout"] });
    try {
      runtimeA.cancelRun();
      await runtimeA.append(message("a0"));

      const setMessagesB = vi.fn();
      const runtimeB = createRuntime({
        messages: [tail("b0")],
        setMessages: setMessagesB,
        queue: queue.adapter,
      });
      expect(run).not.toHaveBeenCalled();

      queue.notifyIdle();
      expect(writes).toEqual(["rollback", "send"]);
      vi.runAllTimers();

      expect(hostA.map(({ id }) => id)).toEqual(["a0", "a2"]);
      expect(runtimeA.composer.text).toBe("unanswered");
      expect(setMessagesA).toHaveBeenCalledOnce();
      expect(runtimeB.messages.map(({ id }) => id)).toEqual(["b0"]);
      expect(setMessagesB).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

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
