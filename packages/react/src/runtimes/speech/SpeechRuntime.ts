import { ThreadMessage, Unsubscribe } from "../../types";

export namespace SpeechSynthesisRuntime {
  export type Utterance = {
    stop: () => void;
    onEnd: (callback: () => void) => Unsubscribe;
  };
}

export type SpeechSynthesisRuntime = {
  speak: (message: ThreadMessage) => Promise<SpeechSynthesisRuntime.Utterance>;
};

export namespace SpeechRecognitionRuntime {
  export type Status = {
    type: "stopped" | "starting" | "running";
  };
}
export type SpeechRecognitionRuntime = {
  status: SpeechRecognitionRuntime.Status;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  onMessage: (callback: (message: ThreadMessage) => void) => Unsubscribe;
};
