"use client";
import type {
  AssistantContentPart,
  ThreadMessage,
} from "../../types/AssistantTypes";
import type { ModelConfig } from "../../types/ModelConfigTypes";

export type ChatModelRunResult = {
  content: AssistantContentPart[];
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
