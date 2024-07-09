export enum AssistantStreamChunkType {
  TextDelta = "0",
  ToolCallBegin = "1",
  ToolCallArgsTextDelta = "2",
  Error = "E",
}
