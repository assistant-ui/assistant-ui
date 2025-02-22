import { type TextStreamPart, type ObjectStreamPart, type Tool } from "ai";
import { AssistantStream } from "../core/AssistantStream";
import { AssistantTransformStream } from "../core/utils/stream/AssistantTransformStream";
import { ToolCallStreamController } from "../core/modules/tool-call";

export const fromStreamText = (
  stream: ReadableStream<TextStreamPart<Record<string, Tool>>>,
): AssistantStream => {
  const toolControllers = new Map<string, ToolCallStreamController>();
  let currentToolCallArgsText:
    | { toolCallId: string; controller: ToolCallStreamController }
    | undefined;

  const endCurrentToolCallArgsText = () => {
    if (!currentToolCallArgsText) return;
    currentToolCallArgsText.controller.argsText.close();
    currentToolCallArgsText = undefined;
  };

  const transformer = new AssistantTransformStream<
    TextStreamPart<Record<string, Tool>>
  >({
    transform(chunk, controller) {
      const { type } = chunk;

      if (type !== "tool-call-delta" && type !== "error") {
        endCurrentToolCallArgsText();
      }

      switch (type) {
        case "text-delta": {
          const { textDelta } = chunk;
          controller.appendText(textDelta);
          break;
        }
        case "reasoning": {
          const { textDelta } = chunk;
          controller.appendReasoning(textDelta);
          break;
        }
        case "tool-call-streaming-start": {
          const { toolCallId, toolName } = chunk;
          toolControllers.set(
            toolCallId,
            controller.addToolCallPart({
              toolCallId,
              toolName,
            }),
          );
          currentToolCallArgsText = {
            toolCallId,
            controller: controller.addToolCallPart({
              toolCallId,
              toolName,
            }),
          };
          break;
        }
        case "tool-call-delta": {
          const { toolCallId, argsTextDelta } = chunk;
          const toolController = toolControllers.get(toolCallId);
          if (!toolController) throw new Error("Tool call not found");
          toolController.argsText.append(argsTextDelta);
          break;
        }
        case "tool-result" as string: {
          const { toolCallId, result } = chunk as unknown as {
            toolCallId: string;
            result: unknown;
          };
          const toolController = toolControllers.get(toolCallId);
          if (!toolController) throw new Error("Tool call not found");
          toolController.setResult(result);
          toolController.close();
          toolControllers.delete(toolCallId);
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
          toolControllers.set(toolCallId, toolController);
          break;
        }

        case "step-start":
          controller.enqueue({
            type: "step-start",
            path: [],
            messageId: chunk.messageId,
          });
          break;
        case "step-finish":
          controller.enqueue({
            type: "step-finish",
            path: [],
            finishReason: chunk.finishReason,
            usage: chunk.usage,
            isContinued: chunk.isContinued,
          });
          break;
        case "error":
          controller.enqueue({
            type: "error",
            path: [],
            error: String(chunk.error),
          });
          break;

        case "finish": {
          controller.enqueue({
            type: "message-finish",
            path: [],
            finishReason: chunk.finishReason,
            usage: chunk.usage,
          });
          controller.close();
          break;
        }

        default: {
          const unhandledType: never = type;
          throw new Error(`Unhandled chunk type: ${unhandledType}`);
        }
      }
    },
    flush() {
      for (const controller of toolControllers.values()) {
        controller.close();
      }
      toolControllers.clear();
    },
  });

  return stream.pipeThrough(transformer);
};

export const fromStreamObject = (
  stream: ReadableStream<ObjectStreamPart<unknown>>,
  toolName: string,
): AssistantStream => {
  let toolCall!: ToolCallStreamController;
  const transformer = new AssistantTransformStream<ObjectStreamPart<unknown>>({
    start(controller) {
      toolCall = controller.addToolCallPart(toolName);
    },
    transform(chunk, controller) {
      const { type } = chunk;
      switch (type) {
        case "text-delta": {
          const { textDelta } = chunk;
          toolCall.argsText.append(textDelta);
          break;
        }
        case "finish": {
          toolCall.argsText.close();
          toolCall.setResult("");
          break;
        }

        case "object":
          break;

        case "error": {
          controller.enqueue({
            type: "error",
            path: [],
            error: String(chunk.error),
          });
          break;
        }

        default: {
          const unhandledType: never = type;
          throw new Error(`Unhandled chunk type: ${unhandledType}`);
        }
      }
    },
  });

  return stream.pipeThrough(transformer);
};
