import { describe, expect, it } from "vitest";
import { BaseSubscribable } from "../../subscribable/subscribable";
import type { ThreadMessage } from "../../types/message";
import { ReadonlyThreadRuntimeCore } from "../readonly/ReadonlyThreadRuntimeCore";
import { EMPTY_THREAD_CORE } from "../remote-thread-list/empty-thread-core";

const READONLY_ERROR = /readonly thread/;
const EMPTY_ERROR = /empty thread/;

const THREAD_MUTATION_METHODS = [
  "switchToBranch",
  "append",
  "deleteMessage",
  "startRun",
  "resumeRun",
  "cancelRun",
  "unstable_notifySessionReset",
  "addToolResult",
  "resumeToolCall",
  "respondToToolApproval",
  "speak",
  "stopSpeaking",
  "connectVoice",
  "disconnectVoice",
  "muteVoice",
  "unmuteVoice",
  "submitFeedback",
  "exportExternalState",
  "importExternalState",
  "beginEdit",
  "import",
  "reset",
] as const;

const SHARED_THROWING_COMPOSER_METHODS = [
  "setRole",
  "setRunConfig",
  "startDictation",
] as const;

const SHARED_NOOP_COMPOSER_METHODS = [
  "cancel",
  "stopDictation",
  "moveQueueItem",
  "removeQueueItem",
] as const;

type AnyCore = Record<string, any>;

const cores = [
  [
    "ReadonlyThreadRuntimeCore",
    () => new ReadonlyThreadRuntimeCore() as unknown as AnyCore,
    READONLY_ERROR,
  ],
  [
    "EMPTY_THREAD_CORE",
    () => EMPTY_THREAD_CORE as unknown as AnyCore,
    EMPTY_ERROR,
  ],
] as const;

describe.each(cores)("%s shared inert surface", (_name, makeCore, error) => {
  it.each(SHARED_THROWING_COMPOSER_METHODS)(
    "composer.%s throws the core's error",
    (method) => {
      expect(() => makeCore().composer[method]!()).toThrow(error);
    },
  );

  it.each(["removeAttachment"] as const)(
    "composer.%s rejects with the core's error",
    async (method) => {
      await expect(makeCore().composer[method]!()).rejects.toThrow(error);
    },
  );

  it.each(SHARED_NOOP_COMPOSER_METHODS)("composer.%s is a no-op", (method) => {
    expect(() => makeCore().composer[method]!()).not.toThrow();
  });

  it("composer.reset and composer.clearAttachments resolve without throwing", async () => {
    const core = makeCore();
    await expect(core.composer.reset()).resolves.toBeUndefined();
    await expect(core.composer.clearAttachments()).resolves.toBeUndefined();
  });

  it("reports every capability as disabled", () => {
    expect(makeCore().capabilities).toEqual({
      switchToBranch: false,
      switchBranchDuringRun: false,
      edit: false,
      delete: false,
      reload: false,
      refetchThread: false,
      cancel: false,
      unstable_copy: false,
      speech: false,
      dictation: false,
      voice: false,
      attachments: false,
      feedback: false,
      queue: false,
    });
  });

  it("exposes inert read-only state", () => {
    const core = makeCore();
    expect(core.getModelContext()).toEqual({});
    expect(core.getEditComposer()).toBeUndefined();
    expect(core.getVoiceVolume()).toBe(0);
    expect(core.speech).toBeUndefined();
    expect(core.voice).toBeUndefined();
    expect(core.state).toBeNull();
    expect(core.suggestions).toEqual([]);
    expect(core.extras).toBeUndefined();
    expect(core.isDisabled).toBe(false);
    expect(core.isSendDisabled).toBe(false);
  });

  it("exposes an empty composer that accepts everything and holds nothing", () => {
    const composer = makeCore().composer;
    expect(composer.attachmentAccept).toBe("*");
    expect(composer.attachments).toEqual([]);
    expect(composer.text).toBe("");
    expect(composer.role).toBe("user");
    expect(composer.runConfig).toEqual({});
    expect(composer.queue).toEqual([]);
    expect(composer.dictation).toBeUndefined();
    expect(composer.quote).toBeUndefined();
    expect(composer.isEmpty).toBe(true);
    expect(composer.canSend).toBe(false);
    expect(composer.canCancel).toBe(false);
  });

  it("subscribeVoiceVolume and unstable_on hand back no-op unsubscribers", () => {
    const core = makeCore();
    expect(() => core.subscribeVoiceVolume(() => {})()).not.toThrow();
    expect(() => core.unstable_on("runStart", () => {})()).not.toThrow();
  });
});

describe("readonly thread mutations", () => {
  it("ignores composer input, sending, attachments and quotes", async () => {
    const composer = new ReadonlyThreadRuntimeCore().composer;
    expect(() => composer.setText("hello")).not.toThrow();
    expect(() => composer.send()).not.toThrow();
    expect(() =>
      composer.setQuote({ text: "quoted", messageId: "message-1" }),
    ).not.toThrow();
    await expect(
      composer.addAttachment(new File([], "test.txt")),
    ).resolves.toBeUndefined();
    expect(composer.text).toBe("");
    expect(composer.quote).toBeUndefined();
    expect(composer.attachments).toEqual([]);
  });

  it.each(["setText", "send", "setQuote"] as const)(
    "empty core composer.%s still throws",
    (method) => {
      expect(() =>
        (EMPTY_THREAD_CORE.composer[method] as () => void)(),
      ).toThrow(EMPTY_ERROR);
    },
  );

  it("empty core composer.addAttachment still rejects", async () => {
    await expect(
      EMPTY_THREAD_CORE.composer.addAttachment(new File([], "test.txt")),
    ).rejects.toThrow(EMPTY_ERROR);
  });

  it("rejects interaction recording on empty threads and resolves on readonly threads", async () => {
    await expect(
      EMPTY_THREAD_CORE.unstable_recordToolInteraction!({
        messageId: "message-1",
        toolCallId: "call-1",
        interaction: { type: "action", payload: {}, occurredAt: 0 },
      }),
    ).rejects.toThrow(EMPTY_ERROR);

    const readonlyThread = new ReadonlyThreadRuntimeCore();
    const messages: readonly ThreadMessage[] = [
      {
        id: "message-1",
        role: "user" as const,
        content: [{ type: "text" as const, text: "hello" }],
        attachments: [],
        createdAt: new Date(0),
        status: { type: "complete" as const, reason: "stop" as const },
        metadata: { custom: {} },
      },
    ];
    readonlyThread.setMessages(messages);

    await expect(
      readonlyThread.unstable_recordToolInteraction!({
        messageId: "message-1",
        toolCallId: "call-1",
        interaction: { type: "action", payload: {}, occurredAt: 0 },
      }),
    ).resolves.toBeUndefined();
    expect(readonlyThread.messages).toBe(messages);
  });

  it.each(
    THREAD_MUTATION_METHODS.filter(
      (method) => method !== "exportExternalState",
    ),
  )("%s is ignored without changing messages", async (method) => {
    const core = new ReadonlyThreadRuntimeCore() as unknown as AnyCore;
    const messages = [
      {
        id: "m1",
        role: "user",
        content: [{ type: "text", text: "hi" }],
        createdAt: new Date(0),
        status: { type: "complete", reason: "stop" },
        metadata: { custom: {} },
      },
    ];
    core.setMessages(messages);

    await core[method]!();

    expect(core.messages).toBe(messages);
  });

  it("exportExternalState still throws on a readonly thread", () => {
    expect(() => new ReadonlyThreadRuntimeCore().exportExternalState()).toThrow(
      READONLY_ERROR,
    );
  });

  it.each(THREAD_MUTATION_METHODS)(
    "%s still throws on the empty core",
    (method) => {
      expect(() =>
        (EMPTY_THREAD_CORE as unknown as AnyCore)[method]!(),
      ).toThrow(EMPTY_ERROR);
    },
  );

  it("empty core mutators throw one stable error object", () => {
    const core = EMPTY_THREAD_CORE as unknown as AnyCore;
    const thrown = THREAD_MUTATION_METHODS.map((method) => {
      try {
        core[method]!();
        return undefined;
      } catch (e) {
        return e;
      }
    });

    expect(thrown[0]).toBeInstanceOf(Error);
    expect(thrown.every((e) => e === thrown[0])).toBe(true);
  });

  it("an empty core mutator throws a receiver TypeError when detached", () => {
    const detached = (EMPTY_THREAD_CORE as unknown as AnyCore).append!;
    expect(() => detached()).toThrow(TypeError);
  });

  it("readonly is not loading; empty is loading so it is not read as an empty conversation", () => {
    expect(new ReadonlyThreadRuntimeCore().isLoading).toBe(false);
    expect(EMPTY_THREAD_CORE.isLoading).toBe(true);
  });

  it("readonly composer is not editing; empty composer is", () => {
    expect(new ReadonlyThreadRuntimeCore().composer.isEditing).toBe(false);
    expect(EMPTY_THREAD_CORE.composer.isEditing).toBe(true);
  });
});

describe("readonly notifications", () => {
  it("notifies subscribers and settles waitForUpdate when messages change", async () => {
    const core = new ReadonlyThreadRuntimeCore();
    const seen: number[] = [];
    const unsubscribe = core.subscribe(() => {
      seen.push(core.messages.length);
    });
    const update = core.waitForUpdate();

    core.setMessages([
      {
        id: "m1",
        role: "user",
        content: [{ type: "text", text: "hi" }],
        createdAt: new Date(0),
        status: { type: "complete", reason: "stop" },
        metadata: { custom: {} },
      } as any,
    ]);

    await expect(update).resolves.toBeUndefined();
    expect(seen).toEqual([1]);
    unsubscribe();
  });
});

describe("empty singleton", () => {
  it("does not retain subscribe callbacks", () => {
    const subscribers = (
      EMPTY_THREAD_CORE as unknown as Record<string, unknown>
    )._subscribers as Set<unknown>;
    const before = subscribers.size;
    const unsubscribe = EMPTY_THREAD_CORE.subscribe(() => undefined);
    expect(subscribers.size).toBe(before);
    expect(() => unsubscribe()).not.toThrow();
  });

  it("rejects waitForUpdate instead of hanging", async () => {
    await expect(
      (EMPTY_THREAD_CORE as unknown as BaseSubscribable).waitForUpdate(),
    ).rejects.toThrow(EMPTY_ERROR);
  });
});
