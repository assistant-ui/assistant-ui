import { AssistantStreamPart } from "./AssistantStreamPart";
import { AssistantStreamChunkType } from "./AssistantStreamChunkType";

export function assistantEncoderStream() {
  const toolCalls = new Set<string>();
  return new TransformStream<AssistantStreamPart, string>({
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
        case "error": {
          controller.enqueue(
            formatStreamPart(
              AssistantStreamChunkType.Error,
              JSON.stringify(chunk.error),
            ),
          );
          break;
        }
        default: {
          const _exhaustiveCheck: never = chunkType;
          throw new Error(`Unhandled chunk type: ${_exhaustiveCheck}`);
        }
      }
    },
  });
}

export function formatStreamPart(
  code: AssistantStreamChunkType,
  value: any,
): string {
  return `${code}:${JSON.stringify(value)}\n`;
}
