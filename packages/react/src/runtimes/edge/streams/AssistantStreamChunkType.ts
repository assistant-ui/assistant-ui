import { LanguageModelV1StreamPart } from "@ai-sdk/provider";

export enum AssistantStreamChunkType {
  TextDelta = "0",
  ToolCallBegin = "b",
  ToolCallDelta = "c",
  ToolCallResult = "a",
  Error = "3",
  Finish = "d",
}

export type AssistantStreamChunk = {
  [AssistantStreamChunkType.TextDelta]: string;
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
  [AssistantStreamChunkType.Finish]: Omit<
    LanguageModelV1StreamPart & {
      type: "finish";
    },
    "type"
  >;
};
