import { afterEach, expect, it, vi } from "vitest";
import { WebSpeechDictationAdapter } from "../adapters/speech";
import { BaseComposerRuntimeCore } from "../runtime/base/base-composer-runtime-core";

class Composer extends BaseComposerRuntimeCore {
  get canCancel() {
    return false;
  }

  get canSend() {
    return !this.isEmpty;
  }

  protected getAttachmentAdapter() {
    return undefined;
  }

  protected getDictationAdapter() {
    return new WebSpeechDictationAdapter();
  }

  protected handleSend() {}

  protected handleCancel() {}
}

const emitResult = (
  handlers: Map<string, (event: unknown) => void>,
  resultIndex: number,
  transcripts: Array<{ transcript: string; isFinal: boolean }>,
) => {
  handlers.get("result")!({
    resultIndex,
    results: transcripts.map(({ transcript, isFinal }) => ({
      0: { transcript },
      isFinal,
    })),
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const createComposer = (text = "") => {
  const handlers = new Map<string, (event: unknown) => void>();
  class Recognition {
    addEventListener(name: string, fn: (event: unknown) => void) {
      handlers.set(name, fn);
    }

    start() {}

    stop() {
      handlers.get("end")?.({});
    }

    abort() {
      handlers.get("end")?.({});
    }
  }

  vi.stubGlobal("window", { SpeechRecognition: Recognition });
  const composer = new Composer();
  composer.setText(text);
  composer.startDictation();
  return { composer, handlers };
};

it("keeps the complete current interim suffix in the composer", () => {
  vi.useFakeTimers();
  const { composer, handlers } = createComposer("existing");

  emitResult(handlers, 0, [
    { transcript: "hello ", isFinal: false },
    { transcript: "world", isFinal: false },
  ]);

  expect(composer.text).toBe("existing hello world");
  composer.stopDictation();
});

it("clears a retracted interim suffix", () => {
  vi.useFakeTimers();
  const { composer, handlers } = createComposer();

  emitResult(handlers, 0, [{ transcript: "phantom words", isFinal: false }]);
  expect(composer.text).toBe("phantom words");

  emitResult(handlers, 0, []);
  expect(composer.text).toBe("");
  composer.stopDictation();
});
