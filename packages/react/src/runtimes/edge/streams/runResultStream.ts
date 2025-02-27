import { CoreChatModelRunResult } from "../../local/ChatModelAdapter";
import { AssistantMessage as AssistantStreamMessage } from "assistant-stream";

export function runResultStream() {
  return new TransformStream<AssistantStreamMessage, CoreChatModelRunResult>({
    transform(chunk, controller) {
      controller.enqueue({
        ...chunk,
        content: chunk.parts,
      });
    },
  });
}
