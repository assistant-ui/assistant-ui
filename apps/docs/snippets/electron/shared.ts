export const ASSISTANT_STREAM_CHANNEL = "assistant:stream";

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

export type ChatRequest = {
  system?: string;
  messages: ChatMessage[];
};

export type ChatEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export type AssistantAI = {
  streamChat(
    request: ChatRequest,
    onEvent: (event: ChatEvent) => void,
  ): () => void;
};
