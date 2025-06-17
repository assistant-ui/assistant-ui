import { Unsubscribe } from "../../../types";

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

/**
 * Types and interfaces for speech recognition (speech-to-text) functionality.
 */
export namespace SpeechRecognitionAdapter {
  /**
   * Status of a speech recognition session.
   */
  export type Status =
    | {
        /** Recognition is starting or currently running */
        type: "starting" | "running";
      }
    | {
        /** Recognition has ended */
        type: "ended";
        /** Reason why recognition ended */
        reason: "stopped" | "cancelled" | "error";
      };

  /**
   * Result from speech recognition containing the transcribed text.
   */
  export type Result = {
    /** The transcribed text from speech input */
    transcript: string;
  };

  /**
   * Represents an active speech recognition session with event handling.
   */
  export type Session = {
    /** Current status of the recognition session */
    status: Status;
    /** Stop the recognition session gracefully */
    stop: () => Promise<void>;
    /** Cancel the recognition session immediately */
    cancel: () => void;
    /** Subscribe to speech start events */
    onSpeechStart: (callback: () => void) => Unsubscribe;
    /** Subscribe to speech end events with final result */
    onSpeechEnd: (callback: (result: Result) => void) => Unsubscribe;
    /** Subscribe to ongoing speech recognition results */
    onSpeech: (callback: (result: Result) => void) => Unsubscribe;
  };
}

/**
 * Interface for speech-to-text functionality.
 * 
 * SpeechRecognitionAdapter provides the ability to convert spoken audio
 * into text, with real-time transcription and event handling support.
 * 
 * @example
 * ```tsx
 * const recognitionAdapter: SpeechRecognitionAdapter = {
 *   listen: () => {
 *     const recognition = new webkitSpeechRecognition();
 *     recognition.continuous = true;
 *     recognition.interimResults = true;
 *     
 *     return {
 *       status: { type: "starting" },
 *       stop: async () => recognition.stop(),
 *       cancel: () => recognition.abort(),
 *       onSpeechStart: (callback) => {
 *         recognition.addEventListener('start', callback);
 *         return () => recognition.removeEventListener('start', callback);
 *       },
 *       onSpeech: (callback) => {
 *         recognition.addEventListener('result', (event) => {
 *           callback({ transcript: event.results[0][0].transcript });
 *         });
 *         return () => recognition.removeEventListener('result', callback);
 *       },
 *       onSpeechEnd: (callback) => {
 *         recognition.addEventListener('end', callback);
 *         return () => recognition.removeEventListener('end', callback);
 *       }
 *     };
 *   }
 * };
 * ```
 */
export type SpeechRecognitionAdapter = {
  /**
   * Starts a new speech recognition session.
   * 
   * @returns A session object with status tracking and event handling
   */
  listen: () => SpeechRecognitionAdapter.Session;
};
