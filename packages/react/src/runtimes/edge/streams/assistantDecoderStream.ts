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

  const endCurrentToolCall = (
    controller: TransformStreamDefaultController<ToolResultStreamPart>,
  ) => {
    if (!currentToolCall) return;
    controller.enqueue({
      type: "tool-call",
      toolCallType: "function",
      toolCallId: currentToolCall.id,
      toolName: currentToolCall.name,
      args: currentToolCall.argsText,
    });
    currentToolCall = undefined;
  };

  return new TransformStream<
    StreamPart<AssistantStreamChunk>,
    ToolResultStreamPart
  >({
    transform({ type, value }, controller) {
      if (
        type !== AssistantStreamChunkType.ToolCallDelta &&
        type !== AssistantStreamChunkType.Error
      ) {
        endCurrentToolCall(controller);
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

          controller.enqueue({
            type: "tool-call-delta",
            toolCallType: "function",
            toolCallId: id,
            toolName: name,
            argsTextDelta: "",
          });
          break;
        }
        case AssistantStreamChunkType.ToolCallDelta: {
          const { toolCallId, argsTextDelta } = value;

          const toolName = toolCallNames.get(toolCallId)!;
          if (currentToolCall?.id === toolCallId) {
            currentToolCall.argsText += argsTextDelta;
          }
          controller.enqueue({
            type: "tool-call-delta",
            toolCallType: "function",
            toolCallId,
            toolName,
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

        case AssistantStreamChunkType.ToolCall: {
          const { toolCallId, toolName, args } = value;
          toolCallNames.set(toolCallId, toolName);

          const argsText = JSON.stringify(args);
          controller.enqueue({
            type: "tool-call-delta",
            toolCallType: "function",
            toolCallId,
            toolName,
            argsTextDelta: argsText,
          });
          controller.enqueue({
            type: "tool-call",
            toolCallType: "function",
            toolCallId: toolCallId,
            toolName: toolName,
            args: argsText,
          });
          break;
        }

        case AssistantStreamChunkType.StepFinish: {
          controller.enqueue({
            type: "step-finish",
            ...value,
          });
          break;
        }

        // TODO
        case AssistantStreamChunkType.Data:
          break;

        default: {
          const unhandledType: never = type;
          throw new Error(`Unhandled chunk type: ${unhandledType}`);
        }
      }
    },
    flush(controller) {
      endCurrentToolCall(controller);
    },
  });
}
