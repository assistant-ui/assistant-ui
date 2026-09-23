import { describe, expect, it, onTestFinished, vi } from "vitest";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
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
    speech: undefined,
  }) as unknown as ThreadRuntimeCore;

describe("thread runtime lifecycle", () => {
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

  it("ends a live dictation session when the thread runtime is disposed", async () => {
    const { thread, dictation } = await localThread();
    thread.composer.startDictation();
    expect(thread.composer.dictation).toBeDefined();

    disposeThreadRuntime(thread);

    const ended =
      vi.mocked(dictation.session.cancel).mock.calls.length +
      vi.mocked(dictation.session.stop).mock.calls.length;
    expect(ended).toBeGreaterThan(0);
  });

  it("stops speech when the thread runtime is disposed", async () => {
    const { thread, speech } = await localThread();
    const messageId = thread.messages[0]!.id;
    thread.speak(messageId);
    expect(thread.speech?.messageId).toBe(messageId);

    disposeThreadRuntime(thread);

    expect(speech.utterance.cancel).toHaveBeenCalled();
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

    const ended =
      vi.mocked(dictation.session.cancel).mock.calls.length +
      vi.mocked(dictation.session.stop).mock.calls.length;
    expect(ended).toBeGreaterThan(0);
  });
});
