"use client";

import type {
  MessageStatus,
  RunConfig,
  TextContentPart,
  ThreadAssistantContentPart,
  ThreadMessage,
  ThreadStep,
  ToolCallContentPart,
} from "../../types/AssistantTypes";
import type { ModelConfig } from "../../types/ModelConfigTypes";

export type ChatModelRunUpdate = {
  content: ThreadAssistantContentPart[];
  metadata?: Record<string, unknown>;
};

export type ChatModelRunResult = {
  content?: ThreadAssistantContentPart[] | undefined;
  status?: MessageStatus | undefined;
  metadata?: {
    unstable_data?: unknown[] | undefined;
    steps?: ThreadStep[] | undefined;
    custom?: Record<string, unknown> | undefined;
  };
};

export type CoreChatModelRunResult = Omit<ChatModelRunResult, "content"> & {
  content: (TextContentPart | ToolCallContentPart)[];
};

export type ChatModelRunOptions = {
  messages: ThreadMessage[];
  runConfig: RunConfig;
  abortSignal: AbortSignal;
  config: ModelConfig;

  unstable_assistantMessageId?: string;
};

export type ChatModelAdapter = {
  run: (
    options: ChatModelRunOptions,
  ) => Promise<ChatModelRunResult> | AsyncGenerator<ChatModelRunResult, void>;
};
