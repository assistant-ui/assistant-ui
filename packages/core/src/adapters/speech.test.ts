import { afterEach, describe, expect, it, vi } from "vitest";
import { WebSpeechDictationAdapter, WebSpeechSynthesisAdapter } from "./speech";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("WebSpeechSynthesisAdapter", () => {
  it("isolates a late subscriber that throws after the utterance ended", async () => {
    const listeners = new Map<string, EventListener>();
    class MockSpeechSynthesisUtterance {
      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener);
      }
    }
    vi.stubGlobal("SpeechSynthesisUtterance", MockSpeechSynthesisUtterance);
    vi.stubGlobal("window", {
      speechSynthesis: {
        speak: vi.fn(),
        cancel: vi.fn(),
      },
    });
    const listenerError = new Error("late listener failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = new WebSpeechSynthesisAdapter().speak("Hello");
    listeners.get("end")!(new Event("end"));

    const lateListener = vi.fn();
    result.subscribe(() => {
      throw listenerError;
    });
    result.subscribe(lateListener);
    await Promise.resolve();

    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Speech synthesis listener threw an error",
      listenerError,
    );
    expect(lateListener).toHaveBeenCalledOnce();
  });

  it("continues notifying listeners when one throws", () => {
    const listeners = new Map<string, EventListener>();
    class MockSpeechSynthesisUtterance {
      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener);
      }
    }
    const speak = vi.fn();
    vi.stubGlobal("SpeechSynthesisUtterance", MockSpeechSynthesisUtterance);
    vi.stubGlobal("window", {
      speechSynthesis: {
        speak,
        cancel: vi.fn(),
      },
    });
    const listenerError = new Error("listener failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const result = new WebSpeechSynthesisAdapter().speak("Hello");
    const laterListener = vi.fn();

    result.subscribe(() => {
      throw listenerError;
    });
    result.subscribe(laterListener);
    listeners.get("end")?.({} as Event);

    expect(speak).toHaveBeenCalledWith(
      expect.any(MockSpeechSynthesisUtterance),
    );
    expect(laterListener).toHaveBeenCalledOnce();
    expect(result.status).toEqual({
      type: "ended",
      reason: "finished",
      error: undefined,
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Speech synthesis listener threw an error",
      listenerError,
    );
  });
});

describe("WebSpeechDictationAdapter", () => {
  const stubSpeechRecognition = () => {
    const listeners = new Map<string, EventListener>();
    class MockSpeechRecognition {
      lang = "";
      continuous = false;
      interimResults = false;

      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener);
      }

      start() {}
      stop() {}
      abort() {}
    }
    vi.stubGlobal("window", {
      SpeechRecognition: MockSpeechRecognition,
    });
    return listeners;
  };

  const emitResult = (
    listeners: Map<string, EventListener>,
    resultIndex: number,
    results: Array<{ transcript: string; isFinal: boolean }>,
  ) => {
    listeners.get("result")?.({
      resultIndex,
      results: results.map(({ transcript, isFinal }) => ({
        0: { transcript },
        isFinal,
      })),
    } as unknown as Event);
  };

  it("continues notifying dictation listeners when one throws", () => {
    const listeners = stubSpeechRecognition();
    const listenerError = new Error("listener failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const session = new WebSpeechDictationAdapter().listen();
    const laterStartListener = vi.fn();
    const laterSpeechListener = vi.fn();
    const laterEndListener = vi.fn();

    session.onSpeechStart(() => {
      throw listenerError;
    });
    session.onSpeechStart(laterStartListener);
    session.onSpeech(() => {
      throw listenerError;
    });
    session.onSpeech(laterSpeechListener);
    session.onSpeechEnd(() => {
      throw listenerError;
    });
    session.onSpeechEnd(laterEndListener);

    const event = {
      resultIndex: 0,
      results: [
        {
          0: { transcript: "Hello" },
          isFinal: true,
        },
      ],
    } as unknown as Event;

    expect(() =>
      listeners.get("speechstart")?.(new Event("speechstart")),
    ).not.toThrow();
    expect(() => listeners.get("result")?.(event)).not.toThrow();
    expect(() => listeners.get("end")?.(new Event("end"))).not.toThrow();

    expect(laterStartListener).toHaveBeenCalledOnce();
    expect(laterSpeechListener).toHaveBeenCalledWith({
      transcript: "Hello",
      isFinal: true,
    });
    expect(laterEndListener).toHaveBeenCalledWith({
      transcript: "Hello",
    });
    expect(consoleError).toHaveBeenCalledTimes(3);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Dictation listener threw an error",
      listenerError,
    );
  });

  it("isolates async failures and payload mutations", async () => {
    const listeners = stubSpeechRecognition();
    const listenerError = new Error("async listener failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const session = new WebSpeechDictationAdapter().listen();
    const laterListener = vi.fn();

    session.onSpeech(async (result) => {
      result.transcript = "Changed";
      result.isFinal = false;
      throw listenerError;
    });
    session.onSpeech(laterListener);

    const event = {
      resultIndex: 0,
      results: [
        {
          0: { transcript: "Hello" },
          isFinal: true,
        },
      ],
    } as unknown as Event;

    expect(() => listeners.get("result")?.(event)).not.toThrow();
    expect(laterListener).toHaveBeenCalledWith({
      transcript: "Hello",
      isFinal: true,
    });
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Dictation listener threw an error",
        listenerError,
      );
    });
  });

  it("publishes the complete current interim suffix and clears retractions", () => {
    const listeners = stubSpeechRecognition();
    const session = new WebSpeechDictationAdapter().listen();
    const speechListener = vi.fn();
    session.onSpeech(speechListener);

    emitResult(listeners, 0, [
      { transcript: "hello ", isFinal: false },
      { transcript: "world", isFinal: false },
    ]);
    expect(speechListener).toHaveBeenLastCalledWith({
      transcript: "hello world",
      isFinal: false,
    });

    emitResult(listeners, 1, [
      { transcript: "hello ", isFinal: false },
      { transcript: "there", isFinal: false },
    ]);
    expect(speechListener).toHaveBeenLastCalledWith({
      transcript: "hello there",
      isFinal: false,
    });

    emitResult(listeners, 1, [{ transcript: "hello ", isFinal: false }]);
    expect(speechListener).toHaveBeenLastCalledWith({
      transcript: "hello ",
      isFinal: false,
    });

    emitResult(listeners, 1, []);
    expect(speechListener).toHaveBeenLastCalledWith({
      transcript: "",
      isFinal: false,
    });
  });

  it("keeps final delivery incremental around an interim suffix", () => {
    const listeners = stubSpeechRecognition();
    const session = new WebSpeechDictationAdapter().listen();
    const speechListener = vi.fn();
    const speechEndListener = vi.fn();
    session.onSpeech(speechListener);
    session.onSpeechEnd(speechEndListener);

    emitResult(listeners, 0, [
      { transcript: "hello ", isFinal: true },
      { transcript: "world", isFinal: false },
    ]);
    expect(speechListener.mock.calls).toEqual([
      [{ transcript: "hello ", isFinal: true }],
      [{ transcript: "world", isFinal: false }],
    ]);

    emitResult(listeners, 1, [
      { transcript: "hello ", isFinal: true },
      { transcript: "world", isFinal: true },
    ]);
    expect(speechListener.mock.calls).toEqual([
      [{ transcript: "hello ", isFinal: true }],
      [{ transcript: "world", isFinal: false }],
      [{ transcript: "world", isFinal: true }],
    ]);

    listeners.get("end")?.(new Event("end"));
    expect(speechEndListener).toHaveBeenCalledWith({
      transcript: "hello world",
    });
  });
});
