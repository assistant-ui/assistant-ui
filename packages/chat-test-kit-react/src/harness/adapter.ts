import type {
  AssistantEvent,
  ContentPart,
  RuntimeAdapter,
  RuntimeSnapshot,
} from "@assistant-ui/chat-test-kit-core";
import type { EventBridge } from "./bridge";
import type { TimelineEntry } from "./types";

export type AssistantUIAdapterOptions = {
  bridge: EventBridge;
  onAbort?: () => void;
};

export type AssistantUIAdapter = RuntimeAdapter & {
  timeline(): TimelineEntry[];
};

export function createAssistantUIAdapter(
  options: AssistantUIAdapterOptions,
): AssistantUIAdapter {
  const events: AssistantEvent[] = [];
  const userMessages: ContentPart[][] = [];
  const timelineEntries: TimelineEntry[] = [];
  let abortCount = 0;

  function pushTimeline(entry: TimelineEntry): void {
    timelineEntries.push(entry);
  }

  return {
    async sendUserMessage(content) {
      const copy = [...content];
      userMessages.push(copy);
      const text = copy
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("");
      pushTimeline({ kind: "user-submit", at: Date.now(), content: text });
    },
    async emit(event) {
      events.push(event);
      pushTimeline({ kind: "event", at: Date.now(), event });
      options.bridge.push(event);
      const isTerminal =
        event.type === "finish" ||
        event.type === "transport-error" ||
        event.type === "disconnect";
      if (isTerminal) options.bridge.end();
    },
    getSnapshot(): RuntimeSnapshot {
      return {
        events: [...events],
        abortCount,
        userMessages: userMessages.map((m) => [...m]),
      };
    },
    async abort() {
      abortCount += 1;
      options.onAbort?.();
      options.bridge.end();
    },
    timeline() {
      return [...timelineEntries];
    },
  };
}
