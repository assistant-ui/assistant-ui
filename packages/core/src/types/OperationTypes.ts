import type { ReadonlyJSONValue } from "../stream/utils/json/json-value";
import type { RunConfig } from "./AssistantTypes";
import type {
  ChatModelRunOptions,
  ChatModelRunResult,
} from "../adapters/ChatModelAdapter";

/**
 * Options for adding a tool result to a message.
 */
export type AddToolResultOptions = {
  messageId: string;
  toolName: string;
  toolCallId: string;
  result: ReadonlyJSONValue;
  isError: boolean;
  artifact?: ReadonlyJSONValue | undefined;
};

/**
 * Options for resuming a tool call.
 */
export type ResumeToolCallOptions = {
  toolCallId: string;
  payload: unknown;
};

/**
 * Options for submitting feedback on a message.
 */
export type SubmitFeedbackOptions = {
  messageId: string;
  type: "negative" | "positive";
};

/**
 * Configuration for starting a new run.
 */
export type StartRunConfig = {
  parentId: string | null;
  sourceId: string | null;
  runConfig: RunConfig;
};

/**
 * Configuration for resuming an existing run.
 */
export type ResumeRunConfig = StartRunConfig & {
  stream?: (
    options: ChatModelRunOptions,
  ) => AsyncGenerator<ChatModelRunResult, void, unknown>;
};
