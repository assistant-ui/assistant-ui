import { ThreadMessage } from "../../types";
import { getThreadMessageText } from "../../utils/getThreadMessageText";
import { SpeechSynthesisAdapter } from "./SpeechAdapterTypes";

export class WebSpeechSynthesisAdapter implements SpeechSynthesisAdapter {
  speak(message: ThreadMessage): SpeechSynthesisAdapter.Utterance {
    const text = getThreadMessageText(message);
    const utterance = new SpeechSynthesisUtterance(text);

    let ended = false;
    const endHandlers = new Set<() => void>();
    const handleEnd = () => {
      if (ended) return;

      ended = true;
      endHandlers.forEach((handler) => handler());
    };

    utterance.addEventListener("end", handleEnd);
    utterance.addEventListener("error", handleEnd);

    window.speechSynthesis.speak(utterance);

    return {
      stop: () => {
        window.speechSynthesis.cancel();
        handleEnd();
      },
      onEnd: (callback) => {
        if (ended) {
          let cancelled = false;
          queueMicrotask(() => {
            if (!cancelled) callback();
          });
          return () => {
            cancelled = true;
          };
        } else {
          endHandlers.add(callback);
          return () => {
            endHandlers.delete(callback);
          };
        }
      },
    };
  }
}
