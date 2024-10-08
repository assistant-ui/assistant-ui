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
        type !== AssistantStreamChunkType.ToolCallDelta &&
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
          const { toolCallId: id, toolName: name } = value;
          toolCallNames.set(id, name);
          currentToolCall = { id, name, argsText: "" };
          break;
        }
        case AssistantStreamChunkType.ToolCallDelta: {
          const { toolCallId, argsTextDelta } = value;
          if (currentToolCall?.id !== toolCallId) {
            throw new Error(
              `Received tool call delta for unknown tool call "${toolCallId}".`,
            );
          }

          currentToolCall!.argsText += argsTextDelta;
          controller.enqueue({
            type: "tool-call-delta",
            toolCallType: "function",
            toolCallId: currentToolCall!.id,
            toolName: currentToolCall!.name,
            argsTextDelta: argsTextDelta,
          });
          break;
        }
        case AssistantStreamChunkType.ToolCallResult: {
          controller.enqueue({
            type: "tool-result",
            toolCallType: "function",
            toolCallId: value.toolCallId,
            toolName: toolCallNames.get(value.toolCallId)!,
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
