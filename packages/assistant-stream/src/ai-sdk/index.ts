import type { TextStreamPart, ObjectStreamPart, Tool } from "ai";
import { AssistantStream } from "../core/AssistantStream";
import { AssistantTransformStream } from "../core/utils/stream/AssistantTransformStream";
import { ToolCallStreamController } from "../core/modules/tool-call";
import { ReadonlyJSONValue } from "../core/utils/json/json-value";

export const fromStreamText = (
  stream: ReadableStream<TextStreamPart<Record<string, Tool>>>,
): AssistantStream => {
  const toolControllers = new Map<string, ToolCallStreamController>();
  let currentToolCallArgsText: ToolCallStreamController | undefined;

  const endCurrentToolCallArgsText = () => {
    if (!currentToolCallArgsText) return;
    currentToolCallArgsText.argsText.close();
    currentToolCallArgsText = undefined;
  };

  const transformer = new AssistantTransformStream<
    TextStreamPart<Record<string, Tool>>
  >({
    transform(chunk, controller) {
      const { type } = chunk;

      if (
        type !== "tool-call-delta" &&
        type !== "tool-call" &&
        type !== "error" &&
        (type as string) !== "tool-result"
      ) {
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
          currentToolCallArgsText = controller.addToolCallPart({
            toolCallId,
            toolName,
          });
          toolControllers.set(toolCallId, currentToolCallArgsText);
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
            result: ReadonlyJSONValue;
          };
          const toolController = toolControllers.get(toolCallId);
          if (!toolController) throw new Error("Tool call not found");
          toolController.setResponse({
            result,
          });
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
          break;
        }

        case "source":
          controller.appendSource({
            type: "source",
            ...chunk.source,
          });
          break;

        case "file":
          controller.appendFile({
            type: "file",
            mimeType: chunk.mimeType,
            data: chunk.base64,
          });
          break;

        case "reasoning-signature":
        case "redacted-reasoning":
          // ignore these for now
          break;

        default: {
          const unhandledType: never = type;
          throw new Error(`Unhandled chunk type: ${unhandledType}`);
        }
      }
    },
    flush() {
      for (const toolController of toolControllers.values()) {
        toolController.close();
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
          toolCall.setResponse({
            result: "{}",
          });
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
