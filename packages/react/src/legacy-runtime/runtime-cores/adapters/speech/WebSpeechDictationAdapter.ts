import type { Unsubscribe } from "@assistant-ui/core";
import type { DictationAdapter } from "./SpeechAdapterTypes";

// Type definitions for Web Speech API
// Users can install @types/dom-speech-recognition for full type support
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

/**
 * WebSpeechDictationAdapter provides speech-to-text (dictation) functionality using
 * the browser's Web Speech API (SpeechRecognition).
 *
 * @example
 * ```tsx
 * const runtime = useChatRuntime({
 *   api: "/api/chat",
 *   adapters: {
 *     dictation: new WebSpeechDictationAdapter(),
 *   },
 * });
 * ```
 */
export class WebSpeechDictationAdapter implements DictationAdapter {
  private _language: string;
  private _continuous: boolean;
  private _interimResults: boolean;

  constructor(
    options: {
      /**
       * The language for dictation (e.g., "en-US", "zh-CN").
       * Defaults to the browser's language.
       */
      language?: string;
      /**
       * Whether to keep recording after the user stops speaking.
       * Defaults to true.
       */
      continuous?: boolean;
      /**
       * Whether to return interim (partial) results.
       * Defaults to true for real-time feedback.
       */
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

  /**
   * Check if the browser supports the Web Speech Recognition API.
   */
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
      for (const cb of speechStartCallbacks) cb();
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
          for (const cb of speechCallbacks) cb({ transcript, isFinal: true });
        } else {
          for (const cb of speechCallbacks) cb({ transcript, isFinal: false });
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
        for (const cb of speechEndCallbacks)
          cb({ transcript: finalTranscript });
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
