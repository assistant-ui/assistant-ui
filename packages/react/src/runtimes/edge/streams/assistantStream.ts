import { LanguageModelV1StreamPart } from "@ai-sdk/provider";
import { AssistantStreamPart } from "./AssistantStreamPart";

export function assistantStream() {
  return new TransformStream<LanguageModelV1StreamPart, AssistantStreamPart>({
    transform(chunk, controller) {
      const chunkType = chunk.type;

      switch (chunkType) {
        // forward
        case "text-delta":
        case "error": {
          controller.enqueue(chunk);
          break;
        }

        case "tool-call-delta": {
          const { toolCallType, ...rest } = chunk;
          controller.enqueue(rest);
          break;
        }

        // ignore
        case "finish":
        case "tool-call": {
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
