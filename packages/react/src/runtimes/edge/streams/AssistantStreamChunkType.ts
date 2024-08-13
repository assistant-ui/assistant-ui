import { LanguageModelV1StreamPart } from "@ai-sdk/provider";

export enum AssistantStreamChunkType {
  TextDelta = "0",
  ToolCallBegin = "1",
  ToolCallArgsTextDelta = "2",
  ToolCallResult = "3",
  Error = "E",
  Finish = "F",
}

export type AssistantStreamChunk = {
  [AssistantStreamChunkType.TextDelta]: string;
  [AssistantStreamChunkType.ToolCallBegin]: {
    id: string;
    name: string;
  };
  [AssistantStreamChunkType.ToolCallArgsTextDelta]: string;
  [AssistantStreamChunkType.ToolCallResult]: {
    id: string;
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
