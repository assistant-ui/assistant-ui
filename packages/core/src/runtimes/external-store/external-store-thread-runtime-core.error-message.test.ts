import { describe, expect, it, vi } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import { completeExternalMessageConversion } from "../../runtime/utils/external-message-conversion";
import {
  ExportedMessageRepository,
  MessageRepository,
} from "../../runtime/utils/message-repository";
import type { ThreadMessage } from "../../types/message";
import { isErrorMessageId } from "../../utils/id";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";

const contextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

const [u1, a1, u2, a2] = ExportedMessageRepository.fromArray([
  { id: "u1", role: "user", content: "first" },
  { id: "a1", role: "assistant", content: "first reply" },
  { id: "u2", role: "user", content: "second" },
  { id: "a2", role: "assistant", content: "second reply" },
]).messages.map(({ message }) => message) as [
  ThreadMessage,
  ThreadMessage,
  ThreadMessage,
  ThreadMessage,
];

const editedUser: ThreadMessage = {
  ...u2,
  id: "edit",
  content: [{ type: "text", text: "revised" }],
};

const adapter = (
  messages: readonly ThreadMessage[],
  options: {
    error?: string;
    isRunning?: boolean;
    repository?: MessageRepository;
  } = {},
) =>
  ({
    messages: completeExternalMessageConversion([...messages], options.error),
    isRunning: options.isRunning ?? false,
    unstable_messageRepositoryInstance: options.repository,
    onNew: async () => {},
    onReload: async () => {},
  }) as ExternalStoreAdapter;

const errorIds = (runtime: ExternalStoreThreadRuntimeCore) =>
  runtime
    .export()
    .messages.map(({ message }) => message.id)
    .filter(isErrorMessageId);

const cancellableStore = () => {
  const setMessages = vi.fn<(messages: readonly ThreadMessage[]) => void>();
  const store = (
    messages: readonly ThreadMessage[],
    options?: Parameters<typeof adapter>[1],
  ): ExternalStoreAdapter => ({
    ...adapter(messages, options),
    onCancel: async () => {},
    setMessages,
  });
  return { store, setMessages };
};

describe("external-store synthesized error messages", () => {
  it("shows the error on a synthesized assistant message", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502" }),
    );

    const tail = runtime.messages.at(-1)!;
    expect(isErrorMessageId(tail.id)).toBe(true);
    expect(tail.status).toMatchObject({ type: "incomplete", reason: "error" });
  });

  it("drops the error message once a reload answers", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502" }),
    );

    runtime.__internal_setAdapter(adapter([u1], { isRunning: true }));
    expect(errorIds(runtime)).toEqual([]);
    expect(runtime.getBranches(runtime.messages.at(-1)!.id)).toHaveLength(1);

    runtime.__internal_setAdapter(adapter([u1, a1]));
    expect(runtime.messages.map((m) => m.id)).toEqual(["u1", "a1"]);
    expect(runtime.getBranches("a1")).toEqual(["a1"]);
    expect(errorIds(runtime)).toEqual([]);
  });

  it("drops the error message once a new message is sent", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502" }),
    );

    runtime.__internal_setAdapter(adapter([u1, u2], { isRunning: true }));
    expect(runtime.getBranches("u2")).toEqual(["u2"]);

    runtime.__internal_setAdapter(adapter([u1, u2, a2]));
    expect(runtime.messages.map((m) => m.id)).toEqual(["u1", "u2", "a2"]);
    expect(runtime.getBranches("u2")).toEqual(["u2"]);
    expect(errorIds(runtime)).toEqual([]);
  });

  it("drops an error that follows earlier turns once the reply arrives", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1, a1, u2], { error: "502" }),
    );

    runtime.__internal_setAdapter(adapter([u1, a1, u2, a2]));
    expect(runtime.getBranches("a2")).toEqual(["a2"]);
    expect(errorIds(runtime)).toEqual([]);
  });

  it("keeps only the latest error message when the error is converted again", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502" }),
    );
    const first = runtime.messages.at(-1)!.id;

    runtime.__internal_setAdapter(adapter([u1], { error: "503" }));
    const second = runtime.messages.at(-1)!.id;

    expect(second).not.toBe(first);
    expect(runtime.getBranches(second)).toEqual([second]);
    expect(errorIds(runtime)).toEqual([second]);
  });

  it("keeps the error message while the snapshot still carries it", () => {
    const messages = adapter([u1], { error: "502" }).messages!;
    const runtime = new ExternalStoreThreadRuntimeCore(contextProvider, {
      messages,
      onNew: async () => {},
    } as ExternalStoreAdapter);
    const errorId = runtime.messages.at(-1)!.id;

    runtime.__internal_setAdapter({
      messages,
      isRunning: false,
      onNew: async () => {},
      suggestions: [],
    } as ExternalStoreAdapter);

    expect(runtime.messages.at(-1)!.id).toBe(errorId);
    expect(errorIds(runtime)).toEqual([errorId]);
  });

  it("drops an error left in a thread's repository after switching back to it", () => {
    const repositoryA = new MessageRepository();
    const repositoryB = new MessageRepository();
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502", repository: repositoryA }),
    );

    runtime.__internal_setAdapter(
      adapter([u2, a2], { repository: repositoryB }),
    );
    runtime.__internal_setAdapter(
      adapter([u1, a1], { repository: repositoryA }),
    );

    expect(runtime.messages.map((m) => m.id)).toEqual(["u1", "a1"]);
    expect(runtime.getBranches("a1")).toEqual(["a1"]);
    expect(errorIds(runtime)).toEqual([]);
  });

  it("keeps an error message that the host built further turns on", () => {
    const [, error] = adapter([u1], { error: "502" }).messages!;
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1, error!, u2, a2]),
    );

    runtime.__internal_setAdapter(adapter([u1, a1]));

    const parentOf = (id: string) =>
      runtime.export().messages.find(({ message }) => message.id === id)
        ?.parentId;
    expect(parentOf("u2")).toBe(error!.id);
    expect(runtime.getBranches("a1")).toEqual([error!.id, "a1"]);
  });

  it("lets a newer snapshot published from runStart win over the running one", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502" }),
    );
    const unsubscribe = runtime.unstable_on("runStart", () => {
      unsubscribe();
      runtime.__internal_setAdapter(adapter([u1, a1], { isRunning: true }));
    });

    expect(() =>
      runtime.__internal_setAdapter(
        adapter([u1], { error: "502", isRunning: true }),
      ),
    ).not.toThrow();
    expect(runtime.messages.map((m) => m.id)).toEqual(["u1", "a1"]);
    expect(errorIds(runtime)).toEqual([]);
  });

  it("finishes the running snapshot when runStart republishes the same messages", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1, a1]),
    );
    const running = adapter([u1, a1, u2], { isRunning: true });
    const unsubscribe = runtime.unstable_on("runStart", () => {
      unsubscribe();
      runtime.__internal_setAdapter({ ...running });
    });

    runtime.__internal_setAdapter(running);

    expect(runtime.messages.map((m) => m.id).slice(0, 3)).toEqual([
      "u1",
      "a1",
      "u2",
    ]);
    expect(runtime.messages.at(-1)!.metadata.isOptimistic).toBe(true);
  });

  it("does not bring back the answer a failed reload replaced when a new message is stopped", async () => {
    const { store, setMessages } = cancellableStore();
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      store([u1, a1]),
    );
    runtime.__internal_setAdapter(store([u1], { isRunning: true }));
    runtime.__internal_setAdapter(store([u1], { error: "502" }));
    runtime.__internal_setAdapter(store([u1, u2], { isRunning: true }));

    runtime.cancelRun();
    expect(runtime.messages.map((m) => m.id)).toEqual(["u1"]);
    runtime.__internal_setAdapter(store([u1, u2], { isRunning: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(runtime.messages.map((m) => m.id)).toEqual(["u1"]);
    expect(runtime.composer.text).toBe("second");
    expect(setMessages).toHaveBeenCalledTimes(1);
    expect(setMessages.mock.calls[0]![0].map((m) => m.id)).toEqual(["u1"]);
  });

  it.each([
    {
      position: "after an earlier turn",
      prefix: [u1, a1],
      user: u2,
      answer: a2,
    },
    { position: "at the root", prefix: [], user: u1, answer: a1 },
  ])(
    "restores the original user message when an edit $position is stopped after a failed reload",
    async ({ prefix, user, answer }) => {
      const { store, setMessages } = cancellableStore();
      const original = [...prefix, user];
      const runtime = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        store([...original, answer]),
      );
      runtime.__internal_setAdapter(store(original, { isRunning: true }));
      runtime.__internal_setAdapter(store(original, { error: "502" }));
      const running = [...prefix, editedUser];
      runtime.__internal_setAdapter(store(running, { isRunning: true }));

      runtime.cancelRun();
      expect(runtime.messages).toEqual(original);
      runtime.__internal_setAdapter(store(running, { isRunning: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(runtime.messages).toEqual(original);
      expect(runtime.composer.text).toBe("revised");
      expect(setMessages).toHaveBeenCalledExactlyOnceWith(original);
    },
  );

  it("does not bring back an abandoned turn when a later message is stopped", async () => {
    const { store, setMessages } = cancellableStore();
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      store([u1, a1]),
    );
    runtime.__internal_setAdapter(store([u1, u2], { isRunning: true }));
    runtime.__internal_setAdapter(store([u1], { error: "502" }));
    const running = [u1, { ...u2, id: "new" }];
    runtime.__internal_setAdapter(store(running, { isRunning: true }));

    runtime.cancelRun();
    expect(runtime.messages).toEqual([u1]);
    runtime.__internal_setAdapter(store(running, { isRunning: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(runtime.messages).toEqual([u1]);
    expect(setMessages).toHaveBeenCalledExactlyOnceWith([u1]);
  });

  it("restores the original answer when an edit to an answered turn is stopped", async () => {
    const { store, setMessages } = cancellableStore();
    const original = [u1, a1, u2, a2];
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      store(original),
    );
    const running = [u1, a1, editedUser];
    runtime.__internal_setAdapter(store(running, { isRunning: true }));

    runtime.cancelRun();
    expect(runtime.messages).toEqual(original);
    runtime.__internal_setAdapter(store(running, { isRunning: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(runtime.messages).toEqual(original);
    expect(runtime.composer.text).toBe("revised");
    expect(setMessages).toHaveBeenCalledExactlyOnceWith(original);
  });

  it("keeps the old conversation out of Stop when a send arrives before the reset snapshot", async () => {
    const { store, setMessages } = cancellableStore();
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      store([u1, a1]),
    );

    runtime.reset();
    runtime.__internal_setAdapter(store([u2], { isRunning: true }));
    expect(runtime.messages.filter((m) => !m.metadata.isOptimistic)).toEqual([
      u2,
    ]);

    runtime.cancelRun();
    const stoppedMessages = runtime.messages;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect.soft(stoppedMessages.map((m) => m.id)).toEqual([]);
    expect.soft(runtime.messages.map((m) => m.id)).toEqual([]);
    expect(runtime.composer.text).toBe("second");
    expect(
      setMessages.mock.calls.map(([messages]) => messages.map((m) => m.id)),
    ).toEqual([[], []]);
  });

  it.each([
    { timing: "before", publishHistory: true },
    { timing: "with", publishHistory: false },
  ])(
    "keeps the previous conversation out of Stop when the host switches $timing the send snapshot",
    async ({ publishHistory }) => {
      const { store, setMessages } = cancellableStore();
      const runtime = new ExternalStoreThreadRuntimeCore(
        contextProvider,
        store([u1, a1]),
      );
      const current = [u2, a2];

      if (publishHistory) {
        runtime.__internal_setAdapter(store(current));
        expect(runtime.messages).toEqual(current);
      }
      runtime.__internal_setAdapter(
        store([...current, editedUser], { isRunning: true }),
      );
      expect(runtime.messages.filter((m) => !m.metadata.isOptimistic)).toEqual([
        ...current,
        editedUser,
      ]);

      runtime.cancelRun();
      const stoppedMessages = runtime.messages;
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect.soft(stoppedMessages.map((m) => m.id)).toEqual(["u2", "a2"]);
      expect.soft(runtime.messages.map((m) => m.id)).toEqual(["u2", "a2"]);
      expect(runtime.composer.text).toBe("revised");
      expect(
        setMessages.mock.calls.map(([messages]) => messages.map((m) => m.id)),
      ).toEqual([["u2", "a2"]]);
    },
  );
});
