import type {
  FileMessagePart,
  MessageStatus,
  ReasoningMessagePart,
  SourceMessagePart,
  ThreadAssistantMessagePart,
  ThreadMessage,
  ThreadStep,
  ToolCallMessagePart,
} from "../../types/message";
import type {
  MessageTiming,
  RunConfig,
  TextMessagePart,
} from "../../types/message";
import type { ModelContext } from "../../model-context/types";
import type { ReadonlyJSONValue } from "assistant-stream/utils";

export type ChatModelRunUpdate = {
  readonly content: readonly ThreadAssistantMessagePart[];
  readonly metadata?: Record<string, unknown>;
};

export type ChatModelRunResult = {
  readonly content?: readonly ThreadAssistantMessagePart[] | undefined;
  readonly status?: MessageStatus | undefined;
  readonly metadata?: {
    /**
     * @deprecated Experimental since 2025-05-20, extended 2027-03-05. Not scheduled for removal; the API may change in any release.
     */
    readonly unstable_state?: ReadonlyJSONValue;
    /**
     * @deprecated Experimental since 2025-01-27, extended 2027-03-05. Not scheduled for removal; the API may change in any release.
     */
    readonly unstable_annotations?: readonly ReadonlyJSONValue[] | undefined;
    /**
     * @deprecated Experimental since 2025-01-04, extended 2027-03-05. Not scheduled for removal; the API may change in any release.
     */
    readonly unstable_data?: readonly ReadonlyJSONValue[] | undefined;
    readonly steps?: readonly ThreadStep[] | undefined;
    readonly timing?: MessageTiming | undefined;
    readonly custom?: Record<string, unknown> | undefined;
  };
};

export type CoreChatModelRunResult = Omit<ChatModelRunResult, "content"> & {
  readonly content: readonly (
    | TextMessagePart
    | ReasoningMessagePart
    | ToolCallMessagePart
    | SourceMessagePart
    | FileMessagePart
  )[];
};

export type ChatModelRunOptions = {
  readonly messages: readonly ThreadMessage[];
  readonly runConfig: RunConfig;
  readonly abortSignal: AbortSignal;
  readonly context: ModelContext;

  /**
   * @deprecated Experimental since 2024-10-24, extended 2026-12-05. Not scheduled for removal; the API may change in any release.
   */
  readonly unstable_assistantMessageId?: string | undefined;
  /**
   * @deprecated Experimental since 2026-01-20, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  readonly unstable_threadId?: string | undefined;
  /**
   * @deprecated Experimental since 2026-01-20, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  readonly unstable_parentId?: string | null | undefined;
  /**
   * @deprecated Experimental since 2024-09-28, extended 2026-12-05. Not scheduled for removal; the API may change in any release.
   */
  unstable_getMessage(): ThreadMessage;
};

export type ChatModelAdapter = {
  run(
    options: ChatModelRunOptions,
  ): Promise<ChatModelRunResult> | AsyncGenerator<ChatModelRunResult, void>;
};
