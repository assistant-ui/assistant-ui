import { ThreadMessage, Unsubscribe } from "../../types";

export namespace SpeechSynthesisAdapter {
  export type Utterance = {
    stop: () => void;
    onEnd: (callback: () => void) => Unsubscribe;
  };
}

export type SpeechSynthesisAdapter = {
  speak: (message: ThreadMessage) => SpeechSynthesisAdapter.Utterance;
};

export namespace SpeechRecognitionAdapter {
  export type Status = {
    type: "stopped" | "starting" | "running";
  };
}
export type SpeechRecognitionAdapter = {
  status: SpeechRecognitionAdapter.Status;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  onMessage: (callback: (message: ThreadMessage) => void) => Unsubscribe;
};
