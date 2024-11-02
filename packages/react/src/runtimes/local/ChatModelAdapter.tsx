"use client";

import type {
  MessageStatus,
  ThreadAssistantContentPart,
  ThreadMessage,
  ThreadStep,
} from "../../types/AssistantTypes";
import type { ModelConfig } from "../../types/ModelConfigTypes";

export type ChatModelRunUpdate = {
  content: ThreadAssistantContentPart[];
  metadata?: Record<string, unknown>;
};

export type ChatModelRunResult = {
  content?: ThreadAssistantContentPart[];
  status?: MessageStatus;
  metadata?: {
    steps?: ThreadStep[];
    custom?: Record<string, unknown>;
  };
};

export type ChatModelRunOptions = {
  messages: ThreadMessage[];
  abortSignal: AbortSignal;
  config: ModelConfig;

  unstable_assistantMessageId?: string;
};

export type ChatModelAdapter = {
  run: (
    options: ChatModelRunOptions,
  ) => Promise<ChatModelRunResult> | AsyncGenerator<ChatModelRunResult, void>;
};
