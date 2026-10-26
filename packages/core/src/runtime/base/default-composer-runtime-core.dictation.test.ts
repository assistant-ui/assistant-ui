import { describe, expect, it, onTestFinished, vi } from "vitest";
import type { DictationAdapter } from "../../adapters/speech";
import { ExternalStoreThreadRuntimeCore } from "../../runtimes/external-store/external-store-thread-runtime-core";
import { LocalRuntimeCore } from "../../runtimes/local/local-runtime-core";
import type { ThreadMessage } from "../../types/message";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import { DefaultEditComposerRuntimeCore } from "./default-edit-composer-runtime-core";
import { DefaultThreadComposerRuntimeCore } from "./default-thread-composer-runtime-core";

const makeRuntime = (isDisabled: boolean, adapter: DictationAdapter) =>
  ({
    append: vi.fn(),
    cancelRun: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    capabilities: { cancel: false },
    messages: [],
    composer: { runConfig: {} },
    isDisabled,
    isSendDisabled: false,
    adapters: { dictation: adapter },
  }) as unknown as ThreadRuntimeCore & {
    isDisabled: boolean;
    adapters: { dictation: DictationAdapter };
  };

const makeDictationAdapter = () => {
  const session: DictationAdapter.Session = {
    status: { type: "running" },
    stop: vi.fn(async () => {}),
    cancel: vi.fn(),
    onSpeech: () => () => {},
    onSpeechStart: () => () => {},
    onSpeechEnd: () => () => {},
  };
  const listen = vi.fn(() => session);
  return { adapter: { listen }, listen, session };
};

const message: ThreadMessage = {
  id: "msg-1",
  role: "user",
  createdAt: new Date(),
  content: [{ type: "text", text: "hello" }],
  attachments: [],
  metadata: { custom: {} },
};

describe("default composer runtime core dictation", () => {
  it.each(["local", "external"] as const)(
    "cancels dictation and ignores late speech when an edit is cancelled in the %s runtime",
    (kind) => {
      vi.useFakeTimers();
      onTestFinished(() => {
        vi.useRealTimers();
      });
      let speech!: (result: DictationAdapter.Result) => void;
      let listening = false;
      const { adapter, session } = makeDictationAdapter();
      adapter.listen.mockImplementation(() => {
        listening = true;
        return session;
      });
      session.onSpeech = (callback) => {
        speech = callback;
        return () => {};
      };
      vi.mocked(session.cancel).mockImplementation(() => {
        listening = false;
      });
      const thread =
        kind === "local"
          ? new LocalRuntimeCore(
              {
                adapters: {
                  chatModel: { run: async () => ({}) },
                  dictation: adapter,
                },
              },
              [message],
            ).threads.getMainThreadRuntimeCore()
          : new ExternalStoreThreadRuntimeCore(
              { getModelContext: () => ({}) },
              {
                messages: [message],
                onNew: async () => {},
                onEdit: async () => {},
                adapters: { dictation: adapter },
              },
            );
      thread.beginEdit(message.id);
      const edit = thread.getEditComposer(message.id)!;
      onTestFinished(() => edit.stopDictation());
      edit.startDictation();
      speech({ transcript: "draft addition", isFinal: true });
      expect(edit.text).toBe("hello draft addition");
      expect(listening).toBe(true);

      edit.cancel();
      expect(thread.getEditComposer(message.id)).toBeUndefined();
      expect(edit.text).toBe("");
      const notify = vi.fn();
      edit.subscribe(notify);
      speech({ transcript: "late addition", isFinal: true });

      expect.soft(listening).toBe(false);
      expect.soft(edit.dictation).toBeUndefined();
      expect.soft(edit.text).toBe("");
      expect.soft(notify).not.toHaveBeenCalled();
      expect(thread.messages[0]!.content).toEqual(message.content);
    },
  );

  it("does not start dictation on a disabled thread composer", () => {
    const { adapter, listen } = makeDictationAdapter();
    const composer = new DefaultThreadComposerRuntimeCore(
      makeRuntime(true, adapter),
    );

    composer.startDictation();

    expect(listen).not.toHaveBeenCalled();
  });

  it("does not start dictation on a disabled edit composer", () => {
    const { adapter, listen } = makeDictationAdapter();
    const composer = new DefaultEditComposerRuntimeCore(
      makeRuntime(true, adapter),
      () => {},
      { parentId: null, message },
    );

    composer.startDictation();

    expect(listen).not.toHaveBeenCalled();
  });

  it("starts dictation on an enabled thread composer", () => {
    const { adapter, listen } = makeDictationAdapter();
    const composer = new DefaultThreadComposerRuntimeCore(
      makeRuntime(false, adapter),
    );

    composer.startDictation();

    expect(listen).toHaveBeenCalledOnce();
    composer.stopDictation();
  });

  it("keeps an active session running when the thread becomes disabled", async () => {
    const { adapter, listen, session } = makeDictationAdapter();
    const runtime = makeRuntime(false, adapter);
    const composer = new DefaultThreadComposerRuntimeCore(runtime);

    composer.startDictation();
    runtime.isDisabled = true;

    expect(listen).toHaveBeenCalledOnce();
    expect(composer.dictation).toBeDefined();
    expect(session.stop).not.toHaveBeenCalled();

    composer.stopDictation();
    await vi.waitFor(() => expect(composer.dictation).toBeUndefined());
    expect(session.stop).toHaveBeenCalledOnce();
  });
});
