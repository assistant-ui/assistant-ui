"use client";
import type {
  ThreadAssistantContentPart,
  ThreadMessage,
} from "../../types/AssistantTypes";
import type { ModelConfig } from "../../types/ModelConfigTypes";

export type ChatModelRunResult = {
  content: ThreadAssistantContentPart[];
};

export type ChatModelRunOptions = {
  messages: ThreadMessage[];
  abortSignal: AbortSignal;
  config: ModelConfig;
  onUpdate: (result: ChatModelRunResult) => void;
};

export type ChatModelAdapter = {
  run: (options: ChatModelRunOptions) => Promise<ChatModelRunResult | void>;
};
