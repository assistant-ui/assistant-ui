import { LanguageModelV1StreamPart } from "@ai-sdk/provider";
import { AssistantStreamChunkType } from "./AssistantStreamChunkType";

export function assistantDecoderStream() {
  let currentToolCall:
    | { id: string; name: string; argsText: string }
    | undefined;

  return new TransformStream<string, LanguageModelV1StreamPart>({
    transform(chunk, controller) {
      const [code, valueJson] = chunk.split(":") as [
        AssistantStreamChunkType,
        string,
      ];
      const value = JSON.parse(valueJson);

      if (
        currentToolCall &&
        code !== AssistantStreamChunkType.ToolCallArgsTextDelta &&
        code !== AssistantStreamChunkType.Error
      ) {
        controller.enqueue({
          type: "tool-call",
          toolCallType: "function",
          toolCallId: currentToolCall.id,
          toolName: currentToolCall.name,
          args: JSON.parse(currentToolCall.argsText),
        });
        currentToolCall = undefined;
      }

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
          currentToolCall = { id, name, argsText: "" };
          break;
        }
        case AssistantStreamChunkType.ToolCallArgsTextDelta: {
          const delta = JSON.parse(value);
          currentToolCall!.argsText += delta;
          controller.enqueue({
            type: "tool-call-delta",
            toolCallType: "function",
            toolCallId: currentToolCall!.id,
            toolName: currentToolCall!.name,
            argsTextDelta: delta,
          });
          break;
        }
        case AssistantStreamChunkType.Finish: {
          controller.enqueue({
            type: "finish",
            ...JSON.parse(value),
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
          const unhandledType: never = code;
          throw new Error(`Unhandled chunk type: ${unhandledType}`);
        }
      }
    },
  });
}
