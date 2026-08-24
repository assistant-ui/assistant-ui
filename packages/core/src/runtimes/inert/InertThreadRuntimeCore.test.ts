import { describe, expect, it } from "vitest";
import { BaseSubscribable } from "../../subscribable/subscribable";
import { ReadonlyThreadRuntimeCore } from "../readonly/ReadonlyThreadRuntimeCore";
import { EMPTY_THREAD_CORE } from "../remote-thread-list/empty-thread-core";

const READONLY_ERROR = /readonly thread/;
const EMPTY_ERROR = /empty thread/;

const SHARED_THROWING_METHODS = [
  "switchToBranch",
  "append",
  "deleteMessage",
  "startRun",
  "resumeRun",
  "unstable_notifySessionReset",
  "addToolResult",
  "resumeToolCall",
  "respondToToolApproval",
  "speak",
  "connectVoice",
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
  "setText",
  "setRole",
  "setRunConfig",
  "send",
  "startDictation",
  "setQuote",
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
  it.each(SHARED_THROWING_METHODS)("%s throws the core's error", (method) => {
    expect(() => makeCore()[method]!()).toThrow(error);
  });

  it.each(SHARED_THROWING_COMPOSER_METHODS)(
    "composer.%s throws the core's error",
    (method) => {
      expect(() => makeCore().composer[method]!()).toThrow(error);
    },
  );

  it.each(["addAttachment", "removeAttachment"] as const)(
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

  it("throws one stable error object from every mutator", () => {
    const core = makeCore();
    const thrown = SHARED_THROWING_METHODS.map((method) => {
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

  it("throws a receiver TypeError when a mutator is detached", () => {
    const detached = makeCore().append!;
    expect(() => detached()).toThrow(TypeError);
  });

  it("subscribeVoiceVolume and unstable_on hand back no-op unsubscribers", () => {
    const core = makeCore();
    expect(() => core.subscribeVoiceVolume(() => {})()).not.toThrow();
    expect(() => core.unstable_on("runStart", () => {})()).not.toThrow();
  });
});

describe("no-op versus throw divergences", () => {
  it.each(["cancelRun", "stopSpeaking", "disconnectVoice"] as const)(
    "%s is a no-op on the readonly core but throws on the empty core",
    (method) => {
      const readonly = new ReadonlyThreadRuntimeCore() as unknown as AnyCore;
      expect(() => readonly[method]!()).not.toThrow();
      expect(() =>
        (EMPTY_THREAD_CORE as unknown as AnyCore)[method]!(),
      ).toThrow(EMPTY_ERROR);
    },
  );

  it("readonly is not loading; empty is loading so it is not read as an empty conversation", () => {
    expect(new ReadonlyThreadRuntimeCore().isLoading).toBe(false);
    expect(EMPTY_THREAD_CORE.isLoading).toBe(true);
  });

  it("readonly composer is not editing; empty composer is", () => {
    expect(new ReadonlyThreadRuntimeCore().composer.isEditing).toBe(false);
    expect(EMPTY_THREAD_CORE.composer.isEditing).toBe(true);
  });

  it("the two cores carry distinct error objects and messages", () => {
    const grab = (fn: () => void) => {
      try {
        fn();
        return undefined;
      } catch (e) {
        return e as Error;
      }
    };

    const readonlyError = grab(() => new ReadonlyThreadRuntimeCore().append());
    const emptyError = grab(() =>
      (EMPTY_THREAD_CORE as unknown as AnyCore).append!(),
    );

    expect(readonlyError).not.toBe(emptyError);
    expect(readonlyError?.message).toBe(
      "This is a readonly thread. You cannot perform mutations on readonly threads.",
    );
    expect(emptyError?.message).toMatch(/placeholder for the main thread/);
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
