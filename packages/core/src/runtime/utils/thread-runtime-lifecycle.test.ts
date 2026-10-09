import { describe, expect, it, onTestFinished, vi } from "vitest";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { ThreadMessage } from "../../types/message";
import { ExternalStoreThreadRuntimeCore } from "../../runtimes/external-store/external-store-thread-runtime-core";
import type {
  DictationAdapter,
  SpeechSynthesisAdapter,
} from "../../adapters/speech";
import { LocalRuntimeCore } from "../../runtimes/local/local-runtime-core";
import { ExternalStoreRuntimeCore } from "../../runtimes/external-store/external-store-runtime-core";
import type { ExternalStoreAdapter } from "../../runtimes/external-store/external-store-adapter";
import {
  captureThreadRuntimeGeneration,
  disposeThreadRuntime,
  invalidateThreadRuntime,
  supersedeThreadRuntime,
} from "./thread-runtime-lifecycle";

const createRuntime = (disconnectVoice: () => void = vi.fn()) =>
  ({
    voice: { status: { type: "running" } },
    disconnectVoice,
    composer: { dictation: undefined },
    messages: [],
    speech: undefined,
  }) as unknown as ThreadRuntimeCore;

describe("thread runtime lifecycle", () => {
  it.each([
    ["invalidation", invalidateThreadRuntime],
    ["supersession", supersedeThreadRuntime],
  ])("delivers a pending attachment send through %s", async (_, transition) => {
    let resolveSend!: () => void;
    const send = vi.fn<AttachmentAdapter["send"]>(
      (attachment) =>
        new Promise((resolve) => {
          resolveSend = () =>
            resolve({
              ...attachment,
              status: { type: "complete" },
              content: [],
            });
        }),
    );
    const attachments: AttachmentAdapter = {
      accept: "*",
      add: async ({ file }) => ({
        id: "attachment-1",
        type: "document",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      remove: async () => {},
      send,
    };
    const onNew = vi.fn(async () => {});
    const runtime = new ExternalStoreThreadRuntimeCore(
      { getModelContext: () => ({}) },
      { messages: [], onNew, adapters: { attachments } },
    );
    runtime.composer.setText("hello");
    await runtime.composer.addAttachment(
      new File(["hello"], "notes.txt", { type: "text/plain" }),
    );

    const pending = runtime.composer.send();
    const signal = send.mock.lastCall?.[1]?.signal;
    transition(runtime);
    expect(signal?.aborted).toBe(false);

    resolveSend();
    await pending;
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("aborts an edit composer's pending attachment send on disposal", async () => {
    let resolveSend!: () => void;
    const send = vi.fn<AttachmentAdapter["send"]>(
      (attachment) =>
        new Promise((resolve) => {
          resolveSend = () =>
            resolve({
              ...attachment,
              status: { type: "complete" },
              content: [],
            });
        }),
    );
    const attachments: AttachmentAdapter = {
      accept: "*",
      add: async ({ file }) => ({
        id: "attachment-1",
        type: "document",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      remove: async () => {},
      send,
    };
    const onEdit = vi.fn(async () => {});
    const runtime = new ExternalStoreThreadRuntimeCore(
      { getModelContext: () => ({}) },
      {
        messages: [
          {
            id: "u1",
            role: "user",
            createdAt: new Date(),
            content: [{ type: "text", text: "hello" }],
            attachments: [],
            metadata: { custom: {} },
          } as ThreadMessage,
        ],
        onNew: vi.fn(async () => {}),
        onEdit,
        adapters: { attachments },
      },
    );
    runtime.beginEdit("u1");
    const composer = runtime.getEditComposer("u1")!;
    await composer.addAttachment(
      new File(["hello"], "notes.txt", { type: "text/plain" }),
    );

    const pending = composer.send();
    const signal = send.mock.lastCall?.[1]?.signal;
    expect(signal?.aborted).toBe(false);
    disposeThreadRuntime(runtime);
    expect(signal?.aborted).toBe(true);

    resolveSend();
    await pending;
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("starts a fresh generation after invalidation", () => {
    const runtime = createRuntime();
    const generation = captureThreadRuntimeGeneration(runtime);

    invalidateThreadRuntime(runtime);

    expect(generation.aborted).toBe(true);
    expect(captureThreadRuntimeGeneration(runtime).aborted).toBe(false);
  });

  it("ends the call of a superseded runtime without disposing it", () => {
    const disconnectVoice = vi.fn();
    const runtime = createRuntime(disconnectVoice);
    const generation = captureThreadRuntimeGeneration(runtime);

    supersedeThreadRuntime(runtime);

    expect(disconnectVoice).toHaveBeenCalledOnce();
    expect(generation.aborted).toBe(true);
    expect(captureThreadRuntimeGeneration(runtime).aborted).toBe(false);
  });

  it("keeps a disposed runtime aborted through a later invalidation", () => {
    const disconnectVoice = vi.fn();
    const runtime = createRuntime(disconnectVoice);

    disposeThreadRuntime(runtime);
    invalidateThreadRuntime(runtime);

    expect(captureThreadRuntimeGeneration(runtime).aborted).toBe(true);
    expect(disconnectVoice).toHaveBeenCalledOnce();
  });

  it("reports a voice disconnect that throws instead of rethrowing it", () => {
    const error = new Error("disconnect failed");
    const runtime = createRuntime(() => {
      throw error;
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());

    expect(() => disposeThreadRuntime(runtime)).not.toThrow();
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(
      "[assistant-ui] Voice cleanup threw while discarding a thread runtime",
      error,
    );
    expect(captureThreadRuntimeGeneration(runtime).aborted).toBe(true);
  });
});

const fakeDictation = () => {
  const session: DictationAdapter.Session = {
    status: { type: "running" },
    stop: vi.fn(async () => {}),
    cancel: vi.fn(),
    onSpeechStart: () => () => {},
    onSpeechEnd: () => () => {},
    onSpeech: () => () => {},
  };
  return {
    adapter: { listen: () => session } satisfies DictationAdapter,
    session,
  };
};

const fakeSpeech = () => {
  const utterance: SpeechSynthesisAdapter.Utterance = {
    status: { type: "running" },
    cancel: vi.fn(),
    subscribe: () => () => {},
  };
  return {
    adapter: { speak: () => utterance } satisfies SpeechSynthesisAdapter,
    utterance,
  };
};

describe("thread runtime lifecycle media sessions", () => {
  const localThread = async () => {
    const dictation = fakeDictation();
    const speech = fakeSpeech();
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async run() {
              return {};
            },
          },
          dictation: dictation.adapter,
          speech: speech.adapter,
        },
      },
      [{ role: "assistant", content: "hello" }],
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    await thread.__internal_load();
    return { thread, dictation, speech };
  };

  const addSiblingBranch = (
    thread: Awaited<ReturnType<typeof localThread>>["thread"],
  ) => {
    const original = thread.messages[0]!;
    const siblingId = "sibling";
    thread.import({
      headId: original.id,
      messages: [
        ...thread.export().messages,
        { parentId: null, message: { ...original, id: siblingId } },
      ],
    });
    return siblingId;
  };

  it("ends a live dictation session when the thread runtime is disposed", async () => {
    const { thread, dictation } = await localThread();
    thread.composer.startDictation();
    expect(thread.composer.dictation).toBeDefined();

    disposeThreadRuntime(thread);

    expect(dictation.session.stop).toHaveBeenCalledTimes(1);
    expect(dictation.session.cancel).not.toHaveBeenCalled();
  });

  it("stops a dictation session once when a superseded runtime is disposed", async () => {
    const { thread, dictation } = await localThread();
    thread.composer.startDictation();

    supersedeThreadRuntime(thread);
    expect(dictation.session.stop).toHaveBeenCalledTimes(1);
    disposeThreadRuntime(thread);

    expect(dictation.session.stop).toHaveBeenCalledTimes(1);
  });

  it("ends dictation started in an edit composer when the thread runtime is disposed", async () => {
    const { thread, dictation } = await localThread();
    const messageId = thread.messages[0]!.id;
    thread.beginEdit(messageId);
    const edit = thread.getEditComposer(messageId)!;
    edit.startDictation();
    expect(edit.dictation).toBeDefined();

    disposeThreadRuntime(thread);

    expect(dictation.session.stop).toHaveBeenCalledTimes(1);
    expect(dictation.session.cancel).not.toHaveBeenCalled();
  });

  it("ends dictation in an off-branch edit composer when the thread runtime is disposed", async () => {
    const { thread, dictation } = await localThread();
    const messageId = thread.messages[0]!.id;
    const siblingId = addSiblingBranch(thread);
    thread.beginEdit(messageId);
    const edit = thread.getEditComposer(messageId)!;
    edit.startDictation();

    thread.switchToBranch(siblingId);
    expect(thread.messages.map((message) => message.id)).not.toContain(
      messageId,
    );
    expect(thread.getEditComposer(messageId)).toBe(edit);
    expect(edit.dictation).toBeDefined();

    disposeThreadRuntime(thread);

    expect(dictation.session.stop).toHaveBeenCalledTimes(1);
    expect(dictation.session.cancel).not.toHaveBeenCalled();
  });

  it("stops speech when the thread runtime is disposed", async () => {
    const { thread, speech } = await localThread();
    const messageId = thread.messages[0]!.id;
    thread.speak(messageId);
    expect(thread.speech?.messageId).toBe(messageId);

    disposeThreadRuntime(thread);

    expect(speech.utterance.cancel).toHaveBeenCalled();
  });

  it("stops speech for an off-branch message when the thread runtime is disposed", async () => {
    const { thread, speech } = await localThread();
    const messageId = thread.messages[0]!.id;
    const siblingId = addSiblingBranch(thread);
    thread.speak(messageId);

    thread.switchToBranch(siblingId);
    expect(thread.messages.map((message) => message.id)).not.toContain(
      messageId,
    );
    expect(thread.speech?.messageId).toBe(messageId);

    disposeThreadRuntime(thread);

    expect(speech.utterance.cancel).toHaveBeenCalledTimes(1);
  });

  it("ends the dictation of an external-store thread the list switches away from", () => {
    const dictation = fakeDictation();
    const make = (threadId: string): ExternalStoreAdapter => ({
      messages: [],
      onNew: async () => {},
      adapters: {
        dictation: dictation.adapter,
        threadList: {
          threadId,
          threads: [
            { status: "regular", id: "t1", title: "one" },
            { status: "regular", id: "t2", title: "two" },
          ],
        },
      },
    });
    const core = new ExternalStoreRuntimeCore(make("t1"));
    const first = core.threads.getMainThreadRuntimeCore();
    first.composer.startDictation();

    core.setAdapter(make("t2"));
    expect(core.threads.getMainThreadRuntimeCore()).not.toBe(first);

    expect(dictation.session.stop).toHaveBeenCalledTimes(1);
    expect(dictation.session.cancel).not.toHaveBeenCalled();
  });
});
