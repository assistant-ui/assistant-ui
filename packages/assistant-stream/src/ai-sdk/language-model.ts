import type { LanguageModelV1StreamPart } from "ai";
import { AssistantTransformStream } from "../core/utils/stream/AssistantTransformStream";
import { ToolCallStreamController } from "../core/modules/tool-call";

function bufferToBase64(buffer: Uint8Array) {
  return btoa(String.fromCharCode(...buffer));
}

export class LanguageModelV1StreamDecoder extends AssistantTransformStream<LanguageModelV1StreamPart> {
  constructor() {
    let currentToolCall:
      | { toolCallId: string; controller: ToolCallStreamController }
      | undefined;

    const endCurrentToolCall = () => {
      if (!currentToolCall) return;
      currentToolCall.controller.argsText.close();
      currentToolCall.controller.close();
      currentToolCall = undefined;
    };

    super({
      transform(chunk, controller) {
        const { type } = chunk;
        if (
          type === "text-delta" ||
          type === "reasoning" ||
          type === "tool-call"
        ) {
          endCurrentToolCall();
        }

        switch (type) {
          case "text-delta": {
            controller.appendText(chunk.textDelta);
            break;
          }
          case "reasoning": {
            controller.appendReasoning(chunk.textDelta);
            break;
          }

          case "source": {
            controller.appendSource({
              type: "source",
              ...chunk.source,
            });
            break;
          }

          case "file": {
            controller.appendFile({
              type: "file",
              mimeType: chunk.mimeType,
              data:
                typeof chunk.data === "string"
                  ? chunk.data
                  : bufferToBase64(chunk.data),
            });
            break;
          }

          case "tool-call-delta": {
            const { toolCallId, toolName, argsTextDelta } = chunk;
            if (currentToolCall?.toolCallId === toolCallId) {
              currentToolCall.controller.argsText.append(argsTextDelta);
            } else {
              endCurrentToolCall();
              currentToolCall = {
                toolCallId,
                controller: controller.addToolCallPart({
                  toolCallId,
                  toolName,
                }),
              };
              currentToolCall.controller.argsText.append(argsTextDelta);
            }

            break;
          }

          case "tool-call": {
            const { toolCallId, toolName, args } = chunk;
            const toolController = controller.addToolCallPart({
              toolCallId,
              toolName,
              argsText: args,
            });
            toolController.close();
            break;
          }
          case "finish": {
            controller.enqueue({
              type: "message-finish",
              finishReason: chunk.finishReason,
              usage: chunk.usage,
              path: [],
            });
            controller.close();
            break;
          }

          case "error":
          case "response-metadata":
          case "reasoning-signature":
          case "redacted-reasoning":
            break;

          default: {
            const unhandledType: never = type;
            throw new Error(`Unhandled chunk type: ${unhandledType}`);
          }
        }
      },
      flush() {
        endCurrentToolCall();
      },
    });
  }
}
