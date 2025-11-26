import type { Unsubscribe } from "../../../../types";
import type { SpeechRecognitionAdapter } from "./SpeechAdapterTypes";

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
 * WebSpeechRecognitionAdapter provides speech-to-text functionality using
 * the browser's Web Speech API (SpeechRecognition).
 *
 * @example
 * ```tsx
 * const runtime = useChatRuntime({
 *   api: "/api/chat",
 *   adapters: {
 *     speechRecognition: new WebSpeechRecognitionAdapter(),
 *   },
 * });
 * ```
 */
export class WebSpeechRecognitionAdapter implements SpeechRecognitionAdapter {
  private _language: string;
  private _continuous: boolean;
  private _interimResults: boolean;

  constructor(
    options: {
      /**
       * The language for speech recognition (e.g., "en-US", "zh-CN").
       * Defaults to the browser's language.
       */
      language?: string;
      /**
       * Whether to continue listening after the user stops speaking.
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
    this._language = options.language ?? navigator.language;
    this._continuous = options.continuous ?? true;
    this._interimResults = options.interimResults ?? true;
  }

  /**
   * Check if the browser supports the Web Speech Recognition API.
   */
  static isSupported(): boolean {
    return getSpeechRecognitionAPI() !== undefined;
  }

  listen(): SpeechRecognitionAdapter.Session {
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
      (result: SpeechRecognitionAdapter.Result) => void
    >();
    const speechCallbacks = new Set<
      (result: SpeechRecognitionAdapter.Result) => void
    >();
    const statusSubscribers = new Set<() => void>();

    let finalTranscript = "";

    const session: SpeechRecognitionAdapter.Session = {
      status: { type: "starting" },

      stop: async () => {
        recognition.stop();
        // Return a promise that resolves when the recognition ends
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
        callback: (result: SpeechRecognitionAdapter.Result) => void,
      ): Unsubscribe => {
        speechEndCallbacks.add(callback);
        return () => {
          speechEndCallbacks.delete(callback);
        };
      },

      onSpeech: (
        callback: (result: SpeechRecognitionAdapter.Result) => void,
      ): Unsubscribe => {
        speechCallbacks.add(callback);
        return () => {
          speechCallbacks.delete(callback);
        };
      },
    };

    const updateStatus = (newStatus: SpeechRecognitionAdapter.Status) => {
      session.status = newStatus;
      for (const cb of statusSubscribers) cb();
    };

    // Handle speech start
    recognition.addEventListener("speechstart", () => {
      for (const cb of speechStartCallbacks) cb();
    });

    // Handle recognition start (microphone access granted)
    recognition.addEventListener("start", () => {
      updateStatus({ type: "running" });
    });

    // Handle results
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
          // Notify about final result
          for (const cb of speechCallbacks) cb({ transcript });
        }
        // Interim results are not notified - only final results for text appending
      }
    });

    // Handle speech end (user stopped talking)
    recognition.addEventListener("speechend", () => {
      if (finalTranscript) {
        for (const cb of speechEndCallbacks)
          cb({ transcript: finalTranscript });
      }
    });

    // Handle recognition end
    recognition.addEventListener("end", () => {
      updateStatus({ type: "ended", reason: "stopped" });
      // Ensure we send any remaining transcript
      if (finalTranscript) {
        for (const cb of speechEndCallbacks)
          cb({ transcript: finalTranscript });
        finalTranscript = "";
      }
    });

    // Handle errors
    recognition.addEventListener("error", (event) => {
      const errorEvent = event as unknown as SpeechRecognitionErrorEvent;
      // "aborted" is not really an error, it's when cancel() is called
      if (errorEvent.error === "aborted") {
        updateStatus({ type: "ended", reason: "cancelled" });
      } else {
        updateStatus({ type: "ended", reason: "error" });
        console.error(
          "Speech recognition error:",
          errorEvent.error,
          errorEvent.message,
        );
      }
    });

    // Start recognition
    try {
      recognition.start();
    } catch (error) {
      updateStatus({ type: "ended", reason: "error" });
      throw error;
    }

    return session;
  }
}
