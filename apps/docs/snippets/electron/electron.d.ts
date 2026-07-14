import type { AssistantAI } from "./shared";

declare global {
  interface Window {
    assistantAI: AssistantAI;
  }
}

export {};
