import { describe, expect, it, vi } from "vitest";
import type { DictationAdapter } from "../../adapters/speech";
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
