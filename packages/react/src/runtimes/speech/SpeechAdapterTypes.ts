import { Unsubscribe } from "../../types";

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

export namespace SpeechRecognitionAdapter {
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

export type SpeechRecognitionAdapter = {
  listen: () => SpeechRecognitionAdapter.Session;
};
