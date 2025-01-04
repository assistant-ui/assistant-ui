import { JSONValue, LanguageModelV1StreamPart } from "@ai-sdk/provider";

export enum AssistantStreamChunkType {
  TextDelta = "0",
  Data = "2",
  Error = "3",
  Annotation = "8",
  ToolCall = "9",
  ToolCallResult = "a",
  ToolCallBegin = "b",
  ToolCallDelta = "c",
  Finish = "d",
  StepFinish = "e",
}

export type AssistantStreamChunk = {
  [AssistantStreamChunkType.TextDelta]: string;
  [AssistantStreamChunkType.Data]: JSONValue[];
  [AssistantStreamChunkType.Annotation]: JSONValue[];
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
  [AssistantStreamChunkType.StepFinish]: {
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
  [AssistantStreamChunkType.Finish]: Omit<
    LanguageModelV1StreamPart & {
      type: "finish";
    },
    "type"
  >;
};
