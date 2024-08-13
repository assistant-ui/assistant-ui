import {
  AssistantStreamChunk,
  AssistantStreamChunkType,
} from "./AssistantStreamChunkType";
import { StreamPart } from "./utils/StreamPart";
import { ToolResultStreamPart } from "./toolResultStream";

export function assistantEncoderStream() {
  const toolCalls = new Set<string>();
  return new TransformStream<
    ToolResultStreamPart,
    StreamPart<AssistantStreamChunk>
  >({
    transform(chunk, controller) {
      const chunkType = chunk.type;
      switch (chunkType) {
        case "text-delta": {
          controller.enqueue({
            type: AssistantStreamChunkType.TextDelta,
            value: chunk.textDelta,
          });
          break;
        }
        case "tool-call-delta": {
          if (!toolCalls.has(chunk.toolCallId)) {
            toolCalls.add(chunk.toolCallId);
            controller.enqueue({
              type: AssistantStreamChunkType.ToolCallBegin,
              value: {
                id: chunk.toolCallId,
                name: chunk.toolName,
              },
            });
          }

          controller.enqueue({
            type: AssistantStreamChunkType.ToolCallArgsTextDelta,
            value: chunk.argsTextDelta,
          });
          break;
        }

        // ignore
        case "tool-call":
          break;

        case "tool-result": {
          controller.enqueue({
            type: AssistantStreamChunkType.ToolCallResult,
            value: {
              id: chunk.toolCallId,
              result: chunk.result,
            },
          });
          break;
        }

        case "finish": {
          const { type, ...rest } = chunk;
          controller.enqueue({
            type: AssistantStreamChunkType.Finish,
            value: rest,
          });
          break;
        }

        case "error": {
          controller.enqueue({
            type: AssistantStreamChunkType.Error,
            value: chunk.error,
          });
          break;
        }
        default: {
          const unhandledType: never = chunkType;
          throw new Error(`Unhandled chunk type: ${unhandledType}`);
        }
      }
    },
  });
}
