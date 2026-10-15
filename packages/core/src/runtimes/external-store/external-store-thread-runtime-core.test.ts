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
  const repositoryWithDescendants = (headId: string) =>
    ExportedMessageRepository.fromBranchableArray(
      [
        { parentId: null, message: { id: "u1", role: "user", content: "u1" } },
        {
          parentId: "u1",
          message: { id: "a1", role: "assistant", content: "a1" },
        },
        { parentId: "a1", message: { id: "u2", role: "user", content: "u2" } },
        {
          parentId: "u2",
          message: { id: "a2", role: "assistant", content: "a2" },
        },
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

  it("keeps imported descendants until the host changes its visible path", () => {
    let hostMessages: readonly ThreadMessage[] = [];
    const store = {
      messages: hostMessages,
      onNew: async () => {},
      onImport: (messages: readonly ThreadMessage[]) => {
        hostMessages = messages;
      },
    };
    const runtime = createRuntime(store);
    runtime.import(repositoryWithDescendants("a1"));

    runtime.__internal_setAdapter({ ...store, messages: hostMessages });
    expect(visibleIds(runtime)).toEqual(["u1", "a1"]);
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);

    runtime.__internal_setAdapter({
      ...store,
      messages: hostMessages,
      isRunning: true,
    });
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);

    runtime.__internal_setAdapter({
      ...store,
      messages: hostMessages.slice(0, 1),
      isRunning: false,
    });
    expect(exportedIds(runtime)).toEqual(["u1"]);
  });

  it("keeps imported descendants when the host republishes the same path", () => {
    let hostMessages: readonly ThreadMessage[] = [];
    const store = {
      messages: hostMessages,
      onNew: async () => {},
      onImport: (messages: readonly ThreadMessage[]) => {
        hostMessages = messages;
      },
    };
    const runtime = createRuntime(store);
    runtime.import(repositoryWithDescendants("a1"));
    runtime.__internal_setAdapter({ ...store, messages: hostMessages });
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);

    runtime.__internal_setAdapter({ ...store, messages: [...hostMessages] });
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("keeps imported descendants when the host edits the same visible path", () => {
    let hostMessages: readonly ThreadMessage[] = [];
    const store = {
      messages: hostMessages,
      onNew: async () => {},
      onImport: (messages: readonly ThreadMessage[]) => {
        hostMessages = messages;
      },
    };
    const runtime = createRuntime(store);
    runtime.import(repositoryWithDescendants("a1"));
    runtime.__internal_setAdapter({ ...store, messages: hostMessages });
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);

    const editedMessages = hostMessages.map((message) =>
      message.id === "a1"
        ? { ...message, content: [{ type: "text" as const, text: "edited" }] }
        : message,
    );
    runtime.__internal_setAdapter({ ...store, messages: editedMessages });
    expect(visibleIds(runtime)).toEqual(["u1", "a1"]);
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("keeps descendants when a matching pre-import path precedes the host echo", () => {
    const imported = repositoryWithDescendants("a1");
    const priorMessages = imported.messages
      .slice(0, 2)
      .map(({ message }) => message);
    let hostMessages: readonly ThreadMessage[] = [];
    const store = {
      messages: priorMessages,
      onNew: async () => {},
      onImport: (messages: readonly ThreadMessage[]) => {
        hostMessages = messages;
      },
    };
    const runtime = createRuntime(store);
    runtime.import(imported);

    runtime.__internal_setAdapter({ ...store, isRunning: true });
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);

    runtime.__internal_setAdapter({
      ...store,
      messages: hostMessages,
      isRunning: true,
    });
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("ends import preservation after the visible id path changes", () => {
    const imported = repositoryWithDescendants("a1");
    let hostMessages: readonly ThreadMessage[] = [];
    const store = {
      messages: hostMessages,
      onNew: async () => {},
      onImport: (messages: readonly ThreadMessage[]) => {
        hostMessages = messages;
      },
    };
    const runtime = createRuntime(store);
    runtime.import(imported);
    runtime.__internal_setAdapter({ ...store, messages: hostMessages });

    runtime.__internal_setAdapter({
      ...store,
      messages: [...hostMessages, imported.messages[2]!.message],
    });
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2"]);

    runtime.__internal_setAdapter({ ...store, messages: [...hostMessages] });
    expect(exportedIds(runtime)).toEqual(["u1", "a1"]);
  });

  it("prunes a host-dropped tail after the import echo", () => {
    let hostMessages: readonly ThreadMessage[] = [];
    const store = {
      messages: hostMessages,
      onNew: async () => {},
      onImport: (messages: readonly ThreadMessage[]) => {
        hostMessages = messages;
      },
    };
    const runtime = createRuntime(store);
    runtime.import(repositoryWithDescendants("u2"));
    runtime.__internal_setAdapter({ ...store, messages: hostMessages });
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);

    runtime.__internal_setAdapter({
      ...store,
      messages: hostMessages.slice(0, -1),
    });
    expect(visibleIds(runtime)).toEqual(["u1", "a1"]);
    expect(exportedIds(runtime)).toEqual(["u1", "a1"]);
  });

  it("prunes below the host tail when its path changes during a run", () => {
    let hostMessages: readonly ThreadMessage[] = [];
    const store = {
      messages: hostMessages,
      onNew: async () => {},
      onImport: (messages: readonly ThreadMessage[]) => {
        hostMessages = messages;
      },
    };
    const runtime = createRuntime(store);
    runtime.import(repositoryWithDescendants("u2"));
    runtime.__internal_setAdapter({ ...store, messages: hostMessages });

    runtime.__internal_setAdapter({
      ...store,
      messages: hostMessages.slice(0, 1),
      isRunning: true,
    });
    expect(visibleIds(runtime).slice(0, -1)).toEqual(["u1"]);
    expect(runtime.messages.at(-1)?.metadata.isOptimistic).toBe(true);
    expect(exportedIds(runtime)).toEqual(["u1"]);
  });

  it("keeps descendants through a running same-path republish", () => {
    let hostMessages: readonly ThreadMessage[] = [];
    const store = {
      messages: hostMessages,
      onNew: async () => {},
      onImport: (messages: readonly ThreadMessage[]) => {
        hostMessages = messages;
      },
    };
    const runtime = createRuntime(store);
    runtime.import(repositoryWithDescendants("u2"));
    runtime.__internal_setAdapter({ ...store, messages: hostMessages });
    runtime.__internal_setAdapter({
      ...store,
      messages: [...hostMessages],
      isRunning: true,
    });

    expect(visibleIds(runtime).slice(0, -1)).toEqual(["u1", "a1", "u2"]);
    expect(runtime.messages.at(-1)?.metadata.isOptimistic).toBe(true);
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);

    runtime.__internal_setAdapter({
      ...store,
      messages: [...hostMessages],
      isRunning: false,
    });
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);
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

  it("keeps the queuing runtime when the host edits a shared queue item", async () => {
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
    const runtimeB = new ExternalStoreThreadRuntimeCore(
      {
        getModelContext: () => ({
          unstable_composerMetadata: { owner: "b" },
        }),
      },
      {
        messages: [tail("b1")],
        onNew: async () => {},
        queue: queue.adapter,
      },
    );
    await runtimeA.append(message("a1"));
    await runtimeB.append(message("b1"));
    runtimeA.__internal_setAdapter({
      ...storeA,
      messages: [tail("a1"), tail("a2")],
    });

    queue.adapter.edit(queue.adapter.items[0]!.id, message("edited"));
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
      expect.objectContaining({
        parentId: "b1",
        metadata: { custom: { owner: "b" } },
      }),
      { steer: false },
    );
  });

  it("keeps the queuing runtime with a host-owned dispatch transform", async () => {
    const queued: AppendMessage[] = [];
    let transform = (message: AppendMessage) => message;
    const hostQueue = {
      items: [],
      steerItems: [],
      enqueue: (message: AppendMessage) => queued.push(message),
      steer: (message: AppendMessage) => queued.push(message),
      move: vi.fn(),
      edit: vi.fn(),
      remove: vi.fn(),
      __internal_setDispatchTransform: (
        next: (message: AppendMessage) => AppendMessage,
      ) => {
        transform = next;
      },
    };
    const storeA: ExternalStoreAdapter = {
      messages: [tail("a1")],
      onNew: async () => {},
      queue: hostQueue,
    };
    const runtimeA = new ExternalStoreThreadRuntimeCore(
      {
        getModelContext: () => ({
          unstable_composerMetadata: { owner: "a" },
        }),
      },
      storeA,
    );
    const runtimeB = new ExternalStoreThreadRuntimeCore(
      {
        getModelContext: () => ({
          unstable_composerMetadata: { owner: "b" },
        }),
      },
      {
        messages: [tail("b1")],
        onNew: async () => {},
        queue: hostQueue,
      },
    );
    await runtimeA.append(message("a1"));
    await runtimeB.append(message("b1"));
    runtimeA.__internal_setAdapter({
      ...storeA,
      messages: [tail("a1"), tail("a2")],
    });

    expect(queued).toHaveLength(2);
    expect(transform(queued[0]!)).toMatchObject({
      parentId: "a2",
      metadata: { custom: { owner: "a" } },
    });
    expect(transform(queued[1]!)).toMatchObject({
      parentId: "b1",
      metadata: { custom: { owner: "b" } },
    });
  });

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
    queue.adapter.edit(queue.adapter.items[0]!.id, message("edited"));
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

describe("ExternalStoreThreadRuntimeCore resume compatibility", () => {
  it("accepts explicit undefined checkpoint availability", () => {
    const adapter = {
      messages: [],
      onNew: vi.fn(),
      canResume: undefined,
    } satisfies ExternalStoreAdapter;
    expect(
      new ExternalStoreThreadRuntimeCore(modelContextProvider, adapter)
        .canResume,
    ).toBe(false);
  });

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    "shares one opt-in attempt across configs when callback changes=%s and availability clears=%s",
    async (changeCallback, clearAvailability) => {
      let finish!: () => void;
      const onResume = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      );
      const replacement = vi.fn(async () => {});
      const runtime = createRuntime({ canResume: true, onResume });
      const firstConfig = { parentId: null, sourceId: null, runConfig: {} };
      const nextConfig = {
        ...firstConfig,
        runConfig: { custom: { mode: "next" } },
      };
      const first = runtime.resumeRun(firstConfig);
      const currentCallback = changeCallback ? replacement : onResume;
      runtime.__internal_setAdapter({
        messages: [],
        onNew: async () => {},
        onResume: currentCallback,
        canResume: !clearAvailability,
      });
      const next = runtime.resumeRun(nextConfig);

      expect(onResume).toHaveBeenCalledExactlyOnceWith(firstConfig);
      expect(replacement).not.toHaveBeenCalled();
      expect(runtime.canResume).toBe(false);
      finish();
      await Promise.all([first, next]);
      expect(runtime.canResume).toBe(!clearAvailability);

      runtime.__internal_setAdapter({
        messages: [],
        onNew: async () => {},
        onResume: currentCallback,
        canResume: true,
      });
      onResume.mockResolvedValue(undefined);
      await runtime.resumeRun(nextConfig);
      expect(currentCallback).toHaveBeenLastCalledWith(nextConfig);
      expect(currentCallback).toHaveBeenCalledTimes(changeCallback ? 1 : 2);
      expect(runtime.canResume).toBe(true);
    },
  );

  it("shares an opt-in failure and accepts a new config on retry", async () => {
    let fail!: (error: Error) => void;
    const onResume = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            fail = reject;
          }),
      )
      .mockResolvedValue(undefined);
    const runtime = createRuntime({ canResume: true, onResume });
    const config = { parentId: null, sourceId: null, runConfig: {} };
    const nextConfig = { ...config, runConfig: { custom: { mode: "retry" } } };
    const pending = runtime.resumeRun(config);
    const duplicate = runtime.resumeRun(nextConfig);
    const outcomes = Promise.allSettled([pending, duplicate]);
    const error = new Error("Reconnect failed");
    fail(error);

    expect(await outcomes).toEqual([
      { status: "rejected", reason: error },
      { status: "rejected", reason: error },
    ]);
    expect(onResume).toHaveBeenCalledExactlyOnceWith(config);
    expect(runtime.canResume).toBe(true);
    await runtime.resumeRun(nextConfig);
    expect(onResume).toHaveBeenNthCalledWith(2, nextConfig);
    expect(runtime.canResume).toBe(true);
  });

  it.each([undefined, false])(
    "does not notify subscribers for a successful resume without opt-in: %s",
    async (canResume) => {
      const onResume = vi.fn(async () => {});
      const runtime = createRuntime({ canResume, onResume });
      const subscriber = vi.fn();
      runtime.subscribe(subscriber);

      const pending = runtime.resumeRun({
        parentId: null,
        sourceId: null,
        runConfig: {},
      });
      expect(onResume).toHaveBeenCalledOnce();
      await pending;

      expect(subscriber).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, false])(
    "does not notify subscribers for a failed resume without opt-in: %s",
    async (canResume) => {
      const onResume = vi.fn(() => {
        throw new Error("resume failed");
      });
      const runtime = createRuntime({ canResume, onResume });
      const subscriber = vi.fn();
      runtime.subscribe(subscriber);

      const pending = runtime.resumeRun({
        parentId: null,
        sourceId: null,
        runConfig: {},
      });
      expect(onResume).toHaveBeenCalledOnce();
      await expect(pending).rejects.toThrow("resume failed");

      expect(subscriber).not.toHaveBeenCalled();
    },
  );
});

describe("ExternalStoreThreadRuntimeCore resume lifecycle", () => {
  const config = { parentId: null, sourceId: null, runConfig: {} };

  it.each([undefined, false, true])(
    "preserves the adapter receiver with canResume=%s",
    async (canResume) => {
      const onResume = vi.fn(function (this: ExternalStoreAdapter) {
        expect(this).toBe(adapter);
        return Promise.resolve();
      });
      const adapter: ExternalStoreAdapter = {
        messages: [],
        onNew: async () => {},
        canResume,
        onResume,
      };
      const runtime = new ExternalStoreThreadRuntimeCore(
        modelContextProvider,
        adapter,
      );
      await runtime.resumeRun(config);
      expect(onResume).toHaveBeenCalledExactlyOnceWith(config);
    },
  );

  it.each([undefined, false, true])(
    "preserves synchronous adapter errors with canResume=%s",
    async (canResume) => {
      const error = new Error("adapter resume failed");
      const adapter: ExternalStoreAdapter = {
        messages: [],
        onNew: async () => {},
        canResume,
        onResume() {
          expect(this).toBe(adapter);
          throw error;
        },
      };
      const runtime = new ExternalStoreThreadRuntimeCore(
        modelContextProvider,
        adapter,
      );
      await expect(runtime.resumeRun(config)).rejects.toBe(error);
      expect(runtime.canResume).toBe(canResume === true);
    },
  );

  it.each([
    "session",
    "reset",
    "import",
    "external state",
    "repository",
    "branch",
  ] as const)(
    "allows a new resume after %s changes without the old completion clearing it",
    async (boundary) => {
      const finish: Array<() => void> = [];
      const onResume = vi.fn(
        () => new Promise<void>((resolve) => finish.push(resolve)),
      );
      const adapter: ExternalStoreAdapter = {
        messageRepository: ExportedMessageRepository.fromBranchableArray(
          [
            {
              parentId: null,
              message: {
                id: "first",
                role: "assistant",
                content: "First branch",
              },
            },
            {
              parentId: null,
              message: {
                id: "other",
                role: "assistant",
                content: "Other branch",
              },
            },
          ],
          { headId: "first" },
        ),
        onNew: async () => {},
        onResume,
        canResume: true,
        setMessages: vi.fn(),
        onImport: vi.fn(),
        onLoadExternalState: vi.fn(),
      };
      const runtime = new ExternalStoreThreadRuntimeCore(
        modelContextProvider,
        adapter,
      );
      const first = runtime.resumeRun(config);
      expect(runtime.canResume).toBe(false);

      switch (boundary) {
        case "session":
          runtime.unstable_notifySessionReset();
          break;
        case "reset":
          runtime.reset();
          break;
        case "import":
          runtime.import(ExportedMessageRepository.fromArray([]));
          break;
        case "external state":
          runtime.importExternalState({});
          break;
        case "repository":
          runtime.__internal_setAdapter({
            ...adapter,
            unstable_messageRepositoryInstance: new MessageRepository(),
          });
          break;
        case "branch":
          runtime.switchToBranch("other");
          break;
      }
      expect(runtime.canResume).toBe(true);
      const second = runtime.resumeRun(config);
      expect(onResume).toHaveBeenCalledTimes(2);
      finish[0]!();
      await first;
      expect(runtime.canResume).toBe(false);
      const duplicate = runtime.resumeRun(config);
      expect(onResume).toHaveBeenCalledTimes(2);
      finish[1]!();
      await Promise.all([second, duplicate]);
      expect(runtime.canResume).toBe(true);
    },
  );

  it.each(["reset", "external state"] as const)(
    "keeps a resume started by the adapter during %s",
    async (boundary) => {
      let finish!: () => void;
      let pending!: Promise<void>;
      const onResume = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      );
      const startResume = () => {
        pending = runtime.resumeRun(config);
      };
      const runtime = createRuntime({
        canResume: true,
        onResume,
        setMessages: startResume,
        onLoadExternalState: startResume,
      });
      if (boundary === "reset") runtime.reset();
      else runtime.importExternalState({});
      expect(runtime.canResume).toBe(false);
      const duplicate = runtime.resumeRun(config);
      expect(onResume).toHaveBeenCalledOnce();
      finish();
      await Promise.all([pending, duplicate]);
    },
  );

  it("keeps the pending resume when switching to the current branch", async () => {
    let finish!: () => void;
    const onResume = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const runtime = createRuntime({
      messageRepository: ExportedMessageRepository.fromArray([
        { id: "first", role: "assistant", content: "First branch" },
      ]),
      setMessages: vi.fn(),
      canResume: true,
      onResume,
    });
    const first = runtime.resumeRun(config);
    runtime.switchToBranch("first");
    const duplicate = runtime.resumeRun(config);
    expect(onResume).toHaveBeenCalledOnce();
    finish();
    await Promise.all([first, duplicate]);
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

  it("keeps a declined delete after a send buffers during a held reload", async () => {
    let current = [
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
      message("a2", "assistant"),
    ];
    let isRunning = false;
    let finishReload!: () => void;
    let declineDelete!: () => void;
    const run = vi.fn();
    const queue = createMessageQueue({ run });
    queue.notifyBusy();
    const store = () =>
      ({
        messages: current,
        isRunning,
        queue: queue.adapter,
        onNew: async () => {},
        onReload: () =>
          new Promise<void>((resolve) => {
            finishReload = resolve;
          }),
        onDelete: () =>
          new Promise<void>((_, reject) => {
            declineDelete = () => reject(new Error("deletion declined"));
          }),
        setMessages: () => {},
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(store());

    const reloading = runtime.startRun({
      parentId: "u1",
      sourceId: "a1",
      runConfig: {},
    });
    await Promise.resolve();
    await runtime.append({
      parentId: "a2",
      sourceId: null,
      role: "user",
      createdAt: new Date(0),
      content: [{ type: "text", text: "next turn" }],
      metadata: { custom: {} },
      runConfig: {},
    });
    expect(queue.adapter.items).toHaveLength(1);
    expect(run).not.toHaveBeenCalled();

    const deletion = runtime.deleteMessage("u2");
    current = [current[0]!];
    isRunning = true;
    runtime.__internal_setAdapter(store());
    expect(runtime.getMessageById("u2")?.message.id).toBe("u2");
    declineDelete();
    await expect(deletion).rejects.toThrow("deletion declined");
    finishReload();
    await reloading;
    expect(runtime.getMessageById("u2")?.message.id).toBe("u2");
  });

  it("evicts an optimistic delete during a tail-targeted reload", async () => {
    let current = [message("u1", "user"), message("a1", "assistant")];
    let isRunning = false;
    let finishReload!: () => void;
    let confirmDelete!: () => void;
    const store = () =>
      ({
        messages: current,
        isRunning,
        onNew: async () => {},
        onReload: () =>
          new Promise<void>((resolve) => {
            finishReload = resolve;
          }),
        onDelete: () =>
          new Promise<void>((resolve) => {
            confirmDelete = resolve;
          }),
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(store());

    const reloading = runtime.startRun({
      parentId: "a1",
      sourceId: "a1",
      runConfig: {},
    });
    await Promise.resolve();
    current = [...current, message("u2", "user"), message("a2", "assistant")];
    isRunning = true;
    runtime.__internal_setAdapter(store());
    const deletion = runtime.deleteMessage("u2");
    current = current.filter((m) => m.id !== "u2");
    runtime.__internal_setAdapter(store());

    expect(runtime.getMessageById("u2")).toBeUndefined();
    confirmDelete();
    await deletion;
    finishReload();
    await reloading;
  });

  const optimisticDeleteAfterReload = async (
    parentId: string,
    reload: (current: ThreadMessage[]) => ThreadMessage[],
    holdReload = false,
    sendAfterReload = false,
  ) => {
    let current = [
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
      message("a2", "assistant"),
    ];
    let resolveDelete!: () => void;
    let finishReload!: () => void;
    const store = () =>
      ({
        messages: current,
        onNew: async () => {},
        onReload: async () => {
          current = reload(current);
          if (holdReload)
            await new Promise<void>((resolve) => {
              finishReload = resolve;
            });
        },
        onDelete: () =>
          new Promise<void>((resolve) => {
            current = current.filter((m) => m.id !== "u3");
            resolveDelete = resolve;
          }),
        setMessages: () => {},
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(store());

    const reloading = runtime.startRun({
      parentId,
      sourceId: "a1",
      runConfig: {},
    });
    if (holdReload) await Promise.resolve();
    else await reloading;
    runtime.__internal_setAdapter(store());
    if (sendAfterReload)
      await runtime.append({
        parentId: runtime.messages.at(-1)?.id ?? null,
        sourceId: null,
        role: "user",
        createdAt: new Date(0),
        content: [{ type: "text", text: "next turn" }],
        metadata: { custom: {} },
        runConfig: {},
      });
    current = [...current, message("u3", "user"), message("a3", "assistant")];
    runtime.__internal_setAdapter(store());
    const deletion = runtime.deleteMessage("u3");
    runtime.__internal_setAdapter(store());

    expect(runtime.getMessageById("u3")).toBeUndefined();
    expect(runtime.getBranches("a3")).toEqual(["a3"]);
    resolveDelete();
    await deletion;
    if (holdReload) finishReload();
    await reloading;
  };

  it("closes the reload window when a new reply arrives with the truncation", async () => {
    await optimisticDeleteAfterReload(
      "u1",
      (current) => [current[0]!, message("a1b", "assistant")],
      true,
    );
  });

  it("closes the reload window on the next send when the host array stays unchanged", async () => {
    await optimisticDeleteAfterReload("a2", (current) => current, false, true);
  });

  it("preserves a delete marked by an older reload across overlapping runs", async () => {
    let current = [
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
      message("a2", "assistant"),
    ];
    let isRunning = false;
    let decline!: () => void;
    const finishReloads: Array<() => void> = [];
    const store = () =>
      ({
        messages: current,
        isRunning,
        onNew: async () => {},
        onReload: () =>
          new Promise<void>((resolve) => finishReloads.push(resolve)),
        onDelete: () =>
          new Promise<void>((_, reject) => {
            decline = () => reject(new Error("deletion declined"));
          }),
        setMessages: () => {},
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(store());

    const older = runtime.startRun({
      parentId: "u1",
      sourceId: "a1",
      runConfig: {},
    });
    await Promise.resolve();
    const deletion = runtime.deleteMessage("u2");
    const newer = runtime.startRun({
      parentId: "u2",
      sourceId: "a2",
      runConfig: {},
    });
    await Promise.resolve();
    expect(finishReloads).toHaveLength(2);
    current = [current[0]!];
    isRunning = true;
    runtime.__internal_setAdapter(store());

    expect(runtime.getBranches("u2")).toEqual(["u2"]);
    decline();
    await expect(deletion).rejects.toThrow("deletion declined");
    finishReloads.forEach((finish) => finish());
    await Promise.all([older, newer]);
    expect(runtime.getBranches("u2")).toEqual(["u2"]);
  });

  it("keeps a delete registered after a newer reload when the older reload truncates", async () => {
    let current = [
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
      message("a2", "assistant"),
    ];
    let decline!: () => void;
    let isRunning = false;
    const finishReloads: Array<() => void> = [];
    const store = () =>
      ({
        messages: current,
        isRunning,
        onNew: async () => {},
        onReload: () =>
          new Promise<void>((resolve) => finishReloads.push(resolve)),
        onDelete: () =>
          new Promise<void>((_, reject) => {
            decline = () => reject(new Error("deletion declined"));
          }),
        setMessages: () => {},
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(store());

    const older = runtime.startRun({
      parentId: "u1",
      sourceId: "a1",
      runConfig: {},
    });
    await Promise.resolve();
    const newer = runtime.startRun({
      parentId: "u2",
      sourceId: "a2",
      runConfig: {},
    });
    await Promise.resolve();
    expect(finishReloads).toHaveLength(2);
    const deletion = runtime.deleteMessage("u2");
    current = [current[0]!];
    isRunning = true;
    finishReloads[0]!();
    await older;
    runtime.__internal_setAdapter(store());

    expect(runtime.getMessageById("u2")?.message.id).toBe("u2");
    decline();
    await expect(deletion).rejects.toThrow("deletion declined");
    finishReloads[1]!();
    await newer;
    expect(runtime.getMessageById("u2")?.message.id).toBe("u2");
  });

  it("keeps a reload window after a failed branch switch", async () => {
    let current = [
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
      message("a2", "assistant"),
    ];
    let decline!: () => void;
    let isRunning = false;
    const store = () =>
      ({
        messages: current,
        isRunning,
        onNew: async () => {},
        onReload: async () => {},
        onDelete: () =>
          new Promise<void>((_, reject) => {
            decline = () => reject(new Error("deletion declined"));
          }),
        setMessages: () => {},
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(store());

    await runtime.startRun({ parentId: "u1", sourceId: "a1", runConfig: {} });
    expect(() => runtime.switchToBranch("missing")).toThrow(/Branch not found/);
    const deletion = runtime.deleteMessage("u2");
    current = [current[0]!];
    isRunning = true;
    runtime.__internal_setAdapter(store());

    expect(runtime.getMessageById("u2")?.message.id).toBe("u2");
    decline();
    await expect(deletion).rejects.toThrow("deletion declined");
    expect(runtime.getMessageById("u2")?.message.id).toBe("u2");
  });

  const setup = ({
    reloadFails = false,
    holdReload = false,
    holdEdit = false,
  } = {}) => {
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
    let finishReload!: () => void;
    let finishEdit!: () => void;
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
      if (holdReload)
        await new Promise<void>((resolve) => {
          finishReload = resolve;
        });
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
          if (holdEdit)
            await new Promise<void>((resolve) => {
              finishEdit = resolve;
            });
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
      finishReload: () => finishReload(),
      finishEdit: () => finishEdit(),
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

  it("closes a settled reload window after its truncation before a later optimistic delete", async () => {
    let current = [
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
      message("a2", "assistant"),
    ];
    let decline!: () => void;
    let confirm!: () => void;
    const store = () =>
      ({
        messages: current,
        onNew: async () => {},
        onReload: async () => {
          current = [current[0]!, message("a1b", "assistant")];
        },
        onDelete: (id: string) =>
          new Promise<void>((resolve, reject) => {
            if (id === "u2") {
              decline = () => reject(new Error("deletion declined"));
            } else {
              current = current.filter((m) => m.id !== id);
              confirm = resolve;
            }
          }),
        setMessages: () => {},
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(store());

    await runtime.startRun({ parentId: "u1", sourceId: "a1", runConfig: {} });
    const declined = runtime.deleteMessage("u2");
    runtime.__internal_setAdapter(store());
    expect(runtime.getBranches("u2")).toEqual(["u2"]);
    decline();
    await expect(declined).rejects.toThrow("deletion declined");

    current = [...current, message("u3", "user"), message("a3", "assistant")];
    runtime.__internal_setAdapter(store());
    const confirmed = runtime.deleteMessage("u3");
    runtime.__internal_setAdapter(store());
    expect(runtime.getMessageById("u3")).toBeUndefined();
    confirm();
    await confirmed;
  });

  it.each(["declined", "confirmed"])(
    "settles a %s delete after an unchanged snapshot precedes reload truncation",
    async (outcome) => {
      let current = [
        message("u1", "user"),
        message("a1", "assistant"),
        message("u2", "user"),
        message("a2", "assistant"),
      ];
      let settleDelete!: () => void;
      const store = () =>
        ({
          messages: current,
          onNew: async () => {},
          onReload: async () => {},
          onDelete: () =>
            new Promise<void>((resolve, reject) => {
              settleDelete = () =>
                outcome === "confirmed"
                  ? resolve()
                  : reject(new Error("deletion declined"));
            }),
          setMessages: () => {},
        }) as ExternalStoreAdapter;
      const runtime = createRuntime(store());

      await runtime.startRun({
        parentId: "u1",
        sourceId: "a1",
        runConfig: {},
      });
      current = [...current];
      runtime.__internal_setAdapter(store());
      const deletion = runtime.deleteMessage("u2");
      current = [current[0]!, message("a1b", "assistant")];
      runtime.__internal_setAdapter(store());

      expect(runtime.getMessageById("u2")?.message.id).toBe("u2");
      settleDelete();
      if (outcome === "confirmed") await deletion;
      else await expect(deletion).rejects.toThrow("deletion declined");
      expect(runtime.getMessageById("u2")?.message.id).toBe(
        outcome === "confirmed" ? undefined : "u2",
      );
    },
  );

  it("closes a settled reload window at the next send", async () => {
    let current = [
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
      message("a2", "assistant"),
    ];
    let confirmDelete!: () => void;
    const store = () =>
      ({
        messages: current,
        onNew: async () => {},
        onReload: async () => {},
        onDelete: () =>
          new Promise<void>((resolve) => {
            confirmDelete = resolve;
          }),
        setMessages: () => {},
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(store());

    await runtime.startRun({ parentId: "u1", sourceId: "a1", runConfig: {} });
    await runtime.append({
      parentId: "a2",
      sourceId: null,
      role: "user",
      createdAt: new Date(0),
      content: [{ type: "text", text: "u3" }],
      metadata: { custom: {} },
      runConfig: {},
    });
    const deletion = runtime.deleteMessage("u2");
    current = current.filter((m) => m.id !== "u2");
    runtime.__internal_setAdapter(store());

    expect(runtime.getMessageById("u2")).toBeUndefined();
    confirmDelete();
    await deletion;
  });

  it("closes a reload window when onReload rejects", async () => {
    let current = [
      message("u1", "user"),
      message("a1", "assistant"),
      message("u2", "user"),
      message("a2", "assistant"),
    ];
    let confirmDelete!: () => void;
    const store = () =>
      ({
        messages: current,
        onNew: async () => {},
        onReload: async () => {
          throw new Error("reload failed");
        },
        onDelete: () =>
          new Promise<void>((resolve) => {
            confirmDelete = resolve;
          }),
        setMessages: () => {},
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(store());

    await expect(
      runtime.startRun({ parentId: "u1", sourceId: "a1", runConfig: {} }),
    ).rejects.toThrow("reload failed");
    const deletion = runtime.deleteMessage("u2");
    current = current.filter((m) => m.id !== "u2");
    runtime.__internal_setAdapter(store());

    expect(runtime.getMessageById("u2")).toBeUndefined();
    confirmDelete();
    await deletion;
  });

  it("keeps a delete rejected after onReload returns before the host truncation arrives", async () => {
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
    expect(runtime.getBranches("u2")).toEqual(["u2"]);
    declineDelete();
    await expect(deletion).rejects.toThrow("deletion declined");
    finishRun();

    expect(switchToOldBranch()).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("evicts a delete confirmed after onReload returns and the host truncates", async () => {
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

  it("keeps a delete rejected while an edit is pending", async () => {
    const {
      runtime,
      editEarlierReply,
      finishEdit,
      rerender,
      declineDelete,
      switchToOldBranch,
    } = setup({ holdEdit: true });

    const editing = editEarlierReply();
    await Promise.resolve();
    const deletion = runtime.deleteMessage("u2");
    finishEdit();
    await editing;
    rerender();
    expect(runtime.getBranches("u2")).toEqual(["u2"]);
    declineDelete();
    await expect(deletion).rejects.toThrow("deletion declined");

    expect(switchToOldBranch()).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("evicts a delete confirmed while an edit is pending", async () => {
    const { runtime, editEarlierReply, finishEdit, rerender, confirmDelete } =
      setup({ holdEdit: true });

    const editing = editEarlierReply();
    await Promise.resolve();
    const deletion = runtime.deleteMessage("u2");
    finishEdit();
    await editing;
    rerender();
    expect(runtime.getBranches("u2")).toEqual(["u2"]);
    confirmDelete();
    await deletion;
    rerender();

    expect(runtime.getMessageById("u2")).toBeUndefined();
    expect(runtime.getBranches("a2")).toEqual(["a2"]);
  });

  it("keeps a delete declined after the reload scan and host truncation", async () => {
    const {
      runtime,
      regenerate,
      rerender,
      declineDelete,
      finishRun,
      switchToOldBranch,
      finishReload,
    } = setup({ holdReload: true });

    const reload = regenerate();
    await Promise.resolve();
    const deletion = runtime.deleteMessage("u2");
    rerender();
    finishReload();
    await reload;
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
      finishReload,
    } = setup({ holdReload: true });

    const reload = regenerate();
    await Promise.resolve();
    const deletion = runtime.deleteMessage("u2");
    rerender();
    finishReload();
    await reload;
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
