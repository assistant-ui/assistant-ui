import { LanguageModelV1StreamPart } from "ai";
import { AssistantTransformStream } from "../core/utils/stream/AssistantTransformStream";
import { ToolCallStreamController } from "../core/modules/tool-call";

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
        if (type !== "tool-call-delta" && type !== "error") {
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
            });
            toolController.argsText.append(JSON.stringify(args));
            toolController.argsText.close();
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
            break;

          default: {
            const unhandledType: never = type;
            throw new Error(`Unhandled chunk type: ${unhandledType}`);
          }
        }
      },
    });
  }
}
