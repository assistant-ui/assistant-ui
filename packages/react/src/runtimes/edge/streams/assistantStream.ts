import { LanguageModelV1StreamPart } from "@ai-sdk/provider";
import { AssistantStreamPart } from "./AssistantStreamPart";

export function assistantStream() {
  return new TransformStream<LanguageModelV1StreamPart, AssistantStreamPart>({
    transform(chunk, controller) {
      const chunkType = chunk.type;

      switch (chunkType) {
        // forward
        case "text-delta":
        case "error":
        case "tool-call-delta":
        case "finish": {
          controller.enqueue(chunk);
          break;
        }

        // ignore
        case "tool-call": {
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
