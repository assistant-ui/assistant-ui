import { ThreadMessage } from "../../types";
import { getThreadMessageText } from "../../utils/getThreadMessageText";
import { SpeechSynthesisAdapter } from "./SpeechAdapterTypes";

export class WebSpeechSynthesisAdapter implements SpeechSynthesisAdapter {
  speak(message: ThreadMessage): SpeechSynthesisAdapter.Utterance {
    const text = getThreadMessageText(message);
    const utterance = new SpeechSynthesisUtterance(text);

    const endHandlers = new Set<() => void>();
    const handleEnd = (
      reason: "finished" | "error" | "cancelled",
      error?: unknown,
    ) => {
      if (res.status.type === "ended") return;

      res.status = { type: "ended", reason, error };
      endHandlers.forEach((handler) => handler());
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
      onEnd: (callback) => {
        if (res.status.type === "ended") {
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
    return res;
  }
}
