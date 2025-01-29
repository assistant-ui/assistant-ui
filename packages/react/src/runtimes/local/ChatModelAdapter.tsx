import type {
  MessageStatus,
  RunConfig,
  TextContentPart,
  ThreadAssistantContentPart,
  ThreadMessage,
  ThreadStep,
  ToolCallContentPart,
} from "../../types/AssistantTypes";
import type { ModelContext } from "../../model-context/ModelContextTypes";
import { ReadonlyJSONValue } from "../../utils/json/json-value";

export type ChatModelRunUpdate = {
  readonly content: readonly ThreadAssistantContentPart[];
  readonly metadata?: Record<string, unknown>;
};

export type ChatModelRunResult = {
  readonly content?: readonly ThreadAssistantContentPart[] | undefined;
  readonly status?: MessageStatus | undefined;
  readonly metadata?: {
    readonly unstable_annotations?: readonly ReadonlyJSONValue[] | undefined;
    readonly unstable_data?: readonly ReadonlyJSONValue[] | undefined;
    readonly steps?: readonly ThreadStep[] | undefined;
    readonly custom?: Record<string, unknown> | undefined;
  };
};

export type CoreChatModelRunResult = Omit<ChatModelRunResult, "content"> & {
  readonly content: readonly (TextContentPart | ToolCallContentPart)[];
};

export type ChatModelRunOptions = {
  readonly messages: readonly ThreadMessage[];
  readonly runConfig: RunConfig;
  readonly abortSignal: AbortSignal;
  readonly context: ModelContext;

  /**
   * @deprecated This field was renamed to `context`.
   */
  readonly config: ModelContext;

  readonly unstable_assistantMessageId?: string;
};

export type ChatModelAdapter = {
  run(
    options: ChatModelRunOptions,
  ): Promise<ChatModelRunResult> | AsyncGenerator<ChatModelRunResult, void>;
};
