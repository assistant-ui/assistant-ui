import { LanguageModelV1StreamPart } from "@ai-sdk/provider";

export enum AssistantStreamChunkType {
  TextDelta = "0",
  ToolCallBegin = "1",
  ToolCallArgsTextDelta = "2",
  Error = "E",
  Finish = "F",
}

export type AssistantStreamChunkTuple =
  | [AssistantStreamChunkType.TextDelta, string]
  | [
      AssistantStreamChunkType.ToolCallBegin,
      {
        id: string;
        name: string;
      },
    ]
  | [AssistantStreamChunkType.ToolCallArgsTextDelta, string]
  | [AssistantStreamChunkType.Error, unknown]
  | [
      AssistantStreamChunkType.Finish,
      Omit<
        LanguageModelV1StreamPart & {
          type: "finish";
        },
        "type"
      >,
    ];
