"use client";
import type {
  MessageStatus,
  ThreadAssistantContentPart,
  ThreadMessage,
} from "../../types/AssistantTypes";
import type { ModelConfig } from "../../types/ModelConfigTypes";

export type ChatModelRunUpdate = {
  content: ThreadAssistantContentPart[];
};

export type ChatModelRunResult = {
  content: ThreadAssistantContentPart[];
  status?: MessageStatus;
};

export type ChatModelRunOptions = {
  messages: ThreadMessage[];
  abortSignal: AbortSignal;
  config: ModelConfig;
  onUpdate: (result: ChatModelRunUpdate) => void;
};

export type ChatModelAdapter = {
  run: (options: ChatModelRunOptions) => Promise<ChatModelRunResult>;
};
