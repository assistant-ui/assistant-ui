import { describe, expect, expectTypeOf, it, onTestFinished, vi } from "vitest";
import type { DictationAdapter } from "../../adapters/speech";
import type { AssistantError } from "../../types/error";
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

  it("keeps how the last session ended until the next one starts", () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const failing = makeSession();
    const next = makeSession();
    const listen = vi
      .fn()
      .mockReturnValueOnce(failing.session)
      .mockReturnValueOnce(next.session);
    const notify = vi.fn();
    const controller = new DictationSessionController({
      getAdapter: () => ({ listen }),
      getText: () => "",
      setText: () => {},
      notify,
    });

    controller.startDictation();
    expect(controller.lastDictationEnd).toBeUndefined();
    const error = { code: "not-allowed", message: "Permission denied" };
    failing.session.status = { type: "ended", reason: "error", error };
    notify.mockClear();
    vi.advanceTimersByTime(100);

    expect(controller.dictation).toBeUndefined();
    expect(controller.lastDictationEnd).toEqual({ reason: "error", error });
    expect(controller.lastDictationEnd?.error?.code).toBe("not-allowed");
    expect(controller.lastDictationEnd?.error).toBe(error);
    expectTypeOf(controller.lastDictationEnd?.error).toEqualTypeOf<
      AssistantError | undefined
    >();
    expect(notify).toHaveBeenCalledOnce();

    controller.startDictation();
    onTestFinished(() => controller.cancel());
    expect(controller.lastDictationEnd).toBeUndefined();
  });

  it("records cancelled when the adapter ends speech while cancelling", () => {
    const recording = makeSession();
    recording.session.cancel = vi.fn(() => recording.emitEnd());
    const controller = new DictationSessionController({
      getAdapter: () => ({ listen: () => recording.session }),
      getText: () => "",
      setText: () => {},
      notify: () => {},
    });

    controller.startDictation();
    controller.cancel();

    expect(controller.dictation).toBeUndefined();
    expect(controller.lastDictationEnd).toEqual({ reason: "cancelled" });
  });

  it.each([
    [
      "stopped",
      (controller: DictationSessionController) => controller.stopDictation(),
    ],
    [
      "cancelled",
      (controller: DictationSessionController) => controller.cancel(),
    ],
  ] as const)(
    "records %s when the adapter status has not ended",
    async (reason, end) => {
      const recording = makeSession();
      const controller = new DictationSessionController({
        getAdapter: () => ({ listen: () => recording.session }),
        getText: () => "",
        setText: () => {},
        notify: () => {},
      });

      controller.startDictation();
      end(controller);
      await Promise.resolve();

      expect(controller.lastDictationEnd).toEqual({ reason });
      const recorded = controller.lastDictationEnd;
      recording.emitEnd();
      controller.stopDictation();
      controller.cancel();
      expect(controller.lastDictationEnd).toBe(recorded);
    },
  );

  it("keeps no end for a session replaced by a new start", () => {
    const first = makeSession();
    const second = makeSession();
    const listen = vi
      .fn()
      .mockReturnValueOnce(first.session)
      .mockReturnValueOnce(second.session);
    const controller = new DictationSessionController({
      getAdapter: () => ({ listen }),
      getText: () => "",
      setText: () => {},
      notify: () => {},
    });

    controller.startDictation();
    controller.startDictation();
    onTestFinished(() => controller.cancel());

    expect(controller.lastDictationEnd).toBeUndefined();
  });

  it.each([
    [new Error("Permission denied"), "Permission denied"],
    ["Permission denied", "Permission denied"],
    [{ code: "not-allowed" }, "[object] [object Object]"],
  ])("normalizes adapter errors in composer state: %j", (error, message) => {
    const recording = makeSession();
    const controller = new DictationSessionController({
      getAdapter: () => ({ listen: () => recording.session }),
      getText: () => "",
      setText: () => {},
      notify: () => {},
    });

    controller.startDictation();
    recording.session.status = { type: "ended", reason: "error", error };
    recording.emitEnd();

    expect(controller.lastDictationEnd).toEqual({
      reason: "error",
      error: { code: "unknown", message },
    });
  });

  it("clears the previous end before calling listen", () => {
    const recording = makeSession();
    const listen = vi.fn(() => recording.session);
    const controller = new DictationSessionController({
      getAdapter: () => ({ listen }),
      getText: () => "",
      setText: () => {},
      notify: () => {},
    });
    controller.startDictation();
    recording.emitEnd();
    expect(controller.lastDictationEnd).toEqual({ reason: "stopped" });
    listen.mockImplementationOnce(() => {
      expect(controller.lastDictationEnd).toBeUndefined();
      return recording.session;
    });
    onTestFinished(() => controller.cancel());

    controller.startDictation();
  });

  it("records and publishes a synchronous listen failure, then rethrows it", () => {
    const error = new Error("SpeechRecognition is not supported");
    const notify = vi.fn();
    const controller = new DictationSessionController({
      getAdapter: () => ({
        listen: () => {
          throw error;
        },
      }),
      getText: () => "",
      setText: () => {},
      notify,
    });

    expect(() => controller.startDictation()).toThrow(error);
    expect(controller.dictation).toBeUndefined();
    expect(controller.lastDictationEnd).toEqual({
      reason: "error",
      error: { code: "unknown", message: error.message },
    });
    expect(notify).toHaveBeenCalledOnce();
  });

  it.each(["status", "onSpeechStart"] as const)(
    "records and publishes a failure reading %s during setup",
    (property) => {
      const error = new Error("Session setup failed");
      const recording = makeSession();
      Object.defineProperty(recording.session, property, {
        get: () => {
          throw error;
        },
      });
      const ends: unknown[] = [];
      const controller = new DictationSessionController({
        getAdapter: () => ({ listen: () => recording.session }),
        getText: () => "",
        setText: () => {},
        notify: () => ends.push(controller.lastDictationEnd),
      });

      expect(() => controller.startDictation()).toThrow(error);
      expect(controller.dictation).toBeUndefined();
      expect(controller.lastDictationEnd).toEqual({
        reason: "error",
        error: { code: "unknown", message: error.message },
      });
      expect(ends.filter((end) => end !== undefined)).toEqual([
        controller.lastDictationEnd,
      ]);
      expect(recording.session.cancel).toHaveBeenCalledOnce();
    },
  );

  it.each(["stop throw", "stop rejection", "cancel throw"])(
    "records the thrown value when a session terminates with %s",
    async (failure) => {
      const error = new Error("Shutdown failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      onTestFinished(() => consoleError.mockRestore());
      const recording = makeSession();
      if (failure === "stop rejection") {
        recording.session.stop = vi.fn().mockRejectedValue(error);
      } else if (failure === "stop throw") {
        recording.session.stop = () => {
          throw error;
        };
      } else {
        recording.session.cancel = () => {
          throw error;
        };
      }
      const controller = new DictationSessionController({
        getAdapter: () => ({ listen: () => recording.session }),
        getText: () => "",
        setText: () => {},
        notify: () => {},
      });

      controller.startDictation();
      if (failure === "cancel throw") controller.cancel();
      else controller.stopDictation();
      await Promise.resolve();

      expect(controller.lastDictationEnd).toEqual({
        reason: "error",
        error: { code: "unknown", message: error.message },
      });
    },
  );

  it("never records the ended status of a replaced session", async () => {
    const first = makeSession();
    const second = makeSession();
    const listen = vi
      .fn()
      .mockReturnValueOnce(first.session)
      .mockReturnValueOnce(second.session);
    const controller = new DictationSessionController({
      getAdapter: () => ({ listen }),
      getText: () => "",
      setText: () => {},
      notify: () => {},
    });
    controller.startDictation();
    first.session.status = { type: "ended", reason: "error", error: "stale" };
    const ends: unknown[] = [];
    first.session.stop = async () => {
      ends.push(controller.lastDictationEnd);
    };
    onTestFinished(() => controller.cancel());

    controller.startDictation();
    await Promise.resolve();

    expect(ends).toEqual([undefined]);
  });

  it("keeps the newer session when listen starts a replacement", () => {
    const first = makeSession();
    const second = makeSession();
    second.session.status = { type: "running" };
    const listen = vi.fn(() => second.session);
    const controller = new DictationSessionController({
      getAdapter: () => ({ listen }),
      getText: () => "",
      setText: () => {},
      notify: () => {},
    });
    listen.mockImplementationOnce(() => {
      controller.startDictation();
      return first.session;
    });
    onTestFinished(() => controller.cancel());

    controller.startDictation();

    expect(controller.dictation?.status).toEqual({ type: "running" });
    expect(controller.lastDictationEnd).toBeUndefined();
    expect(first.session.stop).toHaveBeenCalledOnce();
  });
});
