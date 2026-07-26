import { afterEach, describe, expect, it, vi } from "vitest";
import { WebSpeechSynthesisAdapter } from "./speech";

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
