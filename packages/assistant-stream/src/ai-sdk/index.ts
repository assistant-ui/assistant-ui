import type { TextStreamPart, CoreTool, ObjectStreamPart } from "ai";
import { AssistantStream, AssistantStreamChunk } from "../core/AssistantStream";
import { generateId } from "../core/utils/generateId";

export const fromAISDKStreamText = (
  stream: ReadableStream<TextStreamPart<Record<string, CoreTool>>>,
): AssistantStream => {
  const transformer = new TransformStream<
    TextStreamPart<Record<string, CoreTool>>,
    AssistantStreamChunk
  >({
    transform(chunk, controller) {
      const { type } = chunk;
      switch (type) {
        case "text-delta": {
          const { textDelta } = chunk;
          controller.enqueue({
            type: "text-delta",
            textDelta,
          });
          break;
        }
        case "tool-call-streaming-start": {
          const { toolCallId, toolName } = chunk;
          controller.enqueue({
            type: "tool-call-begin",
            toolCallId,
            toolName,
          });
          break;
        }
        case "tool-call-delta": {
          const { toolCallId, argsTextDelta } = chunk;
          controller.enqueue({
            type: "tool-call-delta",
            toolCallId,
            argsTextDelta,
          });
          break;
        }
        case "tool-result" as string: {
          const { toolCallId, result } = chunk as unknown as {
            toolCallId: string;
            result: unknown;
          };
          controller.enqueue({
            type: "tool-result",
            toolCallId,
            result,
          });
          break;
        }
        case "tool-call": {
          const { toolCallId, toolName, args } = chunk;
          controller.enqueue({
            type: "tool-call-begin",
            toolCallId,
            toolName,
          });
          controller.enqueue({
            type: "tool-call-delta",
            toolCallId,
            argsTextDelta: JSON.stringify(args),
          });
          break;
        }
        case "step-finish":
        case "error":
        case "finish": {
          break;
        }

        default: {
          const unhandledType: never = type;
          throw new Error(`Unhandled chunk type: ${unhandledType}`);
        }
      }
    },
  });

  return new AssistantStream(stream.pipeThrough(transformer));
};

export const fromAISDKStreamObject = (
  stream: ReadableStream<ObjectStreamPart<unknown>>,
  toolName: string,
): AssistantStream => {
  const toolCallId = generateId();
  const transformer = new TransformStream<
    ObjectStreamPart<unknown>,
    AssistantStreamChunk
  >({
    start(controller) {
      controller.enqueue({
        type: "tool-call-begin",
        toolName,
        toolCallId,
      });
    },
    transform(chunk, controller) {
      const { type } = chunk;
      switch (type) {
        case "text-delta": {
          const { textDelta } = chunk;
          controller.enqueue({
            type: "tool-call-delta",
            toolCallId,
            argsTextDelta: textDelta,
          });
          break;
        }
        case "finish": {
          controller.enqueue({
            type: "tool-result",
            toolCallId,
            result: "",
          });
          break;
        }

        case "object":
        case "error": {
          break;
        }

        default: {
          const unhandledType: never = type;
          throw new Error(`Unhandled chunk type: ${unhandledType}`);
        }
      }
    },
  });

  return new AssistantStream(stream.pipeThrough(transformer));
};
