import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeedbackAdapter } from "../../adapters/feedback";
import type { SpeechSynthesisAdapter } from "../../adapters/speech";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import type { ModelContextProvider } from "../../model-context/types";
import type { AppendMessage, ThreadMessage } from "../../types/message";
import type { ChatModelRunResult } from "../../runtime/utils/chat-model-adapter";
import { isMessageNotSentError } from "../../types/error";
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
import { LocalRuntimeCore } from "../../runtimes/local/local-runtime-core";
import { disposeThreadRuntime } from "../utils/thread-runtime-lifecycle";

const createVoiceAdapter = ({
  sendText,
}: { sendText?: RealtimeVoiceAdapter.Session["sendText"] } = {}) => {
  let volumeCallback: ((volume: number) => void) | undefined;
  let statusCallback:
    | ((status: RealtimeVoiceAdapter.Status) => void)
    | undefined;
  let transcriptCallback:
    | ((transcript: RealtimeVoiceAdapter.TranscriptItem) => void)
    | undefined;
  const session: RealtimeVoiceAdapter.Session = {
    status: { type: "running" },
    isMuted: false,
    disconnect: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
    ...(sendText && { sendText }),
    onStatusChange: (callback) => {
      statusCallback = callback;
      return () => {
        statusCallback = undefined;
      };
    },
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
    emitStatus: (status: RealtimeVoiceAdapter.Status) =>
      statusCallback?.(status),
    emitTranscript: (transcript: RealtimeVoiceAdapter.TranscriptItem) =>
      transcriptCallback?.(transcript),
    session,
  } satisfies {
    adapter: RealtimeVoiceAdapter;
    emitVolume: (volume: number) => void;
    emitStatus: (status: RealtimeVoiceAdapter.Status) => void;
    emitTranscript: (transcript: RealtimeVoiceAdapter.TranscriptItem) => void;
    session: RealtimeVoiceAdapter.Session;
  };
};

class TestRuntime extends BaseThreadRuntimeCore {
  private readonly voiceAdapter: ReturnType<typeof createVoiceAdapter>;
  private readonly actionAdapters: {
    speech?: SpeechSynthesisAdapter;
    feedback?: FeedbackAdapter;
  };

  constructor(
    voiceAdapter: ReturnType<typeof createVoiceAdapter>,
    contextProvider: ModelContextProvider = { getModelContext: () => ({}) },
    actionAdapters: {
      speech?: SpeechSynthesisAdapter;
      feedback?: FeedbackAdapter;
    } = {},
  ) {
    super(contextProvider);
    this.voiceAdapter = voiceAdapter;
    this.actionAdapters = actionAdapters;
  }

  get adapters() {
    return { voice: this.voiceAdapter.adapter, ...this.actionAdapters };
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

  it("releases all handlers when a session ends without disconnecting it", () => {
    const voice = createVoiceAdapter();
    const cleanups = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
    let endSession!: () => void;
    voice.session.onStatusChange = (callback) => {
      endSession = () => {
        voice.session.status = { type: "ended", reason: "finished" };
        callback(voice.session.status);
      };
      return cleanups[0]!;
    };
    voice.session.onModeChange = () => cleanups[1]!;
    voice.session.onVolumeChange = () => cleanups[2]!;
    voice.session.onTranscript = () => cleanups[3]!;
    const runtime = new TestRuntime(voice);
    runtime.connectVoice();
    endSession();
    expect(runtime.voice).toBeUndefined();

    expect(cleanups.map((cleanup) => cleanup.mock.calls.length)).toEqual([
      1, 1, 1, 1,
    ]);
    expect(voice.session.disconnect).not.toHaveBeenCalled();

    disposeThreadRuntime(runtime);
    runtime.disconnectVoice();

    expect(cleanups.map((cleanup) => cleanup.mock.calls.length)).toEqual([
      1, 1, 1, 1,
    ]);
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
  const createLocalVoiceThread = async (
    sessionOptions: Parameters<typeof createVoiceAdapter>[0] = {},
    contextProvider?: ModelContextProvider,
  ) => {
    const voiceAdapter = createVoiceAdapter(sessionOptions);
    const history = {
      load: vi.fn(async () => ({ messages: [] })),
      append: vi.fn(async () => {}),
    };
    const run = vi.fn(async () => ({}));
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: { run },
          history,
          voice: voiceAdapter.adapter,
        },
      },
      undefined,
    );
    if (contextProvider) runtime.registerModelContextProvider(contextProvider);
    const thread = runtime.threads.getMainThreadRuntimeCore();
    await thread.__internal_load();
    thread.connectVoice();
    return { history, run, thread, voiceAdapter };
  };

  const typedMessage = (
    thread: { messages: readonly ThreadMessage[] },
    text = "Text message",
  ): AppendMessage => ({
    parentId: thread.messages.at(-1)?.id ?? null,
    sourceId: null,
    role: "user",
    content: [{ type: "text", text }],
    attachments: [],
    metadata: { custom: { quote: "context" } },
    createdAt: new Date(),
    runConfig: {},
  });

  it("holds a queued send that becomes dispatchable while a voice session is connected", async () => {
    let resolveFirst!: (result: ChatModelRunResult) => void;
    const firstRun = new Promise<ChatModelRunResult>((resolve) => {
      resolveFirst = resolve;
    });
    let runCount = 0;
    const run = vi.fn(() =>
      ++runCount === 1 ? firstRun : Promise.resolve({}),
    );
    const voiceAdapter = createVoiceAdapter();
    const runtime = new LocalRuntimeCore(
      {
        unstable_enableMessageQueue: true,
        adapters: { chatModel: { run }, voice: voiceAdapter.adapter },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    const firstMessage: AppendMessage = {
      parentId: null,
      sourceId: null,
      runConfig: {},
      role: "user",
      content: [{ type: "text", text: "first" }],
      attachments: [],
      metadata: { custom: {} },
      createdAt: new Date(),
    };

    await thread.append(firstMessage);
    expect(run).toHaveBeenCalledOnce();
    await thread.append({
      ...firstMessage,
      parentId: thread.messages.at(-1)?.id ?? null,
      content: [{ type: "text", text: "second" }],
      steer: false,
    });

    const deferred: Array<() => void> = [];
    const originalQueueMicrotask = globalThis.queueMicrotask;
    globalThis.queueMicrotask = (callback: () => void) => {
      deferred.push(callback);
    };
    try {
      resolveFirst({});
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      globalThis.queueMicrotask = originalQueueMicrotask;
    }
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");

    thread.connectVoice();
    try {
      for (const callback of deferred) callback();
      await Promise.resolve();
      expect(run).toHaveBeenCalledOnce();
      expect(thread.getQueueItems()).toHaveLength(1);
    } finally {
      thread.disconnectVoice();
    }
    await Promise.resolve();

    expect(run).toHaveBeenCalledTimes(2);
    expect(thread.getQueueItems()).toHaveLength(0);
  });

  it("commits a final user transcript to the repository and history", async () => {
    const { history, thread, voiceAdapter } = await createLocalVoiceThread();

    try {
      voiceAdapter.emitTranscript({
        role: "user",
        text: "Hello",
        isFinal: true,
      });
      const message = thread.messages[0]!;

      expect(message.metadata.modality).toBe("voice");
      expect(history.append).toHaveBeenCalledExactlyOnceWith({
        parentId: null,
        message,
      });
      expect(thread.export().messages).toContainEqual({
        parentId: null,
        message,
      });
    } finally {
      thread.disconnectVoice();
    }
  });

  it("commits an assistant transcript when it finalizes", async () => {
    const { history, thread, voiceAdapter } = await createLocalVoiceThread();

    try {
      voiceAdapter.emitTranscript({ role: "assistant", text: "Partial" });

      expect(thread.messages[0]?.status).toEqual({ type: "running" });
      expect(history.append).not.toHaveBeenCalled();

      voiceAdapter.emitTranscript({
        role: "assistant",
        text: "Complete",
        isFinal: true,
      });
      const message = thread.messages[0]!;

      expect(message.status).toEqual({ type: "complete", reason: "stop" });
      expect(history.append).toHaveBeenCalledExactlyOnceWith({
        parentId: null,
        message,
      });
    } finally {
      thread.disconnectVoice();
    }
  });

  it("commits an in-flight assistant transcript when disconnecting", async () => {
    const { history, thread, voiceAdapter } = await createLocalVoiceThread();

    voiceAdapter.emitTranscript({ role: "assistant", text: "Partial" });
    thread.disconnectVoice();
    const message = thread.messages[0]!;

    expect(message.status).toEqual({ type: "complete", reason: "stop" });
    expect(history.append).toHaveBeenCalledExactlyOnceWith({
      parentId: null,
      message,
    });
  });

  it("keeps committed transcripts after disconnect", async () => {
    const { thread, voiceAdapter } = await createLocalVoiceThread();

    voiceAdapter.emitTranscript({
      role: "user",
      text: "Hello",
      isFinal: true,
    });
    const message = thread.messages[0]!;

    thread.disconnectVoice();

    expect(thread.messages).toEqual([message]);
  });

  it("links the second transcript to the first", async () => {
    const { thread, voiceAdapter } = await createLocalVoiceThread();

    try {
      voiceAdapter.emitTranscript({
        role: "user",
        text: "First",
        isFinal: true,
      });
      const first = thread.messages[0]!;
      voiceAdapter.emitTranscript({
        role: "user",
        text: "Second",
        isFinal: true,
      });
      const second = thread.messages[1]!;

      expect(thread.export().messages).toContainEqual({
        parentId: first.id,
        message: second,
      });
    } finally {
      thread.disconnectVoice();
    }
  });

  it("rejects a text send while a session is connected", async () => {
    const { thread, voiceAdapter } = await createLocalVoiceThread();

    voiceAdapter.emitTranscript({
      role: "user",
      text: "Voice message",
      isFinal: true,
    });
    const transcript = thread.messages[0]!;
    const message: AppendMessage = {
      parentId: transcript.id,
      sourceId: null,
      role: "user",
      content: [{ type: "text", text: "Text message" }],
      attachments: [],
      metadata: { custom: {} },
      createdAt: new Date(),
      runConfig: {},
      startRun: false,
    };

    expect(thread.voice?.canSendText).toBe(false);
    await expect(thread.append(message)).rejects.toThrow(
      "Cannot send a text message while a voice session is connected",
    );
    expect(thread.export().messages).toHaveLength(1);

    thread.disconnectVoice();

    await expect(thread.append(message)).resolves.toBeUndefined();
    expect(thread.export().messages).toContainEqual({
      parentId: transcript.id,
      message: expect.objectContaining({ role: "user" }),
    });
  });

  it("sends a typed message into a session that takes text and commits it once as a typed turn", async () => {
    const sendText = vi.fn(async (_text: string) => {});
    const { history, run, thread, voiceAdapter } = await createLocalVoiceThread(
      { sendText },
    );

    try {
      voiceAdapter.emitTranscript({
        role: "user",
        text: "Voice message",
        isFinal: true,
      });
      const transcript = thread.messages[0]!;
      expect(thread.voice?.canSendText).toBe(true);

      await thread.append(typedMessage(thread));

      expect(sendText).toHaveBeenCalledExactlyOnceWith("Text message");
      expect(thread.messages).toHaveLength(2);
      const typed = thread.messages[1]!;
      expect(typed).toMatchObject({
        role: "user",
        content: [{ type: "text", text: "Text message" }],
        metadata: { custom: { quote: "context" } },
      });
      expect(typed.metadata.modality).toBeUndefined();
      expect(history.append).toHaveBeenLastCalledWith({
        parentId: transcript.id,
        message: typed,
      });
      expect(thread.export().messages).toContainEqual({
        parentId: transcript.id,
        message: typed,
      });
      expect(run).not.toHaveBeenCalled();
    } finally {
      thread.disconnectVoice();
    }
  });

  it("finishes the reply being spoken before a typed turn", async () => {
    const sendText = vi.fn();
    const { thread, voiceAdapter } = await createLocalVoiceThread({
      sendText,
    });

    try {
      voiceAdapter.emitTranscript({ role: "assistant", text: "Hel" });
      expect(thread.messages[0]?.status?.type).toBe("running");

      await thread.append(typedMessage(thread));

      expect(thread.messages.map((message) => message.role)).toEqual([
        "assistant",
        "user",
      ]);
      expect(thread.messages[0]?.status?.type).toBe("complete");
    } finally {
      thread.disconnectVoice();
    }
  });

  it("hands the draft back when the session rejects the typed text", async () => {
    const failure = new Error("send failed");
    const sendText = vi.fn(async () => {
      throw failure;
    });
    const { history, thread } = await createLocalVoiceThread({ sendText });

    try {
      const rejection = await thread.append(typedMessage(thread)).then(
        () => undefined,
        (error: unknown) => error,
      );

      expect(isMessageNotSentError(rejection)).toBe(true);
      expect((rejection as Error).cause).toBe(failure);
      expect(thread.messages).toEqual([]);
      expect(history.append).not.toHaveBeenCalled();
    } finally {
      thread.disconnectVoice();
    }
  });

  it("restores the composer draft when the session rejects a typed send", async () => {
    const sendText = vi.fn(async () => {
      throw new Error("send failed");
    });
    const { thread } = await createLocalVoiceThread({ sendText });

    try {
      thread.composer.setText("Text message");
      expect(thread.composer.canSend).toBe(true);

      await thread.composer.send();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(sendText).toHaveBeenCalledExactlyOnceWith("Text message");
      expect(thread.composer.text).toBe("Text message");
      expect(thread.messages).toEqual([]);
    } finally {
      thread.disconnectVoice();
    }
  });

  it("hands the draft back when the session ends while the text is in flight", async () => {
    let resolveSend!: () => void;
    const sendText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );
    const { history, thread } = await createLocalVoiceThread({ sendText });

    const pending = thread.append(typedMessage(thread));
    await Promise.resolve();
    thread.disconnectVoice();
    resolveSend();

    const rejection = await pending.then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(isMessageNotSentError(rejection)).toBe(true);
    expect(thread.messages).toEqual([]);
    expect(history.append).not.toHaveBeenCalled();
  });

  it("surfaces a history failure for a typed turn while keeping it in the thread", async () => {
    const failure = new Error("history down");
    const sendText = vi.fn();
    const { history, thread } = await createLocalVoiceThread({ sendText });
    history.append.mockRejectedValueOnce(failure);

    try {
      await expect(thread.append(typedMessage(thread))).rejects.toBe(failure);

      expect(thread.messages).toHaveLength(1);
      expect(thread.export().messages).toHaveLength(1);
    } finally {
      thread.disconnectVoice();
    }
  });

  it("carries the composer metadata of a typed turn like a text send", async () => {
    const sendText = vi.fn();
    const { thread } = await createLocalVoiceThread(
      { sendText },
      {
        getModelContext: () => ({
          unstable_composerMetadata: { form: { answer: 42 } },
        }),
      },
    );

    try {
      await thread.append(typedMessage(thread));

      expect(thread.messages[0]?.metadata.custom).toEqual({
        quote: "context",
        form: { answer: 42 },
      });
    } finally {
      thread.disconnectVoice();
    }
  });

  it("keeps rejecting a typed send until the session is running", async () => {
    const sendText = vi.fn();
    const { thread, voiceAdapter } = await createLocalVoiceThread({
      sendText,
    });

    try {
      voiceAdapter.emitStatus({ type: "starting" });
      expect(thread.voice?.canSendText).toBe(false);

      await expect(thread.append(typedMessage(thread))).rejects.toThrow(
        "Cannot send a text message while a voice session is connected",
      );

      voiceAdapter.emitStatus({ type: "running" });
      expect(thread.voice?.canSendText).toBe(true);

      await thread.append(typedMessage(thread));

      expect(sendText).toHaveBeenCalledExactlyOnceWith("Text message");
    } finally {
      thread.disconnectVoice();
    }
  });

  it("rejects anything but a plain text user message at the tail while a session takes text", async () => {
    const sendText = vi.fn();
    const { thread, voiceAdapter } = await createLocalVoiceThread({
      sendText,
    });
    const rejection =
      "Only a plain text user message can be sent while a voice session is connected";

    try {
      voiceAdapter.emitTranscript({
        role: "user",
        text: "Voice message",
        isFinal: true,
      });
      const base = typedMessage(thread);

      await expect(
        thread.append({
          ...base,
          attachments: [
            {
              id: "att-1",
              type: "document",
              name: "f.txt",
              contentType: "text/plain",
              content: [],
              status: { type: "complete" },
            },
          ],
        }),
      ).rejects.toThrow(rejection);
      await expect(
        thread.append({ ...base, sourceId: thread.messages[0]!.id }),
      ).rejects.toThrow(rejection);
      await expect(thread.append({ ...base, parentId: null })).rejects.toThrow(
        rejection,
      );
      await expect(
        thread.append({
          ...base,
          content: [{ type: "image", image: "data:image/png;base64," }],
        }),
      ).rejects.toThrow(rejection);
      await expect(
        thread.append({ ...base, content: [{ type: "text", text: "  " }] }),
      ).rejects.toThrow(rejection);
      await expect(
        thread.append({
          ...base,
          role: "assistant",
          metadata: { custom: {} },
        } as AppendMessage),
      ).rejects.toThrow(rejection);

      expect(sendText).not.toHaveBeenCalled();
      expect(thread.messages).toHaveLength(1);
    } finally {
      thread.disconnectVoice();
    }
  });

  it("keeps the replacement session's hooks when a subscriber reconnects during disconnect", () => {
    class HookRuntime extends TestRuntime {
      connected = 0;
      disconnected = 0;
      protected override _onVoiceConnected() {
        this.connected += 1;
      }
      protected override _onVoiceDisconnected() {
        this.disconnected += 1;
      }
    }
    const runtime = new HookRuntime(createVoiceAdapter());
    runtime.connectVoice();
    expect(runtime.connected).toBe(1);

    let reconnected = false;
    const unsubscribe = runtime.subscribe(() => {
      if (reconnected || runtime.voice !== undefined) return;
      reconnected = true;
      runtime.connectVoice();
    });

    try {
      runtime.disconnectVoice();
      expect(runtime.voice).toBeDefined();
      expect(runtime.connected).toBe(2);
      expect(runtime.disconnected).toBe(0);
    } finally {
      unsubscribe();
      runtime.disconnectVoice();
    }
    expect(runtime.disconnected).toBe(1);
  });

  it("keeps voice hooks held while replacing a session", () => {
    class HookRuntime extends TestRuntime {
      connected = 0;
      disconnected = 0;
      protected override _onVoiceConnected() {
        this.connected += 1;
      }
      protected override _onVoiceDisconnected() {
        this.disconnected += 1;
      }
    }
    const runtime = new HookRuntime(createVoiceAdapter());

    runtime.connectVoice();
    runtime.connectVoice();

    expect(runtime.connected).toBe(2);
    expect(runtime.disconnected).toBe(0);

    runtime.disconnectVoice();

    expect(runtime.disconnected).toBe(1);
  });

  it("ignores an ended status from a replaced session", () => {
    class HookRuntime extends TestRuntime {
      disconnected = 0;
      protected override _onVoiceDisconnected() {
        this.disconnected += 1;
      }
    }
    const statusCallbacks: Array<
      (status: RealtimeVoiceAdapter.Status) => void
    > = [];
    const createSession = (): RealtimeVoiceAdapter.Session => ({
      status: { type: "running" },
      isMuted: false,
      disconnect: vi.fn(),
      mute: vi.fn(),
      unmute: vi.fn(),
      onStatusChange: (callback) => {
        statusCallbacks.push(callback);
        return () => {};
      },
      onTranscript: () => () => {},
      onModeChange: () => () => {},
      onVolumeChange: () => () => {},
    });
    const runtime = new HookRuntime({
      adapter: { connect: () => createSession() },
      emitVolume: () => {},
      emitStatus: () => {},
      emitTranscript: () => {},
      session: createSession(),
    });

    runtime.connectVoice();
    runtime.connectVoice();
    statusCallbacks[0]!({ type: "ended", reason: "finished" });

    try {
      expect(runtime.voice).toBeDefined();
      expect(runtime.disconnected).toBe(0);
    } finally {
      runtime.disconnectVoice();
    }
    expect(runtime.disconnected).toBe(1);
  });

  it("releases voice hooks when a replacement cannot connect", () => {
    class HookRuntime extends TestRuntime {
      connected = 0;
      disconnected = 0;
      protected override _onVoiceConnected() {
        this.connected += 1;
      }
      protected override _onVoiceDisconnected() {
        this.disconnected += 1;
      }
    }
    const voice = createVoiceAdapter();
    const error = new Error("connection failed");
    voice.adapter.connect = vi
      .fn()
      .mockReturnValueOnce(voice.session)
      .mockImplementationOnce(() => {
        throw error;
      });
    const runtime = new HookRuntime(voice);
    runtime.connectVoice();

    expect(() => runtime.connectVoice()).toThrow(error);
    expect(runtime.connected).toBe(1);
    expect(runtime.disconnected).toBe(1);
  });

  it("rejects starting a voice session while a run is in progress", async () => {
    const voiceAdapter = createVoiceAdapter();
    let resolveRun!: (result: ChatModelRunResult) => void;
    const firstRun = new Promise<ChatModelRunResult>((resolve) => {
      resolveRun = resolve;
    });
    const run = vi.fn(() => firstRun);
    const runtime = new LocalRuntimeCore(
      { adapters: { chatModel: { run }, voice: voiceAdapter.adapter } },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    const pending = thread.append({
      parentId: null,
      sourceId: null,
      role: "user",
      content: [{ type: "text", text: "hello" }],
      attachments: [],
      metadata: { custom: {} },
      createdAt: new Date(),
      runConfig: {},
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(run).toHaveBeenCalledOnce();

    expect(() => thread.connectVoice()).toThrow(
      "Cannot start a voice session while a run is in progress or paused on a pending tool action",
    );
    expect(thread.voice).toBeUndefined();

    resolveRun({});
    await pending;

    thread.connectVoice();
    try {
      expect(thread.voice).toBeDefined();
    } finally {
      thread.disconnectVoice();
    }
  });

  it("rejects starting a voice session while a run is paused on a tool action", () => {
    const voiceAdapter = createVoiceAdapter();
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async run() {
              return {};
            },
          },
          voice: voiceAdapter.adapter,
        },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    thread.reset([
      {
        id: "user",
        role: "user",
        content: [{ type: "text", text: "Use the tool" }],
      },
      {
        id: "assistant",
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "tool-call",
            toolName: "tool",
            args: {},
            argsText: "{}",
          },
        ],
        status: { type: "requires-action", reason: "tool-calls" },
      },
    ]);

    expect(() => thread.connectVoice()).toThrow(
      "Cannot start a voice session while a run is in progress or paused on a pending tool action",
    );
    expect(thread.voice).toBeUndefined();
  });

  it("reloads committed transcripts from history into a fresh runtime", async () => {
    const items: Array<{ parentId: string | null; message: ThreadMessage }> =
      [];
    const history = {
      load: async () => ({
        messages: items,
        headId: items.at(-1)?.message.id ?? null,
      }),
      append: async (item: {
        parentId: string | null;
        message: ThreadMessage;
      }) => {
        items.push(item);
      },
    };
    const chatModel = {
      async run() {
        return {};
      },
    };
    const voiceAdapter = createVoiceAdapter();
    const first = new LocalRuntimeCore(
      { adapters: { chatModel, history, voice: voiceAdapter.adapter } },
      undefined,
    );
    const thread = first.threads.getMainThreadRuntimeCore();
    await new Promise((resolve) => setTimeout(resolve, 0));
    thread.connectVoice();
    voiceAdapter.emitTranscript({ role: "user", text: "Hi", isFinal: true });
    voiceAdapter.emitTranscript({
      role: "assistant",
      text: "Hello",
      isFinal: true,
    });
    thread.disconnectVoice();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(items).toHaveLength(2);

    const second = new LocalRuntimeCore(
      { adapters: { chatModel, history } },
      undefined,
    );
    const reloaded = second.threads.getMainThreadRuntimeCore();
    await reloaded.__internal_load();

    expect(reloaded.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(reloaded.messages[1]?.metadata.modality).toBe("voice");
  });

  it("rejects starting a voice session while a send awaits initialization", async () => {
    const voiceAdapter = createVoiceAdapter();
    const run = vi.fn(async () => ({}));
    const runtime = new LocalRuntimeCore(
      { adapters: { chatModel: { run }, voice: voiceAdapter.adapter } },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    thread.__internal_setGetInitializePromise(() => barrier);
    const pending = thread.append({
      parentId: null,
      sourceId: null,
      role: "user",
      content: [{ type: "text", text: "hello" }],
      attachments: [],
      metadata: { custom: {} },
      createdAt: new Date(),
      runConfig: {},
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(run).not.toHaveBeenCalled();

    expect(() => thread.connectVoice()).toThrow(
      "Cannot start a voice session while a run is in progress or paused on a pending tool action",
    );

    release();
    await pending;
    expect(run).toHaveBeenCalledOnce();

    thread.connectVoice();
    try {
      expect(thread.voice).toBeDefined();
    } finally {
      thread.disconnectVoice();
    }
  });

  it("waits for history already loading before committing a final transcript", async () => {
    const voiceAdapter = createVoiceAdapter();
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const history = {
      load: vi.fn(() => barrier.then(() => ({ messages: [] }))),
      append: vi.fn(async () => {}),
    };
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async run() {
              return {};
            },
          },
          history,
          voice: voiceAdapter.adapter,
        },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    const load = thread.__internal_load();

    expect(thread.isLoading).toBe(true);
    thread.connectVoice();
    expect(thread.voice).toBeDefined();

    voiceAdapter.emitTranscript({
      role: "user",
      text: "Hello",
      isFinal: true,
    });
    await Promise.resolve();
    expect(history.append).not.toHaveBeenCalled();

    release();
    await load;
    await vi.waitFor(() => {
      expect(history.append).toHaveBeenCalledOnce();
    });
    expect(history.append).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: null }),
    );

    thread.disconnectVoice();
  });

  it("waits for a history load started after connection before committing a final transcript", async () => {
    const voiceAdapter = createVoiceAdapter();
    let release!: () => void;
    const loadBarrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const persistedMessage: ThreadMessage = {
      id: "persisted",
      role: "user",
      content: [{ type: "text", text: "Persisted" }],
      metadata: { custom: {} },
      createdAt: new Date(),
      attachments: [],
      status: { type: "complete", reason: "unknown" },
    };
    const history = {
      load: vi.fn(() =>
        loadBarrier.then(() => ({
          messages: [{ parentId: null, message: persistedMessage }],
        })),
      ),
      append: vi.fn(async () => {}),
    };
    const chatModel = {
      async run() {
        return {};
      },
    };
    const runtime = new LocalRuntimeCore(
      { adapters: { chatModel, voice: voiceAdapter.adapter } },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    await thread.__internal_load();
    thread.connectVoice();
    thread.__internal_setOptions({
      adapters: { chatModel, history, voice: voiceAdapter.adapter },
    });

    expect(thread.isLoading).toBe(true);
    voiceAdapter.emitTranscript({
      role: "user",
      text: "Hello",
      isFinal: true,
    });
    await Promise.resolve();
    expect(history.append).not.toHaveBeenCalled();

    release();
    await vi.waitFor(() => {
      expect(history.append).toHaveBeenCalledOnce();
    });
    expect(history.append).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: persistedMessage.id }),
    );
    expect(thread.messages.map((message) => message.id)).toEqual([
      persistedMessage.id,
      expect.any(String),
    ]);

    thread.disconnectVoice();
  });

  it("waits for a history load started after connection before committing a typed turn", async () => {
    const sendText = vi.fn(async () => {});
    const voiceAdapter = createVoiceAdapter({ sendText });
    let release!: () => void;
    const loadBarrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const persistedMessage: ThreadMessage = {
      id: "persisted",
      role: "user",
      content: [{ type: "text", text: "Persisted" }],
      metadata: { custom: {} },
      createdAt: new Date(),
      attachments: [],
      status: { type: "complete", reason: "unknown" },
    };
    const history = {
      load: vi.fn(() =>
        loadBarrier.then(() => ({
          messages: [{ parentId: null, message: persistedMessage }],
        })),
      ),
      append: vi.fn(async () => {}),
    };
    const chatModel = {
      async run() {
        return {};
      },
    };
    const runtime = new LocalRuntimeCore(
      { adapters: { chatModel, voice: voiceAdapter.adapter } },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    await thread.__internal_load();
    thread.connectVoice();
    thread.__internal_setOptions({
      adapters: { chatModel, history, voice: voiceAdapter.adapter },
    });

    let settled = false;
    const append = thread.append({
      ...typedMessage(thread, "Typed"),
    });
    void append.finally(() => {
      settled = true;
    });
    await vi.waitFor(() => {
      expect(sendText).toHaveBeenCalledExactlyOnceWith("Typed");
    });
    expect(settled).toBe(false);
    expect(history.append).not.toHaveBeenCalled();

    release();
    await append;

    expect(history.append).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: persistedMessage.id }),
    );
    expect(thread.messages.map((message) => message.id)).toEqual([
      persistedMessage.id,
      expect.any(String),
    ]);

    thread.disconnectVoice();
  });

  it("notifies subscribers when a commit lands after the session ended", async () => {
    const voiceAdapter = createVoiceAdapter();
    let release!: () => void;
    const loadBarrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const history = {
      load: vi.fn(() => loadBarrier.then(() => ({ messages: [] }))),
      append: vi.fn(async () => {}),
    };
    const chatModel = {
      async run() {
        return {};
      },
    };
    const runtime = new LocalRuntimeCore(
      { adapters: { chatModel, voice: voiceAdapter.adapter } },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    await thread.__internal_load();
    thread.connectVoice();
    thread.__internal_setOptions({
      adapters: { chatModel, history, voice: voiceAdapter.adapter },
    });

    voiceAdapter.emitTranscript({
      role: "user",
      text: "Hello",
      isFinal: true,
    });
    thread.disconnectVoice();

    const seen: number[] = [];
    const unsubscribe = thread.subscribe(() => {
      seen.push(thread.messages.length);
    });
    release();
    await vi.waitFor(() => {
      expect(history.append).toHaveBeenCalledOnce();
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(thread.messages).toHaveLength(1);
    expect(seen).toContain(1);

    unsubscribe();
  });

  it("drops a deferred voice commit at detach without waiting for the load", async () => {
    const voiceAdapter = createVoiceAdapter();
    let release!: () => void;
    const loadBarrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const history = {
      load: vi.fn(() => loadBarrier.then(() => ({ messages: [] }))),
      append: vi.fn(async () => {}),
    };
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async run() {
              return {};
            },
          },
          history,
          voice: voiceAdapter.adapter,
        },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    const load = thread.__internal_load();
    thread.connectVoice();

    voiceAdapter.emitTranscript({
      role: "user",
      text: "Hello",
      isFinal: true,
    });
    expect(thread.messages).toHaveLength(1);
    thread.detach();

    await vi.waitFor(() => {
      expect(thread.messages).toEqual([]);
    });
    expect(thread.isLoading).toBe(true);

    release();
    await load;
    await Promise.resolve();

    expect(history.append).not.toHaveBeenCalled();
    expect(thread.messages).toEqual([]);

    thread.disconnectVoice();
  });

  it("drops a typed turn still sending when the thread detaches", async () => {
    let finishSend!: () => void;
    const sendText = vi.fn(
      (_text: string) =>
        new Promise<void>((resolve) => {
          finishSend = resolve;
        }),
    );
    const voiceAdapter = createVoiceAdapter({ sendText });
    const history = {
      load: vi.fn(async () => ({ messages: [] })),
      append: vi.fn(async () => {}),
    };
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async run() {
              return {};
            },
          },
          history,
          voice: voiceAdapter.adapter,
        },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    await thread.__internal_load();
    thread.connectVoice();

    const append = thread.append(typedMessage(thread, "Typed"));
    expect(sendText).toHaveBeenCalledExactlyOnceWith("Typed");
    thread.detach();
    finishSend();

    await expect(append).resolves.toBeUndefined();
    expect(history.append).not.toHaveBeenCalled();
    expect(thread.messages).toEqual([]);

    thread.disconnectVoice();
  });

  it("disconnects without committing the unfinished reply when the thread is disposed", async () => {
    const voiceAdapter = createVoiceAdapter();
    const onTranscript = voiceAdapter.session.onTranscript;
    let staleTranscript!: (
      transcript: RealtimeVoiceAdapter.TranscriptItem,
    ) => void;
    voiceAdapter.session.onTranscript = (callback) => {
      staleTranscript = callback;
      return onTranscript(callback);
    };
    const history = {
      load: vi.fn(async () => ({ messages: [] })),
      append: vi.fn(async () => {}),
    };
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async run() {
              return {};
            },
          },
          history,
          voice: voiceAdapter.adapter,
        },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    await thread.__internal_load();
    thread.connectVoice();
    voiceAdapter.emitTranscript({ role: "assistant", text: "Unfinished" });
    expect(thread.messages).toHaveLength(1);

    disposeThreadRuntime(thread);

    expect(voiceAdapter.session.disconnect).toHaveBeenCalledOnce();
    expect(thread.voice).toBeUndefined();
    expect(thread.messages).toEqual([]);

    staleTranscript({ role: "assistant", text: "Late" });
    await Promise.resolve();

    expect(thread.messages).toEqual([]);
    expect(history.append).not.toHaveBeenCalled();
  });

  it("propagates a typed turn history rejection after the barrier", async () => {
    const sendText = vi.fn(async () => {});
    const voiceAdapter = createVoiceAdapter({ sendText });
    let release!: () => void;
    const loadBarrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const historyError = new Error("history append failed");
    const history = {
      load: vi.fn(() => loadBarrier.then(() => ({ messages: [] }))),
      append: vi.fn(async () => {
        throw historyError;
      }),
    };
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async run() {
              return {};
            },
          },
          history,
          voice: voiceAdapter.adapter,
        },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    const load = thread.__internal_load();
    thread.connectVoice();

    const append = thread.append(typedMessage(thread, "Typed"));
    await vi.waitFor(() => {
      expect(sendText).toHaveBeenCalledExactlyOnceWith("Typed");
    });
    release();
    await load;
    await expect(append).rejects.toBe(historyError);

    thread.disconnectVoice();
  });

  it("reports a background transcript history rejection", async () => {
    const voiceAdapter = createVoiceAdapter();
    const historyError = new Error("history append failed");
    const history = {
      load: vi.fn(async () => ({ messages: [] })),
      append: vi.fn(async () => {
        throw historyError;
      }),
    };
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async run() {
              return {};
            },
          },
          history,
          voice: voiceAdapter.adapter,
        },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    await thread.__internal_load();
    thread.connectVoice();

    voiceAdapter.emitTranscript({
      role: "user",
      text: "Hello",
      isFinal: true,
    });
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Voice message commit failed",
        historyError,
      );
    });

    thread.disconnectVoice();
  });

  it("rejects opening an edit while connected", async () => {
    const { thread, voiceAdapter } = await createLocalVoiceThread();

    try {
      voiceAdapter.emitTranscript({
        role: "user",
        text: "Hello",
        isFinal: true,
      });
      const transcript = thread.messages[0]!;

      expect(() => thread.beginEdit(transcript.id)).toThrow(
        "Cannot edit a message while a voice session is connected",
      );

      thread.disconnectVoice();

      expect(() => thread.beginEdit(transcript.id)).not.toThrow();
    } finally {
      thread.disconnectVoice();
    }
  });

  it("speaks an assistant transcript", () => {
    const voiceAdapter = createVoiceAdapter();
    const speech = {
      speak: vi.fn(() => ({
        status: { type: "running" as const },
        cancel: vi.fn(),
        subscribe: () => () => {},
      })),
    } satisfies SpeechSynthesisAdapter;
    const runtime = new TestRuntime(voiceAdapter, undefined, { speech });
    runtime.connectVoice();

    try {
      voiceAdapter.emitTranscript({
        role: "assistant",
        text: "Hello",
        isFinal: true,
      });
      const message = runtime.messages[0]!;

      expect(() => runtime.speak(message.id)).not.toThrow();
      expect(speech.speak).toHaveBeenCalledExactlyOnceWith("Hello");
    } finally {
      runtime.disconnectVoice();
    }
  });

  it("stops speaking a transcript when the session disconnects", () => {
    const voiceAdapter = createVoiceAdapter();
    const utterance = {
      status: { type: "running" as const },
      cancel: vi.fn(),
      subscribe: () => () => {},
    };
    const speech = {
      speak: vi.fn(() => utterance),
    } satisfies SpeechSynthesisAdapter;
    const runtime = new TestRuntime(voiceAdapter, undefined, { speech });
    runtime.connectVoice();

    voiceAdapter.emitTranscript({
      role: "assistant",
      text: "Hello",
      isFinal: true,
    });
    runtime.speak(runtime.messages[0]!.id);
    expect(runtime.speech?.messageId).toBe(runtime.messages[0]!.id);

    runtime.disconnectVoice();

    expect(utterance.cancel).toHaveBeenCalledOnce();
    expect(runtime.speech).toBeUndefined();
  });

  it("still disconnects the session when stopping a spoken transcript throws", () => {
    const voiceAdapter = createVoiceAdapter();
    const utterance = {
      status: { type: "running" as const },
      cancel: vi.fn(() => {
        throw new Error("cancel failed");
      }),
      subscribe: () => () => {},
    };
    const speech = {
      speak: vi.fn(() => utterance),
    } satisfies SpeechSynthesisAdapter;
    const runtime = new TestRuntime(voiceAdapter, undefined, { speech });
    runtime.connectVoice();

    voiceAdapter.emitTranscript({
      role: "assistant",
      text: "Hello",
      isFinal: true,
    });
    runtime.speak(runtime.messages[0]!.id);

    expect(() => runtime.disconnectVoice()).toThrow("cancel failed");
    expect(utterance.cancel).toHaveBeenCalledOnce();
    expect(voiceAdapter.session.disconnect).toHaveBeenCalledOnce();
    expect(runtime.messages).toHaveLength(0);
    expect(runtime.speech).toBeUndefined();
    expect(runtime.voice).toBeUndefined();
  });

  it("submits feedback for a transcript", () => {
    const voiceAdapter = createVoiceAdapter();
    const feedback = { submit: vi.fn() } satisfies FeedbackAdapter;
    const runtime = new TestRuntime(voiceAdapter, undefined, { feedback });
    runtime.connectVoice();

    try {
      voiceAdapter.emitTranscript({
        role: "assistant",
        text: "Hello",
        isFinal: true,
      });
      const message = runtime.messages[0]!;

      expect(() =>
        runtime.submitFeedback({
          messageId: message.id,
          type: "positive",
          comment: "Helpful summary",
        }),
      ).not.toThrow();
      expect(feedback.submit).toHaveBeenCalledExactlyOnceWith({
        message,
        type: "positive",
        comment: "Helpful summary",
      });
      expect(runtime.messages[0]?.metadata.submittedFeedback).toEqual({
        type: "positive",
        comment: "Helpful summary",
      });

      const rated = runtime.messages[0]!;
      runtime.submitFeedback({
        messageId: message.id,
        type: "negative",
        comment: "   ",
      });
      expect(feedback.submit).toHaveBeenLastCalledWith({
        message: rated,
        type: "negative",
      });
      expect(runtime.messages[0]?.metadata.submittedFeedback).toEqual({
        type: "negative",
      });

      const rerated = runtime.messages[0]!;
      runtime.submitFeedback({ messageId: message.id, type: "positive" });
      expect(feedback.submit).toHaveBeenLastCalledWith({
        message: rerated,
        type: "positive",
      });
      expect(runtime.messages[0]?.metadata.submittedFeedback).toEqual({
        type: "positive",
      });
    } finally {
      runtime.disconnectVoice();
    }
  });

  it("marks transcript feedback locally without an adapter", () => {
    const voiceAdapter = createVoiceAdapter();
    const runtime = new TestRuntime(voiceAdapter);
    runtime.connectVoice();

    try {
      voiceAdapter.emitTranscript({
        role: "assistant",
        text: "Hello",
        isFinal: true,
      });
      const message = runtime.messages[0]!;

      expect(() =>
        runtime.submitFeedback({ messageId: message.id, type: "negative" }),
      ).not.toThrow();
      expect(runtime.messages[0]?.metadata.submittedFeedback).toEqual({
        type: "negative",
      });
    } finally {
      runtime.disconnectVoice();
    }
  });

  it("blocks an edit while connected and accepts it once the session ends", async () => {
    const voiceAdapter = createVoiceAdapter();
    const run = vi.fn(async () => ({}));
    const runtime = new LocalRuntimeCore(
      { adapters: { chatModel: { run }, voice: voiceAdapter.adapter } },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    thread.connectVoice();

    try {
      voiceAdapter.emitTranscript({
        role: "assistant",
        text: "Hello",
        isFinal: true,
      });
      const edit = {
        parentId: null,
        sourceId: thread.messages[0]!.id,
        role: "user" as const,
        content: [{ type: "text" as const, text: "again" }],
        attachments: [],
        metadata: { custom: {} },
        createdAt: new Date(),
        runConfig: {},
      };

      await expect(thread.append(edit)).rejects.toThrow(
        "Cannot send a text message while a voice session is connected",
      );
      await expect(thread.append({ ...edit, startRun: false })).rejects.toThrow(
        "Cannot send a text message while a voice session is connected",
      );
      expect(run).not.toHaveBeenCalled();
      expect(thread.messages).toHaveLength(1);

      thread.disconnectVoice();

      await thread.append(edit);
      expect(run).toHaveBeenCalledOnce();
    } finally {
      thread.disconnectVoice();
    }
  });

  it("blocks a reload while connected and allows it once the session ends", async () => {
    const voiceAdapter = createVoiceAdapter();
    const run = vi.fn(async () => ({}));
    const runtime = new LocalRuntimeCore(
      { adapters: { chatModel: { run }, voice: voiceAdapter.adapter } },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    thread.connectVoice();

    try {
      voiceAdapter.emitTranscript({
        role: "assistant",
        text: "Hello",
        isFinal: true,
      });
      const message = thread.messages[0]!;

      await expect(
        thread.startRun({
          parentId: null,
          sourceId: message.id,
          runConfig: {},
        }),
      ).rejects.toThrow(
        "Cannot start a run while a voice session is connected",
      );
      expect(run).not.toHaveBeenCalled();

      thread.disconnectVoice();

      await thread.startRun({
        parentId: null,
        sourceId: message.id,
        runConfig: {},
      });
      expect(run).toHaveBeenCalledOnce();
    } finally {
      thread.disconnectVoice();
    }
  });

  it("blocks an approval response while connected before deciding it", () => {
    const voiceAdapter = createVoiceAdapter();
    const run = vi.fn(async () => ({}));
    const runtime = new LocalRuntimeCore(
      { adapters: { chatModel: { run }, voice: voiceAdapter.adapter } },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    thread.connectVoice();
    thread.reset([
      {
        id: "user",
        role: "user",
        content: [{ type: "text", text: "Use the tool" }],
      },
      {
        id: "assistant",
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "tool-call",
            toolName: "tool",
            args: {},
            argsText: "{}",
            approval: { id: "approval-1" },
          },
        ],
        status: { type: "requires-action", reason: "interrupt" },
      },
    ]);

    try {
      expect(() =>
        thread.respondToToolApproval({
          approvalId: "approval-1",
          approved: true,
        }),
      ).toThrow(
        "Cannot respond to a tool approval while a voice session is connected",
      );
      const part = thread.messages[1]!.content[0]!;
      expect(
        part.type === "tool-call" && part.approval?.approved,
      ).toBeUndefined();
      expect(run).not.toHaveBeenCalled();
    } finally {
      thread.disconnectVoice();
    }
  });

  it("blocks a tool result continuation while connected", () => {
    const voiceAdapter = createVoiceAdapter();
    const run = vi.fn(async () => ({}));
    const runtime = new LocalRuntimeCore(
      { adapters: { chatModel: { run }, voice: voiceAdapter.adapter } },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    const messageId = "assistant";
    const toolCallId = "tool-call";
    thread.connectVoice();
    thread.reset([
      {
        id: "user",
        role: "user",
        content: [{ type: "text", text: "Use the tool" }],
      },
      {
        id: messageId,
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId,
            toolName: "tool",
            args: {},
            argsText: "{}",
          },
        ],
        status: { type: "requires-action", reason: "tool-calls" },
      },
    ]);

    try {
      expect(() =>
        thread.addToolResult({
          messageId,
          toolCallId,
          toolName: "tool",
          result: "done",
          isError: false,
        }),
      ).toThrow("Cannot add a tool result while a voice session is connected");
      expect(run).not.toHaveBeenCalled();
      const part = thread.messages[1]!.content[0]!;
      expect(part).not.toHaveProperty("result");
    } finally {
      thread.disconnectVoice();
    }
  });

  it("rejects editing a transcript", () => {
    const voiceAdapter = createVoiceAdapter();
    const runtime = new TestRuntime(voiceAdapter);
    runtime.connectVoice();

    try {
      voiceAdapter.emitTranscript({
        role: "assistant",
        text: "Hello",
        isFinal: true,
      });
      voiceAdapter.emitStatus({ type: "ended", reason: "finished" });

      expect(() => runtime.beginEdit(runtime.messages[0]!.id)).toThrow(
        "Voice transcript messages cannot be edited",
      );
    } finally {
      runtime.disconnectVoice();
    }
  });

  it("marks user and assistant transcripts as voice messages", () => {
    const voiceAdapter = createVoiceAdapter();
    const runtime = new TestRuntime(voiceAdapter);
    runtime.connectVoice();

    try {
      voiceAdapter.emitTranscript({
        role: "user",
        text: "Hello",
        isFinal: true,
      });
      voiceAdapter.emitTranscript({ role: "assistant", text: "Hi" });

      expect(runtime.messages[0]?.metadata.modality).toBe("voice");
      expect(runtime.messages[1]?.metadata.modality).toBe("voice");

      voiceAdapter.emitTranscript({
        role: "assistant",
        text: "Hello there",
        isFinal: true,
      });

      expect(runtime.messages[1]?.metadata.modality).toBe("voice");
    } finally {
      runtime.disconnectVoice();
    }
  });

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
