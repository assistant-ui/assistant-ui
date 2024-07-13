import {
  AssistantStreamChunkTuple,
  AssistantStreamChunkType,
} from "./AssistantStreamChunkType";
import { ToolResultStreamPart } from "./toolResultStream";

export function assistantEncoderStream() {
  const toolCalls = new Set<string>();
  return new TransformStream<ToolResultStreamPart, string>({
    transform(chunk, controller) {
      const chunkType = chunk.type;
      switch (chunkType) {
        case "text-delta": {
          controller.enqueue(
            formatStreamPart(
              AssistantStreamChunkType.TextDelta,
              chunk.textDelta,
            ),
          );
          break;
        }
        case "tool-call-delta": {
          if (!toolCalls.has(chunk.toolCallId)) {
            toolCalls.add(chunk.toolCallId);
            controller.enqueue(
              formatStreamPart(AssistantStreamChunkType.ToolCallBegin, {
                id: chunk.toolCallId,
                name: chunk.toolName,
              }),
            );
          }

          controller.enqueue(
            formatStreamPart(
              AssistantStreamChunkType.ToolCallArgsTextDelta,
              chunk.argsTextDelta,
            ),
          );
          break;
        }

        // ignore
        case "tool-call":
          break;

        case "tool-result": {
          controller.enqueue(
            formatStreamPart(AssistantStreamChunkType.ToolCallResult, {
              id: chunk.toolCallId,
              result: chunk.result,
            }),
          );
          break;
        }

        case "finish": {
          const { type, ...rest } = chunk;
          controller.enqueue(
            formatStreamPart(AssistantStreamChunkType.Finish, rest),
          );
          break;
        }

        case "error": {
          controller.enqueue(
            formatStreamPart(AssistantStreamChunkType.Error, chunk.error),
          );
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

export function formatStreamPart(
  ...[code, value]: AssistantStreamChunkTuple
): string {
  return `${code}:${JSON.stringify(value)}\n`;
}
