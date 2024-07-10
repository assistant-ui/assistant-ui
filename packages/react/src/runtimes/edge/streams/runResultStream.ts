import { AssistantStreamPart } from "./AssistantStreamPart";
import { ChatModelRunResult } from "../../local/ChatModelAdapter";

export function runResultStream() {
  let message: ChatModelRunResult = {
    content: [],
  };
  const currentToolCall = { toolCallId: "", argsText: "" };

  return new TransformStream<AssistantStreamPart, ChatModelRunResult>({
    transform(chunk, controller) {
      const chunkType = chunk.type;
      switch (chunkType) {
        case "text-delta": {
          message = appendOrUpdateText(message, chunk.textDelta);
          controller.enqueue(message);
          break;
        }
        case "tool-call-delta": {
          const { toolCallId, toolName, argsTextDelta } = chunk;
          if (currentToolCall.toolCallId !== toolCallId) {
            currentToolCall.toolCallId = toolCallId;
            currentToolCall.argsText = argsTextDelta;
          } else {
            currentToolCall.argsText += argsTextDelta;
          }

          message = appendOrUpdateToolCall(
            message,
            toolCallId,
            toolName,
            JSON.parse(currentToolCall.argsText),
          );
          controller.enqueue(message);
          break;
        }
        case "error": {
          throw chunk.error;
        }
        default: {
          const _exhaustiveCheck: never = chunkType;
          throw new Error(`Unhandled chunk type: ${_exhaustiveCheck}`);
        }
      }
    },
  });
}

const appendOrUpdateText = (message: ChatModelRunResult, textDelta: string) => {
  let contentParts = message.content;
  let contentPart = message.content.at(-1);
  if (contentPart?.type !== "text") {
    contentPart = { type: "text", text: textDelta };
  } else {
    contentParts = contentParts.slice(0, -1);
    contentPart = { type: "text", text: contentPart.text + textDelta };
  }
  return {
    ...message,
    content: contentParts.concat([contentPart]),
  };
};

const appendOrUpdateToolCall = (
  message: ChatModelRunResult,
  toolCallId: string,
  toolName: string,
  args: unknown,
) => {
  let contentParts = message.content;
  let contentPart = message.content.at(-1);
  if (
    contentPart?.type !== "tool-call" ||
    contentPart.toolCallId !== toolCallId
  ) {
    contentPart = {
      type: "tool-call",
      toolCallId,
      toolName,
      args,
    };
  } else {
    contentParts = contentParts.slice(0, -1);
    contentPart = {
      ...contentPart,
      args,
    };
  }
  return {
    ...message,
    content: contentParts.concat([contentPart]),
  };
};
