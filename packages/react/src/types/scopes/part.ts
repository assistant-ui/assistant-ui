import type { ToolResponse } from "assistant-stream";
import type {
  ThreadUserMessagePart,
  ThreadAssistantMessagePart,
  MessagePartStatus,
  ToolCallMessagePartStatus,
} from "../AssistantTypes";

export type PartState = (ThreadUserMessagePart | ThreadAssistantMessagePart) & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

export type PartMethods = {
  addToolResult(result: unknown | ToolResponse<unknown>): void;
  resumeToolCall(payload: unknown): void;
};

export type PartMeta = {
  source: "message";
  query: { index: number } | { toolCallId: string };
};

export type PartClientSchema = {
  state: PartState;
  methods: PartMethods;
  meta: PartMeta;
};
