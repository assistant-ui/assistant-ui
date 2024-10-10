import { ThreadMessage } from "../../types";
import { getThreadMessageText } from "../../utils/getThreadMessageText";
import { SpeechSynthesisAdapter } from "./SpeechAdapterTypes";

export class WebSpeechSynthesisAdapter implements SpeechSynthesisAdapter {
  speak(message: ThreadMessage): SpeechSynthesisAdapter.Utterance {
    const text = getThreadMessageText(message);
    const utterance = new SpeechSynthesisUtterance(text);

    const subscribers = new Set<() => void>();
    const handleEnd = (
      reason: "finished" | "error" | "cancelled",
      error?: unknown,
    ) => {
      if (res.status.type === "ended") return;

      res.status = { type: "ended", reason, error };
      subscribers.forEach((handler) => handler());
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
            if (!cancelled) callback();
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
