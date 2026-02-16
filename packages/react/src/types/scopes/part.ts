import type { ToolResponse } from "assistant-stream";
import type { MessagePartRuntime } from "../../legacy-runtime/runtime";
import type {
  ThreadUserMessagePart,
  ThreadAssistantMessagePart,
  MessagePartStatus,
  ToolCallMessagePartStatus,
} from "@assistant-ui/core";

export type PartState = (ThreadUserMessagePart | ThreadAssistantMessagePart) & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

export type PartMethods = {
  /**
   * Get the current state of the message part.
   */
  getState(): PartState;
  /**
   * Add tool result to a tool call message part that has no tool result yet.
   * This is useful when you are collecting a tool result via user input ("human tool calls").
   */
  addToolResult(result: unknown | ToolResponse<unknown>): void;
  /**
   * Resume a tool call that is waiting for human input with a payload.
   * This is useful when a tool has requested human input and is waiting for a response.
   */
  resumeToolCall(payload: unknown): void;
  /** @internal */
  __internal_getRuntime?(): MessagePartRuntime;
};

export type PartMeta =
  | {
      source: "message";
      query:
        | { type: "index"; index: number }
        | { type: "toolCallId"; toolCallId: string };
    }
  | {
      source: "chainOfThought";
      query: { type: "index"; index: number };
    };

export type PartClientSchema = {
  methods: PartMethods;
  meta: PartMeta;
};
