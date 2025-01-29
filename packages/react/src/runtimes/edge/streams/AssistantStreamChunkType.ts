import { LanguageModelV1StreamPart } from "@ai-sdk/provider";
import { ReadonlyJSONValue } from "../../../utils/json/json-value";

export enum AssistantStreamChunkType {
  TextDelta = "0",
  Data = "2",
  Error = "3",
  Annotation = "8",
  ToolCall = "9",
  ToolCallResult = "a",
  ToolCallBegin = "b",
  ToolCallDelta = "c",
  FinishMessage = "d",
  FinishStep = "e",
  StartStep = "f",
  ReasoningDelta = "g",
}

export type AssistantStreamChunk = {
  [AssistantStreamChunkType.TextDelta]: string;
  [AssistantStreamChunkType.Data]: ReadonlyJSONValue[];
  [AssistantStreamChunkType.Annotation]: ReadonlyJSONValue[];
  [AssistantStreamChunkType.ToolCall]: {
    toolCallId: string;
    toolName: string;
    args: unknown;
  };
  [AssistantStreamChunkType.ToolCallBegin]: {
    toolCallId: string;
    toolName: string;
  };
  [AssistantStreamChunkType.ToolCallDelta]: {
    toolCallId: string;
    argsTextDelta: string;
  };
  [AssistantStreamChunkType.ToolCallResult]: {
    toolCallId: string;
    result: any;
  };
  [AssistantStreamChunkType.Error]: unknown;
  [AssistantStreamChunkType.FinishStep]: {
    finishReason:
      | "stop"
      | "length"
      | "content-filter"
      | "tool-calls"
      | "error"
      | "other"
      | "unknown";
    usage: {
      promptTokens: number;
      completionTokens: number;
    };
    isContinued: boolean;
  };
  [AssistantStreamChunkType.FinishMessage]: Omit<
    LanguageModelV1StreamPart & {
      type: "finish";
    },
    "type"
  >;
  [AssistantStreamChunkType.StartStep]: {
    id: string;
  };
  [AssistantStreamChunkType.ReasoningDelta]: string;
};
