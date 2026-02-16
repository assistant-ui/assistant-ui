import type { Unsubscribe } from "@assistant-ui/core";

/**
 * Types and interfaces for speech synthesis (text-to-speech) functionality.
 */
export namespace SpeechSynthesisAdapter {
  /**
   * Status of a speech synthesis operation.
   */
  export type Status =
    | {
        /** Speech is starting or currently running */
        type: "starting" | "running";
      }
    | {
        /** Speech has ended */
        type: "ended";
        /** Reason why speech ended */
        reason: "finished" | "cancelled" | "error";
        /** Error details if speech ended due to error */
        error?: unknown;
      };

  /**
   * Represents a single speech utterance with control and status tracking.
   */
  export type Utterance = {
    /** Current status of the utterance */
    status: Status;
    /** Cancel the current speech */
    cancel: () => void;
    /** Subscribe to status changes */
    subscribe: (callback: () => void) => Unsubscribe;
  };
}

/**
 * Interface for text-to-speech functionality.
 *
 * SpeechSynthesisAdapter provides the ability to convert text content
 * into spoken audio, with status tracking and cancellation support.
 *
 * @example
 * ```tsx
 * const speechAdapter: SpeechSynthesisAdapter = {
 *   speak: (text) => {
 *     const utterance = new SpeechSynthesisUtterance(text);
 *     speechSynthesis.speak(utterance);
 *
 *     return {
 *       status: { type: "starting" },
 *       cancel: () => speechSynthesis.cancel(),
 *       subscribe: (callback) => {
 *         utterance.addEventListener('end', callback);
 *         return () => utterance.removeEventListener('end', callback);
 *       }
 *     };
 *   }
 * };
 * ```
 */
export type SpeechSynthesisAdapter = {
  /**
   * Converts text to speech and returns an utterance object for control.
   *
   * @param text - The text content to speak
   * @returns An utterance object with status and control methods
   */
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
    /** The transcribed text */
    transcript: string;
    /**
     * Whether this is a final (committed) result or an interim (partial) result.
     *
     * - `true` (final): The text should be appended to the composer input.
     *   This text is finalized and won't change.
     *
     * - `false` (interim/partial): The text is a preview that may change.
     *   It should be displayed as a preview but not appended to the input yet.
     *   Subsequent interim results replace the previous interim result.
     *
     * Defaults to `true` for backwards compatibility with adapters that
     * don't set this flag.
     */
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

  /**
   * Whether to disable text input while dictation is active.
   * Some adapters (like ElevenLabs Scribe) return cumulative transcripts
   * that conflict with simultaneous typing.
   * @default false
   */
  disableInputDuringDictation?: boolean;
};
