import {
  AssistantStreamChunk,
  AssistantStreamChunkType,
} from "./AssistantStreamChunkType";
import { StreamPart } from "./utils/StreamPart";
import { ToolResultStreamPart } from "./toolResultStream";

export function assistantDecoderStream() {
  const toolCallNames = new Map<string, string>();
  let currentToolCall:
    | { id: string; name: string; argsText: string }
    | undefined;

  return new TransformStream<
    StreamPart<AssistantStreamChunk>,
    ToolResultStreamPart
  >({
    transform({ type, value }, controller) {
      if (
        currentToolCall &&
        type !== AssistantStreamChunkType.ToolCallArgsTextDelta &&
        type !== AssistantStreamChunkType.Error
      ) {
        controller.enqueue({
          type: "tool-call",
          toolCallType: "function",
          toolCallId: currentToolCall.id,
          toolName: currentToolCall.name,
          args: currentToolCall.argsText,
        });
        currentToolCall = undefined;
      }

      switch (type) {
        case AssistantStreamChunkType.TextDelta: {
          controller.enqueue({
            type: "text-delta",
            textDelta: value,
          });
          break;
        }
        case AssistantStreamChunkType.ToolCallBegin: {
          const { id, name } = value;
          toolCallNames.set(id, name);
          currentToolCall = { id, name, argsText: "" };
          break;
        }
        case AssistantStreamChunkType.ToolCallArgsTextDelta: {
          const delta = value;
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
        case AssistantStreamChunkType.ToolCallResult: {
          controller.enqueue({
            type: "tool-result",
            toolCallType: "function",
            toolCallId: value.id,
            toolName: toolCallNames.get(value.id)!,
            result: value.result,
          });
          break;
        }
        case AssistantStreamChunkType.Finish: {
          controller.enqueue({
            type: "finish",
            ...value,
          });
          break;
        }
        case AssistantStreamChunkType.Error: {
          controller.enqueue({
            type: "error",
            error: value,
          });
          break;
        }
        default: {
          const unhandledType: never = type;
          throw new Error(`Unhandled chunk type: ${unhandledType}`);
        }
      }
    },
  });
}
