import { afterEach, describe, expect, it, vi } from "vitest";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import type { ModelContextProvider } from "../../model-context/types";
import type { AppendMessage } from "../../types/message";
import { CompositeContextProvider } from "../../utils/composite-context-provider";
import type {
  AddToolResultOptions,
  ResumeRunConfig,
  ResumeToolCallOptions,
  RespondToToolApprovalOptions,
  RuntimeCapabilities,
  StartRunConfig,
  ThreadSuggestion,
} from "../interfaces/thread-runtime-core";
import { BaseThreadRuntimeCore } from "./base-thread-runtime-core";
import type { SpeechSynthesisAdapter } from "../../adapters/speech";
import { LocalRuntimeCore } from "../../runtimes/local/local-runtime-core";

const createVoiceAdapter = () => {
  let volumeCallback: ((volume: number) => void) | undefined;
  let transcriptCallback:
    | ((transcript: RealtimeVoiceAdapter.TranscriptItem) => void)
    | undefined;
  const session: RealtimeVoiceAdapter.Session = {
    status: { type: "running" },
    isMuted: false,
    disconnect: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
    onStatusChange: () => () => {},
    onTranscript: (callback) => {
      transcriptCallback = callback;
      return () => {
        transcriptCallback = undefined;
      };
    },
    onModeChange: () => () => {},
    onVolumeChange: (callback) => {
      volumeCallback = callback;
      return () => {
        volumeCallback = undefined;
      };
    },
  };

  return {
    adapter: { connect: () => session },
    emitVolume: (volume: number) => volumeCallback?.(volume),
    emitTranscript: (transcript: RealtimeVoiceAdapter.TranscriptItem) =>
      transcriptCallback?.(transcript),
    session,
  } satisfies {
    adapter: RealtimeVoiceAdapter;
    emitVolume: (volume: number) => void;
    emitTranscript: (transcript: RealtimeVoiceAdapter.TranscriptItem) => void;
    session: RealtimeVoiceAdapter.Session;
  };
};

class TestRuntime extends BaseThreadRuntimeCore {
  private readonly voiceAdapter: ReturnType<typeof createVoiceAdapter>;

  constructor(
    voiceAdapter: ReturnType<typeof createVoiceAdapter>,
    contextProvider: ModelContextProvider = { getModelContext: () => ({}) },
  ) {
    super(contextProvider);
    this.voiceAdapter = voiceAdapter;
  }

  get adapters() {
    return { voice: this.voiceAdapter.adapter };
  }

  get isDisabled() {
    return false;
  }

  get isSendDisabled() {
    return false;
  }

  get isLoading() {
    return false;
  }

  get suggestions(): readonly ThreadSuggestion[] {
    return [];
  }

  get extras() {
    return undefined;
  }

  get capabilities(): RuntimeCapabilities {
    return {
      switchToBranch: false,
      switchBranchDuringRun: false,
      edit: false,
      delete: false,
      reload: false,
      refetchThread: false,
      cancel: false,
      unstable_copy: false,
      speech: false,
      dictation: false,
      voice: true,
      attachments: false,
      feedback: false,
      queue: false,
    };
  }

  append(_message: AppendMessage) {}
  deleteMessage(_messageId: string) {}
  startRun(_config: StartRunConfig) {}
  resumeRun(_config: ResumeRunConfig) {}
  addToolResult(_options: AddToolResultOptions) {}
  resumeToolCall(_options: ResumeToolCallOptions) {}
  async respondToToolApproval(_options: RespondToToolApprovalOptions) {}
  cancelRun() {}
  exportExternalState() {
    return {};
  }
  importExternalState(_state: unknown) {}
  unstable_notifySessionReset() {}
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BaseThreadRuntimeCore speech lifecycle", () => {
  const createUtterance = () => {
    let notify = () => {};
    const unsubscribe = vi.fn();
    const utterance: SpeechSynthesisAdapter.Utterance = {
      status: { type: "running" },
      cancel: vi.fn(),
      subscribe: (callback) => {
        notify = callback;
        return unsubscribe;
      },
    };
    return { utterance, unsubscribe, notify: () => notify() };
  };

  const createThread = (speech: SpeechSynthesisAdapter) => {
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async run() {
              return {};
            },
          },
          speech,
        },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    thread.reset([
      {
        id: "first",
        role: "assistant",
        content: [{ type: "text", text: "Hello" }],
      },
      {
        id: "second",
        role: "assistant",
        content: [{ type: "text", text: "Again" }],
      },
    ]);
    return thread;
  };

  it("releases a session that completes during subscription", () => {
    const { utterance, unsubscribe } = createUtterance();
    utterance.subscribe = (callback) => {
      utterance.status = { type: "ended", reason: "finished" };
      callback();
      return unsubscribe;
    };
    const thread = createThread({ speak: () => utterance });

    thread.speak("first");

    expect(thread.speech).toBeUndefined();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(utterance.cancel).not.toHaveBeenCalled();
    expect(() => thread.stopSpeaking()).toThrow("No message is being spoken");
  });

  it("does not install an already-ended utterance", () => {
    const { utterance, unsubscribe } = createUtterance();
    utterance.status = { type: "ended", reason: "finished" };
    const thread = createThread({ speak: () => utterance });

    thread.speak("first");

    expect(thread.speech).toBeUndefined();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it.each(["finished", "error", "cancelled"] as const)(
    "releases the listener after %s completion",
    (reason) => {
      const { utterance, unsubscribe, notify } = createUtterance();
      const thread = createThread({ speak: () => utterance });
      thread.speak("first");
      const subscriber = vi.fn();
      thread.subscribe(subscriber);

      utterance.status = { type: "ended", reason };
      notify();
      notify();

      expect(thread.speech).toBeUndefined();
      expect(unsubscribe).toHaveBeenCalledOnce();
      expect(subscriber).toHaveBeenCalledOnce();
      expect(utterance.cancel).not.toHaveBeenCalled();
    },
  );

  it("ignores old running and ended callbacks after replacement", () => {
    const first = createUtterance();
    const second = createUtterance();
    const speak = vi
      .fn()
      .mockReturnValueOnce(first.utterance)
      .mockReturnValueOnce(second.utterance);
    const thread = createThread({ speak });
    thread.speak("first");
    thread.speak("second");
    const subscriber = vi.fn();
    thread.subscribe(subscriber);

    first.notify();
    first.utterance.status = { type: "ended", reason: "cancelled" };
    first.notify();

    expect(thread.speech).toEqual({
      messageId: "second",
      status: { type: "running" },
    });
    expect(subscriber).not.toHaveBeenCalled();
    expect(first.utterance.cancel).toHaveBeenCalledOnce();
    expect(first.unsubscribe).toHaveBeenCalledOnce();
    thread.stopSpeaking();
    expect(second.utterance.cancel).toHaveBeenCalledOnce();
    expect(second.unsubscribe).toHaveBeenCalledOnce();
  });

  it("clears state before synchronous cancellation callbacks", () => {
    const { utterance, unsubscribe, notify } = createUtterance();
    utterance.cancel = vi.fn(() => {
      utterance.status = { type: "ended", reason: "cancelled" };
      notify();
    });
    const thread = createThread({ speak: () => utterance });
    thread.speak("first");
    const subscriber = vi.fn();
    thread.subscribe(subscriber);

    thread.stopSpeaking();

    expect(thread.speech).toBeUndefined();
    expect(utterance.cancel).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(subscriber).toHaveBeenCalledOnce();
  });

  it.each(["cancellation", "unsubscribe"] as const)(
    "notifies stopped state when %s throws",
    (failure) => {
      const { utterance, unsubscribe } = createUtterance();
      const error = new Error("cleanup failed");
      const thread = createThread({ speak: () => utterance });
      thread.speak("first");
      let observedSpeech = thread.speech;
      const subscriber = vi.fn(() => {
        observedSpeech = thread.speech;
      });
      thread.subscribe(subscriber);
      if (failure === "cancellation") {
        utterance.cancel = vi.fn(() => {
          throw error;
        });
      } else {
        unsubscribe.mockImplementation(() => {
          throw error;
        });
      }

      expect(() => thread.stopSpeaking()).toThrow(error);

      expect(observedSpeech).toBeUndefined();
      expect(thread.speech).toBeUndefined();
      expect(subscriber).toHaveBeenCalledOnce();
      expect(unsubscribe).toHaveBeenCalledOnce();
      expect(utterance.cancel).toHaveBeenCalledOnce();
      expect(() => thread.stopSpeaking()).toThrow("No message is being spoken");
      expect(subscriber).toHaveBeenCalledOnce();
    },
  );

  it("reports stop and notification failures after notifying later subscribers", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { utterance } = createUtterance();
    const cleanupError = new Error("cleanup failed");
    const notificationError = new Error("notification failed");
    utterance.cancel = vi.fn(() => {
      throw cleanupError;
    });
    const thread = createThread({ speak: () => utterance });
    thread.speak("first");
    thread.subscribe(() => {
      throw notificationError;
    });
    const laterSubscriber = vi.fn();
    thread.subscribe(laterSubscriber);

    expect(() => thread.stopSpeaking()).toThrow(
      expect.objectContaining({
        errors: [cleanupError, notificationError],
      }),
    );

    expect(thread.speech).toBeUndefined();
    expect(laterSubscriber).toHaveBeenCalledOnce();
  });

  it("notifies completed state even when terminal unsubscribe throws", () => {
    const { utterance, unsubscribe, notify } = createUtterance();
    const error = new Error("unsubscribe failed");
    unsubscribe.mockImplementation(() => {
      throw error;
    });
    const thread = createThread({ speak: () => utterance });
    thread.speak("first");
    let observedSpeech = thread.speech;
    const subscriber = vi.fn(() => {
      observedSpeech = thread.speech;
    });
    thread.subscribe(subscriber);
    utterance.status = { type: "ended", reason: "finished" };

    expect(notify).toThrow(error);

    expect(observedSpeech).toBeUndefined();
    expect(subscriber).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(utterance.cancel).not.toHaveBeenCalled();
    expect(notify).not.toThrow();
    expect(subscriber).toHaveBeenCalledOnce();
  });

  it("cancels playback if a subscriber throws during initial state publication", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { utterance, unsubscribe } = createUtterance();
    const error = new Error("subscriber failed");
    const thread = createThread({ speak: () => utterance });
    thread.subscribe(() => {
      throw error;
    });

    expect(() => thread.speak("first")).toThrow(error);

    expect(thread.speech).toBeUndefined();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(utterance.cancel).toHaveBeenCalledOnce();
    expect(() => thread.stopSpeaking()).toThrow("No message is being spoken");
  });

  it("cancels a session when subscribing throws", () => {
    const { utterance } = createUtterance();
    const error = new Error("subscription failed");
    utterance.subscribe = () => {
      throw error;
    };
    const thread = createThread({ speak: () => utterance });

    expect(() => thread.speak("first")).toThrow(error);
    expect(thread.speech).toBeUndefined();
    expect(utterance.cancel).toHaveBeenCalledOnce();
    expect(() => thread.stopSpeaking()).toThrow("No message is being spoken");
  });

  it("notifies observers when replacement subscription fails", () => {
    const first = createUtterance();
    const second = createUtterance();
    const error = new Error("subscription failed");
    second.utterance.subscribe = () => {
      throw error;
    };
    const thread = createThread({
      speak: vi
        .fn()
        .mockReturnValueOnce(first.utterance)
        .mockReturnValueOnce(second.utterance),
    });
    thread.speak("first");
    let observedSpeech = thread.speech;
    const subscriber = vi.fn(() => {
      observedSpeech = thread.speech;
    });
    thread.subscribe(subscriber);

    expect(() => thread.speak("second")).toThrow(error);

    expect(observedSpeech).toBeUndefined();
    expect(subscriber).toHaveBeenCalledOnce();
    expect(second.utterance.cancel).toHaveBeenCalledOnce();
  });

  it.each(["creation", "cancellation", "unsubscribe"] as const)(
    "notifies observers when replacement fails during %s",
    (failure) => {
      const first = createUtterance();
      const error = new Error("replacement failed");
      const speak = vi
        .fn()
        .mockReturnValueOnce(first.utterance)
        .mockImplementationOnce(() => {
          throw error;
        });
      const thread = createThread({ speak });
      thread.speak("first");
      let observedSpeech = thread.speech;
      const subscriber = vi.fn(() => {
        observedSpeech = thread.speech;
      });
      thread.subscribe(subscriber);
      if (failure === "cancellation") {
        first.utterance.cancel = vi.fn(() => {
          throw error;
        });
      } else if (failure === "unsubscribe") {
        first.unsubscribe.mockImplementation(() => {
          throw error;
        });
      }

      expect(() => thread.speak("second")).toThrow(error);

      expect(observedSpeech).toBeUndefined();
      expect(thread.speech).toBeUndefined();
      expect(subscriber).toHaveBeenCalledOnce();
      expect(first.unsubscribe).toHaveBeenCalledOnce();
      expect(first.utterance.cancel).toHaveBeenCalledOnce();
      expect(speak).toHaveBeenCalledTimes(failure === "creation" ? 2 : 1);
    },
  );

  it("preserves a creation error when rollback notification throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const first = createUtterance();
    const creationError = new Error("creation failed");
    const notificationError = new Error("notification failed");
    const thread = createThread({
      speak: vi
        .fn()
        .mockReturnValueOnce(first.utterance)
        .mockImplementationOnce(() => {
          throw creationError;
        }),
    });
    thread.speak("first");
    thread.subscribe(() => {
      throw notificationError;
    });
    const laterSubscriber = vi.fn();
    thread.subscribe(laterSubscriber);

    expect(() => thread.speak("second")).toThrow(creationError);

    expect(thread.speech).toBeUndefined();
    expect(laterSubscriber).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Speech rollback notification threw",
      notificationError,
    );
  });

  it("does not notify when initial utterance creation fails", () => {
    const error = new Error("creation failed");
    const thread = createThread({
      speak: () => {
        throw error;
      },
    });
    const subscriber = vi.fn();
    thread.subscribe(subscriber);

    expect(() => thread.speak("first")).toThrow(error);

    expect(thread.speech).toBeUndefined();
    expect(subscriber).not.toHaveBeenCalled();
  });

  it("preserves reentrant speech when the outer creation throws", () => {
    const first = createUtterance();
    const replacement = createUtterance();
    const error = new Error("outer creation failed");
    const speak = vi.fn().mockReturnValue(first.utterance);
    const thread = createThread({ speak });
    thread.speak("first");
    speak
      .mockImplementationOnce(() => {
        thread.speak("second");
        throw error;
      })
      .mockReturnValueOnce(replacement.utterance);
    const subscriber = vi.fn();
    thread.subscribe(subscriber);

    expect(() => thread.speak("second")).toThrow(error);

    expect(thread.speech?.messageId).toBe("second");
    expect(replacement.utterance.cancel).not.toHaveBeenCalled();
    expect(subscriber).toHaveBeenCalledOnce();
    thread.stopSpeaking();
    expect(replacement.unsubscribe).toHaveBeenCalledOnce();
  });

  it("preserves the setup error when rollback cancellation throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { utterance } = createUtterance();
    const setupError = new Error("subscription failed");
    const cleanupError = new Error("cancellation failed");
    utterance.subscribe = () => {
      throw setupError;
    };
    utterance.cancel = vi.fn(() => {
      throw cleanupError;
    });
    const thread = createThread({ speak: () => utterance });
    const subscriber = vi.fn();
    thread.subscribe(subscriber);

    expect(() => thread.speak("first")).toThrow(setupError);

    expect(thread.speech).toBeUndefined();
    expect(subscriber).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Speech rollback cleanup threw",
      cleanupError,
    );
  });

  it("does not notify twice when subscription completes before throwing", () => {
    const { utterance } = createUtterance();
    const error = new Error("subscription failed");
    utterance.subscribe = (callback) => {
      utterance.status = { type: "ended", reason: "finished" };
      callback();
      throw error;
    };
    const thread = createThread({ speak: () => utterance });
    const subscriber = vi.fn();
    thread.subscribe(subscriber);

    expect(() => thread.speak("first")).toThrow(error);

    expect(thread.speech).toBeUndefined();
    expect(subscriber).toHaveBeenCalledOnce();
    expect(utterance.cancel).not.toHaveBeenCalled();
  });

  it("leaves a reentrant replacement active when the old subscription throws", () => {
    const first = createUtterance();
    const second = createUtterance();
    const thread = createThread({
      speak: vi
        .fn()
        .mockReturnValueOnce(first.utterance)
        .mockReturnValueOnce(second.utterance),
    });
    const error = new Error("old subscription failed");
    first.utterance.subscribe = () => {
      thread.speak("second");
      throw error;
    };
    const subscriber = vi.fn();
    thread.subscribe(subscriber);

    expect(() => thread.speak("first")).toThrow(error);

    expect(thread.speech?.messageId).toBe("second");
    expect(subscriber).toHaveBeenCalledOnce();
    expect(first.utterance.cancel).toHaveBeenCalledOnce();
    expect(second.utterance.cancel).not.toHaveBeenCalled();
    thread.stopSpeaking();
    expect(second.unsubscribe).toHaveBeenCalledOnce();
  });
});

describe("BaseThreadRuntimeCore subscriptions", () => {
  it("notifies later subscribers when an earlier subscriber throws", () => {
    const runtime = new TestRuntime(createVoiceAdapter());
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();

    runtime.subscribe(() => {
      throw error;
    });
    runtime.subscribe(laterSubscriber);

    expect(() => runtime.reset()).toThrow(error);
    expect(laterSubscriber).toHaveBeenCalledOnce();
  });

  it("isolates initialize listener errors during late replay", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const runtime = new TestRuntime(createVoiceAdapter());
    runtime.reset();

    const syncError = new Error("sync listener failed");
    const asyncError = new Error("async listener failed");
    runtime.unstable_on("initialize", () => {
      throw syncError;
    });
    runtime.unstable_on("initialize", async () => {
      throw asyncError;
    });

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledTimes(2);
      expect(consoleError).toHaveBeenCalledWith(
        '[assistant-ui] Thread runtime "initialize" listener threw an error',
        syncError,
      );
      expect(consoleError).toHaveBeenCalledWith(
        '[assistant-ui] Thread runtime "initialize" listener threw an error',
        asyncError,
      );
    });
  });

  it("isolates modelContextUpdate listener errors during context updates", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const provider = new CompositeContextProvider();
    const runtime = new TestRuntime(createVoiceAdapter(), provider);
    const listenerError = new Error("model context listener failed");
    const laterListener = vi.fn();

    runtime.unstable_on("modelContextUpdate", () => {
      throw listenerError;
    });
    runtime.unstable_on("modelContextUpdate", laterListener);

    const unregister = provider.registerModelContextProvider({
      getModelContext: () => ({}),
    });

    expect(laterListener).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenNthCalledWith(
      1,
      '[assistant-ui] Thread runtime "modelContextUpdate" listener threw an error',
      listenerError,
    );
    expect(() => unregister()).not.toThrow();
    expect(laterListener).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenNthCalledWith(
      2,
      '[assistant-ui] Thread runtime "modelContextUpdate" listener threw an error',
      listenerError,
    );
  });

  it("observes rejected modelContextUpdate listener promises", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const provider = new CompositeContextProvider();
    const runtime = new TestRuntime(createVoiceAdapter(), provider);
    const listenerError = new Error("async model context listener failed");

    runtime.unstable_on("modelContextUpdate", async () => {
      throw listenerError;
    });

    expect(() =>
      provider.registerModelContextProvider({ getModelContext: () => ({}) }),
    ).not.toThrow();

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        '[assistant-ui] Thread runtime "modelContextUpdate" listener threw an error',
        listenerError,
      );
    });
  });
});

describe("BaseThreadRuntimeCore voice volume subscriptions", () => {
  it("finishes disconnecting when a session cleanup throws", () => {
    const cleanupError = new Error("cleanup failed");
    const laterCleanup = vi.fn();
    const voice = createVoiceAdapter();
    voice.session.onStatusChange = () => () => {
      throw cleanupError;
    };
    voice.session.onModeChange = () => laterCleanup;
    const runtime = new TestRuntime(voice);
    runtime.connectVoice();

    expect(() => runtime.disconnectVoice()).toThrow(cleanupError);
    expect(laterCleanup).toHaveBeenCalledOnce();
    expect(voice.session.disconnect).toHaveBeenCalledOnce();
    expect(runtime.voice).toBeUndefined();
    expect(runtime.getVoiceVolume()).toBe(0);

    expect(() => runtime.disconnectVoice()).not.toThrow();
    expect(laterCleanup).toHaveBeenCalledOnce();
    expect(voice.session.disconnect).toHaveBeenCalledOnce();
  });

  it("reconnects after cleanup from the previous session throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const cleanupError = new Error("cleanup failed");
    const voice = createVoiceAdapter();
    voice.adapter.connect = vi.fn(voice.adapter.connect);
    voice.session.onStatusChange = () => () => {
      throw cleanupError;
    };
    const runtime = new TestRuntime(voice);
    runtime.connectVoice();

    expect(() => runtime.connectVoice()).not.toThrow();
    expect(voice.adapter.connect).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Voice cleanup threw before reconnect",
      cleanupError,
    );
  });

  it("rolls back a new session when initialization throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const voice = createVoiceAdapter();
    const runtime = new TestRuntime(voice);
    const listenerError = new Error("subscriber failed");
    runtime.subscribe(() => {
      throw listenerError;
    });

    expect(() => runtime.connectVoice()).toThrow(listenerError);
    expect(voice.session.disconnect).toHaveBeenCalledOnce();
    expect(runtime.voice).toBeUndefined();
    expect(runtime.getVoiceVolume()).toBe(0);
  });

  it("releases handlers registered before voice setup throws", () => {
    const setupError = new Error("registration failed");
    const statusCleanup = vi.fn();
    const voice = createVoiceAdapter();
    voice.session.onStatusChange = () => statusCleanup;
    voice.session.onModeChange = () => {
      throw setupError;
    };
    const runtime = new TestRuntime(voice);

    expect(() => runtime.connectVoice()).toThrow(setupError);
    expect(statusCleanup).toHaveBeenCalledOnce();
    expect(voice.session.disconnect).toHaveBeenCalledOnce();
    expect(runtime.voice).toBeUndefined();
  });

  it("stops setup when a subscriber disconnects the new session", () => {
    const voice = createVoiceAdapter();
    const statusRegistration = vi.spyOn(voice.session, "onStatusChange");
    const runtime = new TestRuntime(voice);
    runtime.subscribe(() => {
      if (runtime.voice) runtime.disconnectVoice();
    });

    expect(() => runtime.connectVoice()).not.toThrow();

    expect(voice.session.disconnect).toHaveBeenCalledOnce();
    expect(statusRegistration).not.toHaveBeenCalled();
    expect(runtime.voice).toBeUndefined();
  });

  it("releases a handler returned after reentrant disconnect", () => {
    const statusCleanup = vi.fn();
    const voice = createVoiceAdapter();
    let registeringStatus = false;
    voice.session.onStatusChange = (callback) => {
      registeringStatus = true;
      callback({ type: "running" });
      registeringStatus = false;
      return statusCleanup;
    };
    const modeRegistration = vi.spyOn(voice.session, "onModeChange");
    const runtime = new TestRuntime(voice);
    runtime.subscribe(() => {
      if (registeringStatus) {
        registeringStatus = false;
        runtime.disconnectVoice();
      }
    });

    expect(() => runtime.connectVoice()).not.toThrow();

    expect(statusCleanup).toHaveBeenCalledOnce();
    expect(modeRegistration).not.toHaveBeenCalled();
    expect(voice.session.disconnect).toHaveBeenCalledOnce();
    expect(runtime.voice).toBeUndefined();
  });

  it("does not release earlier handlers twice after reentrant disconnect", () => {
    const statusCleanup = vi.fn();
    const modeCleanup = vi.fn();
    const voice = createVoiceAdapter();
    voice.session.onStatusChange = () => statusCleanup;
    let registeringMode = false;
    voice.session.onModeChange = (callback) => {
      registeringMode = true;
      callback("speaking");
      registeringMode = false;
      return modeCleanup;
    };
    const volumeRegistration = vi.spyOn(voice.session, "onVolumeChange");
    const runtime = new TestRuntime(voice);
    runtime.subscribe(() => {
      if (registeringMode) {
        registeringMode = false;
        runtime.disconnectVoice();
      }
    });

    expect(() => runtime.connectVoice()).not.toThrow();

    expect(statusCleanup).toHaveBeenCalledOnce();
    expect(modeCleanup).toHaveBeenCalledOnce();
    expect(volumeRegistration).not.toHaveBeenCalled();
    expect(voice.session.disconnect).toHaveBeenCalledOnce();
    expect(runtime.voice).toBeUndefined();
  });

  it("does not disconnect a replacement session after setup throws", () => {
    const setupError = new Error("registration failed");
    const firstVoice = createVoiceAdapter();
    const replacementVoice = createVoiceAdapter();
    firstVoice.adapter.connect = vi
      .fn()
      .mockReturnValueOnce(firstVoice.session)
      .mockReturnValueOnce(replacementVoice.session);
    let replacing = false;
    firstVoice.session.onModeChange = (callback) => {
      replacing = true;
      callback("listening");
      throw setupError;
    };
    const runtime = new TestRuntime(firstVoice);
    runtime.subscribe(() => {
      if (replacing) {
        replacing = false;
        runtime.disconnectVoice();
        runtime.connectVoice();
      }
    });

    expect(() => runtime.connectVoice()).toThrow(setupError);

    expect(firstVoice.session.disconnect).toHaveBeenCalledOnce();
    expect(replacementVoice.session.disconnect).not.toHaveBeenCalled();
    expect(runtime.voice).toMatchObject({
      status: replacementVoice.session.status,
      isMuted: replacementVoice.session.isMuted,
      mode: "listening",
    });
  });

  it("releases setup handlers without disconnecting a self-ended session", () => {
    const voice = createVoiceAdapter();
    const statusCleanup = vi.fn();
    voice.session.onStatusChange = (callback) => {
      voice.session.status = { type: "ended", reason: "finished" };
      callback(voice.session.status);
      return statusCleanup;
    };
    const modeRegistration = vi.spyOn(voice.session, "onModeChange");
    const runtime = new TestRuntime(voice);

    runtime.connectVoice();

    expect(statusCleanup).toHaveBeenCalledOnce();
    expect(voice.session.disconnect).not.toHaveBeenCalled();
    expect(modeRegistration).not.toHaveBeenCalled();
    expect(runtime.voice).toBeUndefined();

    runtime.disconnectVoice();
    expect(statusCleanup).toHaveBeenCalledOnce();
    expect(voice.session.disconnect).not.toHaveBeenCalled();
  });

  it("releases ended-session handlers when setup notification throws", () => {
    const listenerError = new Error("ended notification failed");
    const cleanupError = new Error("status cleanup failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const voice = createVoiceAdapter();
    const statusCleanup = vi.fn(() => {
      throw cleanupError;
    });
    let endSession!: () => void;
    voice.session.onStatusChange = (callback) => {
      endSession = () => {
        voice.session.status = { type: "ended", reason: "finished" };
        callback(voice.session.status);
      };
      return statusCleanup;
    };
    voice.session.onModeChange = () => {
      endSession();
      return () => {};
    };
    const runtime = new TestRuntime(voice);
    let wasConnected = false;
    runtime.subscribe(() => {
      if (runtime.voice) wasConnected = true;
      else if (wasConnected) throw listenerError;
    });

    expect(() => runtime.connectVoice()).toThrow(listenerError);

    expect(statusCleanup).toHaveBeenCalledOnce();
    expect(voice.session.disconnect).not.toHaveBeenCalled();
    expect(runtime.voice).toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Detached voice setup cleanup threw",
      cleanupError,
    );
  });

  it("does not disconnect a session that ends after setup", () => {
    const voice = createVoiceAdapter();
    const statusCleanup = vi.fn();
    let endSession!: () => void;
    voice.session.onStatusChange = (callback) => {
      endSession = () => {
        voice.session.status = { type: "ended", reason: "finished" };
        callback(voice.session.status);
      };
      return statusCleanup;
    };
    const runtime = new TestRuntime(voice);
    runtime.connectVoice();
    endSession();
    expect(runtime.voice).toBeUndefined();

    runtime.disconnectVoice();

    expect(statusCleanup).toHaveBeenCalledOnce();
    expect(voice.session.disconnect).not.toHaveBeenCalled();
  });

  it("rethrows one subscriber error once while disconnecting", () => {
    const voice = createVoiceAdapter();
    const runtime = new TestRuntime(voice);
    runtime.connectVoice();
    voice.emitTranscript({ role: "assistant", text: "Partial" });
    const listenerError = new Error("subscriber failed");
    runtime.subscribe(() => {
      throw listenerError;
    });

    let thrown: unknown;
    try {
      runtime.disconnectVoice();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(listenerError);
    expect(voice.session.disconnect).toHaveBeenCalledOnce();
  });

  it("continues notifying subscribers when one throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const voice = createVoiceAdapter();
    const runtime = new TestRuntime(voice);
    runtime.connectVoice();

    const listenerError = new Error("listener failed");
    const laterListener = vi.fn();
    runtime.subscribeVoiceVolume(() => {
      throw listenerError;
    });
    runtime.subscribeVoiceVolume(laterListener);

    expect(() => voice.emitVolume(0.5)).not.toThrow();
    expect(laterListener).toHaveBeenCalledOnce();
    expect(runtime.getVoiceVolume()).toBe(0.5);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Voice volume listener threw an error",
      listenerError,
    );
  });

  it("continues disconnect cleanup when a subscriber throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const voice = createVoiceAdapter();
    const runtime = new TestRuntime(voice);
    runtime.connectVoice();

    const listenerError = new Error("disconnect listener failed");
    const laterListener = vi.fn();
    runtime.subscribeVoiceVolume(() => {
      throw listenerError;
    });
    runtime.subscribeVoiceVolume(laterListener);

    expect(() => runtime.disconnectVoice()).not.toThrow();
    expect(laterListener).toHaveBeenCalledOnce();
    expect(runtime.getVoiceVolume()).toBe(0);
    expect(runtime.voice).toBeUndefined();
    expect(voice.session.disconnect).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Voice volume listener threw an error",
      listenerError,
    );
  });

  it("reports rejected subscriber thenables", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const voice = createVoiceAdapter();
    const runtime = new TestRuntime(voice);
    runtime.connectVoice();

    const listenerError = new Error("async listener failed");
    const laterListener = vi.fn();
    runtime.subscribeVoiceVolume(async () => {
      throw listenerError;
    });
    runtime.subscribeVoiceVolume(laterListener);

    voice.emitVolume(0.5);

    await vi.waitFor(() => {
      expect(laterListener).toHaveBeenCalledOnce();
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Voice volume listener threw an error",
        listenerError,
      );
    });
  });
});

describe("BaseThreadRuntimeCore voice transcripts", () => {
  it("completes a final-only reply before the next streamed reply", () => {
    const voiceAdapter = createVoiceAdapter();
    const runtime = new TestRuntime(voiceAdapter);
    runtime.connectVoice();

    try {
      voiceAdapter.emitTranscript({
        role: "assistant",
        text: "Finished reply",
        isFinal: true,
      });
      expect(runtime.messages).toMatchObject([
        {
          content: [{ type: "text", text: "Finished reply" }],
          status: { type: "complete", reason: "stop" },
        },
      ]);

      voiceAdapter.emitTranscript({ role: "assistant", text: "Next" });
      expect(runtime.messages.at(-1)?.status).toEqual({ type: "running" });

      voiceAdapter.emitTranscript({
        role: "assistant",
        text: "Next reply",
        isFinal: true,
      });
      expect(runtime.messages).toMatchObject([
        {
          content: [{ type: "text", text: "Finished reply" }],
          status: { type: "complete", reason: "stop" },
        },
        {
          content: [{ type: "text", text: "Next reply" }],
          status: { type: "complete", reason: "stop" },
        },
      ]);
    } finally {
      runtime.disconnectVoice();
    }
  });
});
