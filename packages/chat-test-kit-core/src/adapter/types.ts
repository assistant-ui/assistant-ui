import type { ContentPart, JsonObject, JsonValue } from "../transcript/types";

export type AssistantEvent =
  | { type: "text-delta"; delta: string }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args: JsonObject;
      argsText: string;
    }
  | { type: "tool-result"; toolCallId: string; value: JsonValue }
  | { type: "finish"; reason: "stop" | "abort" | "error" }
  | { type: "transport-error"; code?: number; message: string }
  | { type: "disconnect" };

export type RuntimeSnapshot = {
  events: AssistantEvent[];
  abortCount: number;
  userMessages: ContentPart[][];
};

export type RuntimeAdapter = {
  sendUserMessage(content: ContentPart[]): Promise<void>;
  emit(event: AssistantEvent): Promise<void>;
  getSnapshot(): RuntimeSnapshot;
  abort(): Promise<void>;
};
