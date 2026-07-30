import { describe, expect, it, vi } from "vitest";
import type { DictationAdapter } from "../../adapters/speech";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import { DefaultThreadComposerRuntimeCore } from "./default-thread-composer-runtime-core";

const makeComposer = (dictation: DictationAdapter) => {
  const runtime = {
    append: vi.fn(),
    cancelRun: vi.fn(),
    subscribe: () => () => {},
    capabilities: { cancel: false },
    messages: [],
    isSendDisabled: false,
    getModelContext: () => ({}),
    adapters: { dictation },
  } as unknown as Omit<ThreadRuntimeCore, "composer"> & {
    adapters: { dictation: DictationAdapter };
  };

  return new DefaultThreadComposerRuntimeCore(runtime);
};

describe("BaseComposerRuntimeCore dictation", () => {
  it("handles rejected dictation shutdowns", async () => {
    const session: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn().mockRejectedValue(new Error("shutdown failed")),
      cancel: vi.fn(),
      onSpeechStart: vi.fn(() => () => {}),
      onSpeechEnd: vi.fn(() => () => {}),
      onSpeech: vi.fn(() => () => {}),
    };
    const composer = makeComposer({ listen: () => session });

    composer.startDictation();
    expect(composer.dictation).toBeDefined();

    composer.stopDictation();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(session.stop).toHaveBeenCalledOnce();
    expect(composer.dictation).toBeUndefined();
  });
});
