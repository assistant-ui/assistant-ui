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

describe("ExternalStoreThreadRuntimeCore message repository", () => {
  const repositoryWithHead = (headId: string) =>
    ExportedMessageRepository.fromBranchableArray(
      [
        { parentId: null, message: { id: "u1", role: "user", content: "u1" } },
        {
          parentId: "u1",
          message: { id: "a1", role: "assistant", content: "a1" },
        },
        { parentId: "a1", message: { id: "u2", role: "user", content: "u2" } },
      ],
      { headId },
    );
  const visibleIds = (runtime: ExternalStoreThreadRuntimeCore) =>
    runtime.messages.map((message) => message.id);
  const exportedIds = (runtime: ExternalStoreThreadRuntimeCore) =>
    runtime.export().messages.map((item) => item.message.id);

  it("keeps descendants of a non-leaf head across store updates", () => {
    const store = {
      messageRepository: repositoryWithHead("a1"),
      onNew: async () => {},
      isRunning: false,
    };
    const runtime = createRuntime(store);

    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2"]);
    expect(visibleIds(runtime)).toEqual(["u1", "a1"]);
    expect(runtime.export().headId).toBe("a1");

    runtime.__internal_setAdapter({ ...store, isRunning: true });
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2"]);
    expect(visibleIds(runtime)).toEqual(["u1", "a1"]);

    runtime.__internal_setAdapter(store);
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2"]);
    expect(visibleIds(runtime)).toEqual(["u1", "a1"]);
  });

  it.each(["u2", "a1"])(
    "keeps the exact head across store updates during a run with head %s",
    (headId) => {
      const store = {
        messageRepository: repositoryWithHead(headId),
        onNew: async () => {},
        isRunning: true,
      };
      const runtime = createRuntime(store);
      const visible = headId === "a1" ? ["u1", "a1"] : ["u1", "a1", "u2"];
      const placeholderId =
        headId === "u2" ? runtime.messages.at(-1)!.id : null;
      if (placeholderId) {
        expect(runtime.messages.at(-1)?.metadata.isOptimistic).toBe(true);
      }
      expect(visibleIds(runtime)).toEqual(
        placeholderId ? [...visible, placeholderId] : visible,
      );

      runtime.__internal_setAdapter({
        ...store,
        messageRepository: repositoryWithHead(headId),
      });
      expect(visibleIds(runtime)).toEqual(
        placeholderId ? [...visible, placeholderId] : visible,
      );

      runtime.__internal_setAdapter({
        ...store,
        messageRepository: repositoryWithHead(headId),
        isRunning: false,
      });
      expect(visibleIds(runtime)).toEqual(visible);
      expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2"]);
    },
  );

  it("shows a running sibling while retaining the previous answer", () => {
    const messages = [
      {
        parentId: null,
        message: { id: "u1", role: "user" as const, content: "u1" },
      },
      {
        parentId: "u1",
        message: { id: "a1", role: "assistant" as const, content: "a1" },
      },
      {
        parentId: "a1",
        message: { id: "u2", role: "user" as const, content: "u2" },
      },
      {
        parentId: "u2",
        message: { id: "a2", role: "assistant" as const, content: "a2" },
      },
    ];
    const store = {
      messageRepository: ExportedMessageRepository.fromBranchableArray(
        messages,
        { headId: "a2" },
      ),
      onNew: async () => {},
      isRunning: false,
    };
    const runtime = createRuntime(store);

    runtime.__internal_setAdapter({
      ...store,
      isRunning: true,
      messageRepository: ExportedMessageRepository.fromBranchableArray(
        messages,
        { headId: "u2" },
      ),
    });
    const placeholder = runtime.messages.at(-1)!;
    expect(placeholder.metadata.isOptimistic).toBe(true);
    expect(visibleIds(runtime)).toEqual(["u1", "a1", "u2", placeholder.id]);
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);

    runtime.__internal_setAdapter({
      ...store,
      messageRepository: ExportedMessageRepository.fromBranchableArray(
        [
          ...messages,
          {
            parentId: "u2",
            message: { id: "a2b", role: "assistant", content: "a2b" },
          },
        ],
        { headId: "a2b" },
      ),
    });
    expect(visibleIds(runtime)).toEqual(["u1", "a1", "u2", "a2b"]);
    expect(runtime.export().headId).toBe("a2b");
    expect(
      runtime
        .export()
        .messages.filter((item) => item.parentId === "u2")
        .map((item) => item.message.id),
    ).toEqual(["a2", "a2b"]);
  });

  it("drops an optimistic message the host stops carrying under its head", () => {
    const user = { id: "u1", role: "user" as const, content: "u1" };
    const store = {
      messageRepository: ExportedMessageRepository.fromBranchableArray(
        [
          { parentId: null, message: user },
          {
            parentId: "u1",
            message: {
              id: "a1",
              role: "assistant",
              content: "",
              metadata: { isOptimistic: true },
            },
          },
        ],
        { headId: "a1" },
      ),
      onNew: async () => {},
      setMessages: () => {},
      isRunning: false,
    };
    const runtime = createRuntime(store);
    expect(visibleIds(runtime)).toEqual(["u1", "a1"]);

    runtime.__internal_setAdapter({
      ...store,
      messageRepository: ExportedMessageRepository.fromBranchableArray(
        [{ parentId: null, message: user }],
        { headId: "u1" },
      ),
    });
    expect(visibleIds(runtime)).toEqual(["u1"]);
    expect(() => runtime.switchToBranch("a1")).toThrow(/Branch not found/);
  });
});

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

describe("ExternalStoreThreadRuntimeCore submitted feedback across branches", () => {
  const sibling: FeedbackSource = {
    id: "a2",
    role: "assistant",
    text: "again",
  };

  const createBranchingHost = (initial: readonly FeedbackSource[]) => {
    let messages = initial;
    const createStore = () =>
      ({
        ...createFeedbackStore(messages),
        setMessages: (next: readonly FeedbackSource[]) => {
          messages = next;
        },
      }) as ExternalStoreAdapter<any>;
    const runtime = new ExternalStoreThreadRuntimeCore(
      modelContextProvider,
      createStore(),
    );
    const publish = (next?: readonly FeedbackSource[]) => {
      if (next) messages = next;
      runtime.__internal_setAdapter(createStore());
    };
    return { runtime, publish };
  };

  it("keeps feedback for a message that leaves the branch and returns", () => {
    const { runtime, publish } = createBranchingHost([
      feedbackUser,
      feedbackAssistant,
    ]);
    publish([feedbackUser, sibling]);
    runtime.switchToBranch("a1");
    publish();
    runtime.submitFeedback({ messageId: "a1", type: "positive" });

    runtime.switchToBranch("a2");
    publish();
    runtime.switchToBranch("a1");
    publish();

    expect(
      runtime.getMessageById("a1")?.message.metadata.submittedFeedback,
    ).toEqual({ type: "positive" });
  });

  it("keeps feedback for a reply below a branch the host replaced", () => {
    const { runtime, publish } = createBranchingHost([
      feedbackUser,
      feedbackAssistant,
      { id: "u2", role: "user", text: "more" },
      { id: "a3", role: "assistant", text: "deeper" },
    ]);
    runtime.submitFeedback({ messageId: "a3", type: "negative" });

    publish([feedbackUser, sibling]);
    runtime.switchToBranch("a1");
    publish();

    expect(
      runtime.getMessageById("a3")?.message.metadata.submittedFeedback,
    ).toEqual({ type: "negative" });
  });

  it.each(["onDelete", "setMessages"] as const)(
    "does not restore feedback when a message deleted through %s is re-added",
    async (route) => {
      let messages: readonly FeedbackSource[] = [
        feedbackUser,
        feedbackAssistant,
      ];
      let runtime!: ExternalStoreThreadRuntimeCore;
      const createStore = () =>
        ({
          ...createFeedbackStore(messages),
          setMessages: (next: readonly FeedbackSource[]) => {
            messages = next;
          },
          ...(route === "onDelete" && {
            onDelete: async (id: string) => {
              messages = messages.filter((message) => message.id !== id);
              runtime.__internal_setAdapter(createStore());
            },
          }),
        }) as ExternalStoreAdapter<any>;
      runtime = new ExternalStoreThreadRuntimeCore(
        modelContextProvider,
        createStore(),
      );

      runtime.submitFeedback({ messageId: "a1", type: "positive" });
      await runtime.deleteMessage("a1");
      messages = [feedbackUser, feedbackAssistant];
      runtime.__internal_setAdapter(createStore());

      expect(
        runtime.getMessageById("a1")?.message.metadata.submittedFeedback,
      ).toBeUndefined();
    },
  );
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
    const confirms: Array<() => void> = [];
    const declines: Array<() => void> = [];
    const ignores: Array<() => void> = [];
    const onDelete = vi.fn(
      (id: string) =>
        new Promise<void>((resolve, reject) => {
          confirms.push(() => {
            current = current.filter((m) => m.id !== id);
            resolve();
          });
          declines.push(() => reject(new Error("deletion declined")));
          ignores.push(resolve);
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
        onEdit: async () => {
          current = [current[0]!, message("a1b", "assistant")];
        },
        setMessages,
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(store());
    return {
      runtime,
      confirmDelete: (index = 0) => confirms[index]!(),
      declineDelete: (index = 0) => declines[index]!(),
      ignoreDelete: (index = 0) => ignores[index]!(),
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
      editEarlierReply: () =>
        runtime.append({
          parentId: "u1",
          sourceId: "a1",
          role: "assistant",
          createdAt: new Date(0),
          content: [{ type: "text", text: "revised" }],
          metadata: { custom: {} },
          runConfig: {},
        }),
    };
  };

  it("keeps a delete declined after the reload scan and host truncation", async () => {
    const {
      runtime,
      regenerate,
      rerender,
      declineDelete,
      finishRun,
      switchToOldBranch,
    } = setup();

    await regenerate();
    const deletion = runtime.deleteMessage("u2");
    rerender();
    declineDelete();
    await expect(deletion).rejects.toThrow("deletion declined");
    finishRun();

    expect(switchToOldBranch()).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("evicts a delete confirmed after the reload scan and host truncation", async () => {
    const {
      runtime,
      regenerate,
      rerender,
      confirmDelete,
      finishRun,
      switchToOldBranch,
    } = setup();

    await regenerate();
    const deletion = runtime.deleteMessage("u2");
    rerender();
    expect(runtime.getBranches("u2")).toEqual(["u2"]);
    confirmDelete();
    await deletion;
    finishRun();

    expect(switchToOldBranch()).toEqual(["u1", "a1", "a2"]);
    expect(runtime.getBranches("a2")).toEqual(["a2"]);
  });

  it("evicts a confirmed delete after switching branches", async () => {
    const {
      runtime,
      regenerate,
      finishRun,
      switchToOldBranch,
      confirmDelete,
      rerender,
    } = setup();

    const deletion = runtime.deleteMessage("u2");
    await regenerate();
    finishRun();
    expect(switchToOldBranch()).toEqual(["u1", "a1", "u2", "a2"]);
    confirmDelete();
    await deletion;
    rerender();

    expect(runtime.getBranches("a2")).toEqual(["a2"]);
  });

  it("keeps a rejected delete after switching branches while another call remains pending", async () => {
    const {
      runtime,
      regenerate,
      finishRun,
      switchToOldBranch,
      declineDelete,
      confirmDelete,
      rerender,
    } = setup();

    const declined = runtime.deleteMessage("u2");
    const confirmed = runtime.deleteMessage("u2");
    await regenerate();
    finishRun();
    switchToOldBranch();
    declineDelete(0);
    await expect(declined).rejects.toThrow("deletion declined");
    rerender();
    expect(runtime.messages.map((m) => m.id)).toEqual(["u1", "a1", "u2", "a2"]);
    confirmDelete(1);
    await confirmed;
    rerender();

    expect(runtime.getBranches("a2")).toEqual(["a2"]);
  });

  it("evicts a confirmed delete after editing an earlier reply", async () => {
    const { runtime, editEarlierReply, rerender, confirmDelete } = setup();

    const deletion = runtime.deleteMessage("u2");
    await editEarlierReply();
    rerender();
    expect(runtime.export().messages.map((m) => m.message.id)).toEqual([
      "u1",
      "a1",
      "u2",
      "a2",
      "a1b",
    ]);
    confirmDelete();
    await deletion;
    rerender();

    expect(runtime.getMessageById("u2")).toBeUndefined();
    expect(runtime.getBranches("a2")).toEqual(["a2"]);
  });

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
    await runtime.startRun({ parentId: "u1", sourceId: "a1", runConfig: {} });
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

  it("evicts a second confirmed delete after a fallback id is reused", async () => {
    type Raw = { role: "user" | "assistant"; text: string };
    let current: Raw[] = [
      { role: "user", text: "u1" },
      { role: "assistant", text: "a1" },
      { role: "user", text: "old u2" },
      { role: "assistant", text: "old a2" },
    ];
    let isRunning = false;
    const confirm: Array<() => void> = [];
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          confirm.push(resolve);
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
        onReload: async () => {
          isRunning = true;
          current = current.slice(0, 1);
        },
        setMessages: vi.fn(),
      }) as ExternalStoreAdapter<Raw>;
    const runtime = new ExternalStoreThreadRuntimeCore(
      modelContextProvider,
      store(),
    );
    const ids = runtime.messages.map((m) => m.id);

    const oldDeletion = runtime.deleteMessage(ids[2]!);
    current = [
      current[0]!,
      current[1]!,
      { role: "user", text: "new u2" },
      { role: "assistant", text: "new a2" },
    ];
    runtime.__internal_setAdapter(store());
    const newDeletion = runtime.deleteMessage(ids[2]!);
    await runtime.startRun({
      parentId: ids[0]!,
      sourceId: ids[1]!,
      runConfig: {},
    });
    runtime.__internal_setAdapter(store());
    confirm[1]!();
    await newDeletion;

    expect(runtime.getMessageById(ids[2]!)).toBeUndefined();
    expect(runtime.getMessageById(ids[3]!)?.parentId).toBe(ids[1]);

    confirm[0]!();
    await oldDeletion;
  });

  it("keeps the first explicit-id delete pending after a fresh-object republish and second rejection", async () => {
    let current = [
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
      message("a2", "assistant"),
    ];
    let confirmFirst!: () => void;
    let rejectSecond!: (error: Error) => void;
    let calls = 0;
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          if (calls++ === 0) {
            confirmFirst = () => {
              current = current.filter((m) => m.id !== "u2");
              resolve();
            };
          } else {
            rejectSecond = reject;
          }
        }),
    );
    const store = () =>
      ({
        messages: current,
        onDelete,
        setMessages: vi.fn(),
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(store());

    const firstDeletion = runtime.deleteMessage("u2");
    current = [
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
      message("a2", "assistant"),
    ];
    runtime.__internal_setAdapter(store());
    const secondDeletion = runtime.deleteMessage("u2");
    rejectSecond(new Error("duplicate deletion"));
    await expect(secondDeletion).rejects.toThrow("duplicate deletion");
    current = [...current];
    runtime.__internal_setAdapter(store());
    confirmFirst();
    await firstDeletion;
    runtime.__internal_setAdapter(store());

    expect(runtime.getBranches("a2")).toEqual(["a2"]);
  });
});
