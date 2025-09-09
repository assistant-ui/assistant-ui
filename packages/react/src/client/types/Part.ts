import { ToolResponse } from "assistant-stream";
import { MessagePartRuntime } from "../../legacy-runtime/runtime";
import {
  ThreadUserMessagePart,
  ThreadAssistantMessagePart,
  MessagePartStatus,
  ToolCallMessagePartStatus,
} from "../../types";

export type MessagePartClientState = (
  | ThreadUserMessagePart
  | ThreadAssistantMessagePart
) & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

export type MessagePartClientApi = {
  /**
   * Get the current state of the message part.
   */
  getState(): MessagePartClientState;

  /**
   * Add tool result to a tool call message part that has no tool result yet.
   * This is useful when you are collecting a tool result via user input ("human tool calls").
   */
  addToolResult(result: any | ToolResponse<any>): void;

  /** @internal */
  __internal_getRuntime(): MessagePartRuntime | null;
};
