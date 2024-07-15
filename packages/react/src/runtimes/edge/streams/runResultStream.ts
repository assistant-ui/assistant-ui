import { ChatModelRunResult } from "../../local/ChatModelAdapter";
import { parsePartialJson } from "../partial-json/parse-partial-json";
import { LanguageModelV1StreamPart } from "@ai-sdk/provider";
import { ToolResultStreamPart } from "./toolResultStream";
import { MessageStatus, ThreadAssistantContentPart } from "../../../types";

export function runResultStream(initialContent: ThreadAssistantContentPart[]) {
  let message: ChatModelRunResult = {
    content: initialContent,
  };
  const currentToolCall = { toolCallId: "", argsText: "" };

  return new TransformStream<ToolResultStreamPart, ChatModelRunResult>({
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
            currentToolCall.argsText,
          );
          controller.enqueue(message);
          break;
        }
        case "tool-call": {
          break;
        }
        case "tool-result": {
          message = appendOrUpdateToolResult(
            message,
            chunk.toolCallId,
            chunk.toolName,
            chunk.result,
          );
          controller.enqueue(message);
          break;
        }
        case "finish": {
          message = appendOrUpdateFinish(message, chunk);
          controller.enqueue(message);
          break;
        }
        case "error": {
          if (
            chunk.error instanceof Error &&
            chunk.error.name === "AbortError"
          ) {
            message = appendOrUpdateCancel(message);
            controller.enqueue(message);
            break;
          } else {
            throw chunk.error;
          }
        }
        default: {
          const unhandledType: never = chunkType;
          throw new Error(`Unhandled chunk type: ${unhandledType}`);
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
  argsText: string,
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
      argsText,
      args: parsePartialJson(argsText),
    };
  } else {
    contentParts = contentParts.slice(0, -1);
    contentPart = {
      ...contentPart,
      argsText,
      args: parsePartialJson(argsText),
    };
  }
  return {
    ...message,
    content: contentParts.concat([contentPart]),
  };
};

const appendOrUpdateToolResult = (
  message: ChatModelRunResult,
  toolCallId: string,
  toolName: string,
  result: any,
) => {
  let found = false;
  const newContentParts = message.content.map((part) => {
    if (part.type !== "tool-call" || part.toolCallId !== toolCallId)
      return part;
    found = true;

    if (part.toolName !== toolName)
      throw new Error(
        `Tool call ${toolCallId} found with tool name ${part.toolName}, but expected ${toolName}`,
      );

    return {
      ...part,
      result,
    };
  });
  if (!found)
    throw new Error(
      `Received tool result for unknown tool call "${toolName}" / "${toolCallId}". This is likely an internal bug in assistant-ui.`,
    );

  return {
    ...message,
    content: newContentParts,
  };
};

const appendOrUpdateFinish = (
  message: ChatModelRunResult,
  chunk: LanguageModelV1StreamPart & { type: "finish" },
): ChatModelRunResult => {
  const { type, ...rest } = chunk;
  return {
    ...message,
    status: {
      type:
        rest.finishReason === "stop" || rest.finishReason === "unknown"
          ? "complete"
          : "incomplete",
      ...rest,
      ...(rest.finishReason === "error"
        ? { error: new Error("Unknown error") }
        : undefined),
    } as MessageStatus,
  };
};

const appendOrUpdateCancel = (
  message: ChatModelRunResult,
): ChatModelRunResult => {
  return {
    ...message,
    status: {
      type: "incomplete",
      finishReason: "cancelled",
    },
  };
};
