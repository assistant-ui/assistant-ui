import type { AssistantEvent, RuntimeAdapter, RuntimeSnapshot } from "./types";
import type { ContentPart } from "../transcript/types";

export function createHeadlessAdapter(): RuntimeAdapter {
  const events: AssistantEvent[] = [];
  const userMessages: ContentPart[][] = [];
  let abortCount = 0;

  return {
    async sendUserMessage(content) {
      userMessages.push([...content]);
    },
    async emit(event) {
      events.push(event);
    },
    getSnapshot(): RuntimeSnapshot {
      return {
        events: [...events],
        abortCount,
        userMessages: userMessages.map((message) => [...message]),
      };
    },
    async abort() {
      abortCount += 1;
    },
  };
}
