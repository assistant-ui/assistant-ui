import { describe, expect, it, vi } from "vitest";
import type { DictationAdapter } from "../../adapters/speech";
import { DictationSessionController } from "./dictation-session";

const makeSession = () => {
  let speech: (result: DictationAdapter.Result) => void = () => {};
  let speechStart: () => void = () => {};
  let speechEnd: () => void = () => {};
  const unsubscribe = vi.fn();
  const session: DictationAdapter.Session = {
    status: { type: "starting" },
    stop: vi.fn(async () => {}),
    cancel: vi.fn(),
    onSpeech: (callback) => {
      speech = callback;
      return unsubscribe;
    },
    onSpeechStart: (callback) => {
      speechStart = callback;
      return unsubscribe;
    },
    onSpeechEnd: (callback) => {
      speechEnd = () => callback({ transcript: "" });
      return unsubscribe;
    },
  };
  return {
    session,
    unsubscribe,
    emitSpeech: (result: DictationAdapter.Result) => speech(result),
    emitStart: () => speechStart(),
    emitEnd: () => speechEnd(),
  };
};

describe("DictationSessionController", () => {
  it("rebases interim and final transcripts onto composer edits", async () => {
    const recording = makeSession();
    let text = "draft";
    const notify = vi.fn();
    const controller = new DictationSessionController({
      getAdapter: () => ({ listen: () => recording.session }),
      getText: () => text,
      setText: (value) => {
        text = value;
      },
      notify,
    });

    controller.startDictation();
    recording.emitStart();
    recording.emitSpeech({ transcript: "hello", isFinal: false });
    expect(text).toBe("draft hello");
    expect(controller.dictation?.transcript).toBe("hello");

    text = "edited";
    controller.rebase(text);
    expect(controller.dictation?.transcript).toBeUndefined();
    recording.emitSpeech({ transcript: "world", isFinal: true });
    expect(text).toBe("edited world");
    expect(controller.dictation?.transcript).toBeUndefined();
    expect(notify).toHaveBeenCalledTimes(4);

    controller.stopDictation();
    await Promise.resolve();
    expect(recording.session.stop).toHaveBeenCalledTimes(1);
    expect(recording.unsubscribe).toHaveBeenCalledTimes(3);
    expect(controller.dictation).toBeUndefined();
  });

  it("ignores callbacks from a replaced session", async () => {
    const first = makeSession();
    const second = makeSession();
    const listen = vi
      .fn()
      .mockReturnValueOnce(first.session)
      .mockReturnValueOnce(second.session);
    let text = "";
    const controller = new DictationSessionController({
      getAdapter: () => ({ listen }),
      getText: () => text,
      setText: (value) => {
        text = value;
      },
      notify: () => {},
    });

    controller.startDictation();
    controller.startDictation();
    first.emitSpeech({ transcript: "stale", isFinal: true });
    first.emitEnd();
    expect(text).toBe("");
    expect(controller.dictation).toBeDefined();
    expect(first.session.stop).toHaveBeenCalledTimes(1);
    expect(first.unsubscribe).toHaveBeenCalledTimes(3);

    second.emitSpeech({ transcript: "current", isFinal: true });
    expect(text).toBe("current");
    second.emitEnd();
    await Promise.resolve();
    expect(second.unsubscribe).toHaveBeenCalledTimes(3);
    expect(controller.dictation).toBeUndefined();
  });

  it("cancels and tears down the active session before a late transcript", () => {
    const recording = makeSession();
    let text = "draft";
    const controller = new DictationSessionController({
      getAdapter: () => ({ listen: () => recording.session }),
      getText: () => text,
      setText: (value) => {
        text = value;
      },
      notify: () => {},
    });

    controller.startDictation();
    controller.cancel();
    recording.emitSpeech({ transcript: "late", isFinal: true });
    expect(recording.unsubscribe).toHaveBeenCalledTimes(3);
    expect(recording.session.cancel).toHaveBeenCalledTimes(1);
    expect(controller.dictation).toBeUndefined();
    expect(text).toBe("draft");
  });
});
