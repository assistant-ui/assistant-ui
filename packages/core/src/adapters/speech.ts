import type { Unsubscribe } from "../types/unsubscribe";
import { notifyEventListeners } from "../utils/notify-event-listeners";

export namespace SpeechSynthesisAdapter {
  export type Status =
    | {
        type: "starting" | "running";
      }
    | {
        type: "ended";
        reason: "finished" | "cancelled" | "error";
        error?: unknown;
      };

  export type Utterance = {
    status: Status;
    cancel: () => void;
    subscribe: (callback: () => void) => Unsubscribe;
  };
}

export type SpeechSynthesisAdapter = {
  speak: (text: string) => SpeechSynthesisAdapter.Utterance;
};

export namespace DictationAdapter {
  export type Status =
    | {
        type: "starting" | "running";
      }
    | {
        type: "ended";
        reason: "stopped" | "cancelled" | "error";
      };

  export type Result = {
    transcript: string;
    isFinal?: boolean;
  };

  export type Session = {
    status: Status;
    stop: () => Promise<void>;
    cancel: () => void;
    onSpeechStart: (callback: () => void) => Unsubscribe;
    onSpeechEnd: (callback: (result: Result) => void) => Unsubscribe;
    onSpeech: (callback: (result: Result) => void) => Unsubscribe;
  };
}

export type DictationAdapter = {
  listen: () => DictationAdapter.Session;
  disableInputDuringDictation?: boolean;
};

export class WebSpeechSynthesisAdapter implements SpeechSynthesisAdapter {
  speak(text: string): SpeechSynthesisAdapter.Utterance {
    const utterance = new SpeechSynthesisUtterance(text);

    const subscribers = new Set<() => void>();
    const handleEnd = (
      reason: "finished" | "error" | "cancelled",
      error?: unknown,
    ) => {
      if (res.status.type === "ended") return;

      res.status = { type: "ended", reason, error };
      notifyEventListeners(subscribers, undefined, "Speech synthesis");
    };

    utterance.addEventListener("end", () => handleEnd("finished"));
    utterance.addEventListener("error", (e) => handleEnd("error", e.error));

    window.speechSynthesis.speak(utterance);

    const res: SpeechSynthesisAdapter.Utterance = {
      status: { type: "running" },
      cancel: () => {
        window.speechSynthesis.cancel();
        handleEnd("cancelled");
      },
      subscribe: (callback) => {
        if (res.status.type === "ended") {
          let cancelled = false;
          queueMicrotask(() => {
            if (!cancelled) {
              notifyEventListeners([callback], undefined, "Speech synthesis");
            }
          });
          return () => {
            cancelled = true;
          };
        } else {
          subscribers.add(callback);
          return () => {
            subscribers.delete(callback);
          };
        }
      },
    };
    return res;
  }
}

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionResultItem;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const getSpeechRecognitionAPI = ():
  | SpeechRecognitionConstructor
  | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
};

export class WebSpeechDictationAdapter implements DictationAdapter {
  private _language: string;
  private _continuous: boolean;
  private _interimResults: boolean;

  constructor(
    options: {
      language?: string;
      continuous?: boolean;
      interimResults?: boolean;
    } = {},
  ) {
    const defaultLanguage =
      typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "en-US";
    this._language = options.language ?? defaultLanguage;
    this._continuous = options.continuous ?? true;
    this._interimResults = options.interimResults ?? true;
  }

  static isSupported(): boolean {
    return getSpeechRecognitionAPI() !== undefined;
  }

  listen(): DictationAdapter.Session {
    const SpeechRecognitionAPI = getSpeechRecognitionAPI();
    if (!SpeechRecognitionAPI) {
      throw new Error(
        "SpeechRecognition is not supported in this browser. " +
          "Try using Chrome, Edge, or Safari.",
      );
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = this._language;
    recognition.continuous = this._continuous;
    recognition.interimResults = this._interimResults;

    const speechStartCallbacks = new Set<() => void>();
    const speechEndCallbacks = new Set<
      (result: DictationAdapter.Result) => void
    >();
    const speechCallbacks = new Set<
      (result: DictationAdapter.Result) => void
    >();

    let finalTranscript = "";

    const session: DictationAdapter.Session = {
      status: { type: "starting" },

      stop: async () => {
        recognition.stop();
        return new Promise<void>((resolve) => {
          const checkEnded = () => {
            if (session.status.type === "ended") {
              resolve();
            } else {
              setTimeout(checkEnded, 50);
            }
          };
          checkEnded();
        });
      },

      cancel: () => {
        recognition.abort();
      },

      onSpeechStart: (callback: () => void): Unsubscribe => {
        speechStartCallbacks.add(callback);
        return () => {
          speechStartCallbacks.delete(callback);
        };
      },

      onSpeechEnd: (
        callback: (result: DictationAdapter.Result) => void,
      ): Unsubscribe => {
        speechEndCallbacks.add(callback);
        return () => {
          speechEndCallbacks.delete(callback);
        };
      },

      onSpeech: (
        callback: (result: DictationAdapter.Result) => void,
      ): Unsubscribe => {
        speechCallbacks.add(callback);
        return () => {
          speechCallbacks.delete(callback);
        };
      },
    };

    const updateStatus = (newStatus: DictationAdapter.Status) => {
      session.status = newStatus;
    };

    recognition.addEventListener("speechstart", () => {
      notifyEventListeners(speechStartCallbacks, undefined, "Dictation");
    });

    recognition.addEventListener("start", () => {
      updateStatus({ type: "running" });
    });

    recognition.addEventListener("result", (event) => {
      const speechEvent = event as unknown as SpeechRecognitionEvent;

      for (
        let i = speechEvent.resultIndex;
        i < speechEvent.results.length;
        i++
      ) {
        const result = speechEvent.results[i];
        if (!result) continue;

        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalTranscript += transcript;
          notifyEventListeners(
            speechCallbacks,
            () => ({ transcript, isFinal: true }),
            "Dictation",
          );
        } else {
          notifyEventListeners(
            speechCallbacks,
            () => ({ transcript, isFinal: false }),
            "Dictation",
          );
        }
      }
    });

    recognition.addEventListener("speechend", () => {
      // speechend fires when user stops speaking, but 'end' handles final cleanup
    });

    recognition.addEventListener("end", () => {
      const currentStatus = session.status;
      if (currentStatus.type !== "ended") {
        updateStatus({ type: "ended", reason: "stopped" });
      }
      if (finalTranscript) {
        notifyEventListeners(
          speechEndCallbacks,
          () => ({ transcript: finalTranscript }),
          "Dictation",
        );
        finalTranscript = "";
      }
    });

    recognition.addEventListener("error", (event) => {
      const errorEvent = event as unknown as SpeechRecognitionErrorEvent;
      if (errorEvent.error === "aborted") {
        updateStatus({ type: "ended", reason: "cancelled" });
      } else {
        updateStatus({ type: "ended", reason: "error" });
        console.error("Dictation error:", errorEvent.error, errorEvent.message);
      }
    });

    try {
      recognition.start();
    } catch (error) {
      updateStatus({ type: "ended", reason: "error" });
      throw error;
    }

    return session;
  }
}
