import { AssistantStreamChunkType } from "./AssistantStreamChunkType";
import { AssistantStreamPart } from "./AssistantStreamPart";

export function assistantDecoderStream() {
  let currentToolCall: { id: string; name: string } | undefined;
  return new TransformStream<string, AssistantStreamPart>({
    transform(chunk, controller) {
      const [code, valueJson] = chunk.split(":") as [
        AssistantStreamChunkType,
        string,
      ];
      const value = JSON.parse(valueJson);
      switch (code) {
        case AssistantStreamChunkType.TextDelta: {
          controller.enqueue({
            type: "text-delta",
            textDelta: value,
          });
          break;
        }
        case AssistantStreamChunkType.ToolCallBegin: {
          const { id, name } = JSON.parse(value);
          currentToolCall = { id, name };
          break;
        }
        case AssistantStreamChunkType.ToolCallArgsTextDelta: {
          const delta = JSON.parse(value);
          controller.enqueue({
            type: "tool-call-delta",
            toolCallId: currentToolCall!.id,
            toolName: currentToolCall!.name,
            argsTextDelta: delta,
          });
          break;
        }
        case AssistantStreamChunkType.Error: {
          controller.enqueue({
            type: "error",
            error: JSON.parse(value),
          });
          break;
        }
        default: {
          const _exhaustiveCheck: never = code;
          throw new Error(`Unhandled chunk type: ${_exhaustiveCheck}`);
        }
      }
    },
  });
}
