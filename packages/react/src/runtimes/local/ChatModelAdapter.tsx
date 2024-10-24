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
    /**
     * @internal Use `steps` instead. This field will be removed in v0.6.
     */
    roundtrips?: ThreadStep[];
    steps?: ThreadStep[];
    custom?: Record<string, unknown>;
  };
};

export type ChatModelRunOptions = {
  messages: ThreadMessage[];
  abortSignal: AbortSignal;
  config: ModelConfig;

  unstable_assistantMessageId?: string;

  /**
   * @deprecated Declare the run function as an AsyncGenerator instead. This method will be removed in v0.6
   */
  onUpdate: (result: ChatModelRunUpdate) => void;
};

export type ChatModelAdapter = {
  run: (
    options: ChatModelRunOptions,
  ) => Promise<ChatModelRunResult> | AsyncGenerator<ChatModelRunResult, void>;
};
