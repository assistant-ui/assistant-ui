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

  const emitResults = (
    listeners: Map<string, EventListener>,
    results: [transcript: string, isFinal: boolean][],
    resultIndex = 0,
  ) => {
    listeners.get("result")!({
      resultIndex,
      results: results.map(([transcript, isFinal]) => ({
        0: { transcript },
        isFinal,
      })),
    } as unknown as Event);
  };

  it("publishes the entire interim suffix when only its last result changes", () => {
    const listeners = stubSpeechRecognition();
    const session = new WebSpeechDictationAdapter().listen();
    const onSpeech = vi.fn();
    session.onSpeech(onSpeech);

    emitResults(listeners, [
      ["hello ", false],
      ["world", false],
    ]);
    emitResults(
      listeners,
      [
        ["hello ", false],
        ["there", false],
      ],
      1,
    );

    expect(onSpeech.mock.calls).toEqual([
      [{ transcript: "hello world", isFinal: false }],
      [{ transcript: "hello there", isFinal: false }],
    ]);
  });

  it("publishes partial and complete retractions with no changed results", () => {
    const listeners = stubSpeechRecognition();
    const session = new WebSpeechDictationAdapter().listen();
    const onSpeech = vi.fn();
    session.onSpeech(onSpeech);

    emitResults(listeners, [
      ["hello ", false],
      ["world", false],
    ]);
    emitResults(listeners, [["hello ", false]], 1);
    emitResults(listeners, []);
    emitResults(listeners, []);

    expect(onSpeech.mock.calls).toEqual([
      [{ transcript: "hello world", isFinal: false }],
      [{ transcript: "hello ", isFinal: false }],
      [{ transcript: "", isFinal: false }],
    ]);
  });

  it("delivers changed final results once before the remaining interim suffix", () => {
    const listeners = stubSpeechRecognition();
    const session = new WebSpeechDictationAdapter().listen();
    const onSpeech = vi.fn();
    const onEnd = vi.fn();
    session.onSpeech(onSpeech);
    session.onSpeechEnd(onEnd);

    emitResults(listeners, [
      ["hello ", true],
      ["wor", false],
      ["ld", false],
    ]);
    emitResults(
      listeners,
      [
        ["hello ", true],
        ["world", true],
      ],
      1,
    );
    listeners.get("end")!(new Event("end"));

    expect(onSpeech.mock.calls).toEqual([
      [{ transcript: "hello ", isFinal: true }],
      [{ transcript: "world", isFinal: false }],
      [{ transcript: "world", isFinal: true }],
    ]);
    expect(onEnd).toHaveBeenCalledExactlyOnceWith({
      transcript: "hello world",
    });
  });

  it("clears an interim suffix while retaining earlier final results", () => {
    const listeners = stubSpeechRecognition();
    const session = new WebSpeechDictationAdapter().listen();
    const onSpeech = vi.fn();
    session.onSpeech(onSpeech);

    emitResults(listeners, [
      ["hello ", true],
      ["world", false],
    ]);
    emitResults(listeners, [["hello ", true]], 1);

    expect(onSpeech.mock.calls).toEqual([
      [{ transcript: "hello ", isFinal: true }],
      [{ transcript: "world", isFinal: false }],
      [{ transcript: "", isFinal: false }],
    ]);
  });

  it("keeps final-only delivery free of empty interim updates", () => {
    const listeners = stubSpeechRecognition();
    const session = new WebSpeechDictationAdapter().listen();
    const onSpeech = vi.fn();
    session.onSpeech(onSpeech);

    emitResults(listeners, [["hello", true]]);
    emitResults(listeners, [["hello", true]], 1);

    expect(onSpeech).toHaveBeenCalledExactlyOnceWith({
      transcript: "hello",
      isFinal: true,
    });
  });

  it("does not reread historical finalized results during interim updates", () => {
    const listeners = stubSpeechRecognition();
    new WebSpeechDictationAdapter().listen();
    const readFinal = vi.fn(() => ({ transcript: "word " }));
    const finals = Array.from({ length: 1_000 }, () => ({
      get 0() {
        return readFinal();
      },
      isFinal: true,
    }));
    listeners.get("result")!({
      resultIndex: 0,
      results: finals,
    } as unknown as Event);
    expect(readFinal).toHaveBeenCalledTimes(1_000);

    for (const transcript of ["hel", "hello", "hello world"]) {
      listeners.get("result")!({
        resultIndex: finals.length,
        results: [...finals, { 0: { transcript }, isFinal: false }],
      } as unknown as Event);
    }

    expect(readFinal).toHaveBeenCalledTimes(1_000);
  });

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
});
