import {
  AssistantStreamChunkTuple,
  AssistantStreamChunkType,
} from "./AssistantStreamChunkType";
import { ToolResultStreamPart } from "./toolResultStream";

export function assistantDecoderStream() {
  const toolCallNames = new Map<string, string>();
  let currentToolCall:
    | { id: string; name: string; argsText: string }
    | undefined;

  return new TransformStream<string, ToolResultStreamPart>({
    transform(chunk, controller) {
      const [code, value] = parseStreamPart(chunk);

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
          args: currentToolCall.argsText,
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
          const unhandledType: never = code;
          throw new Error(`Unhandled chunk type: ${unhandledType}`);
        }
      }
    },
  });
}

const parseStreamPart = (part: string): AssistantStreamChunkTuple => {
  const index = part.indexOf(":");
  if (index === -1) throw new Error("Invalid stream part");
  return [
    part.slice(0, index) as AssistantStreamChunkType,
    JSON.parse(part.slice(index + 1)),
  ] as const;
};
