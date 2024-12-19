import { ChatModelRunResult } from "../../local/ChatModelAdapter";
import { parsePartialJson } from "../partial-json/parse-partial-json";
import { LanguageModelV1StreamPart } from "@ai-sdk/provider";
import { ToolResultStreamPart } from "./toolResultStream";
import { MessageStatus, ToolCallContentPart } from "../../../types";

export function runResultStream() {
  let message: ChatModelRunResult = {
    content: [],
    status: { type: "running" },
  };

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

          message = appendOrUpdateToolCall(
            message,
            toolCallId,
            toolName,
            argsTextDelta,
          );
          controller.enqueue(message);
          break;
        }

        case "tool-call":
        case "response-metadata":
          break;

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
        case "step-finish": {
          message = appendOrUpdateStepFinish(message, chunk);
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
    flush(controller) {
      if (message.status?.type === "running") {
        const requiresAction = message.content?.at(-1)?.type === "tool-call";
        message = appendOrUpdateFinish(message, {
          type: "finish",
          finishReason: requiresAction ? "tool-calls" : "unknown",
          usage: {
            promptTokens: 0,
            completionTokens: 0,
          },
        });
        controller.enqueue(message);
      }
    },
  });
}

const appendOrUpdateText = (message: ChatModelRunResult, textDelta: string) => {
  let contentParts = message.content ?? [];
  let contentPart = message.content?.at(-1);
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
  argsTextDelta: string,
): ChatModelRunResult => {
  let contentParts = message.content ?? [];
  const contentPartIdx = contentParts.findIndex(
    (c) => c.type === "tool-call" && c.toolCallId === toolCallId,
  );
  let contentPart =
    contentPartIdx === -1
      ? null
      : (contentParts[contentPartIdx] as ToolCallContentPart);

  if (contentPart == null) {
    contentPart = {
      type: "tool-call",
      toolCallId,
      toolName,
      argsText: argsTextDelta,
      args: parsePartialJson(argsTextDelta),
    };
    contentParts = [...contentParts, contentPart];
  } else {
    const argsText = contentPart.argsText + argsTextDelta;
    contentPart = {
      ...contentPart,
      argsText,
      args: parsePartialJson(argsText),
    };
    contentParts = [
      ...contentParts.slice(0, contentPartIdx),
      contentPart,
      ...contentParts.slice(contentPartIdx + 1),
    ];
  }

  return {
    ...message,
    content: contentParts,
  };
};

const appendOrUpdateToolResult = (
  message: ChatModelRunResult,
  toolCallId: string,
  toolName: string,
  result: any,
) => {
  let found = false;
  const newContentParts = message.content?.map((part) => {
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
    content: newContentParts!,
  };
};

const appendOrUpdateStepFinish = (
  message: ChatModelRunResult,
  chunk: ToolResultStreamPart & { type: "step-finish" },
): ChatModelRunResult => {
  const { type, ...rest } = chunk;
  const steps = [
    ...(message.metadata?.steps ?? []),
    {
      usage: rest.usage,
    },
  ];
  return {
    ...message,
    metadata: {
      ...message.metadata,
      steps,
    },
  };
};

const appendOrUpdateFinish = (
  message: ChatModelRunResult,
  chunk: LanguageModelV1StreamPart & { type: "finish" },
): ChatModelRunResult => {
  const { type, ...rest } = chunk;

  const steps = [
    ...(message.metadata?.steps ?? []),
    {
      logprobs: rest.logprobs,
      usage: rest.usage,
    },
  ];
  return {
    ...message,
    status: getStatus(chunk),
    metadata: {
      ...message.metadata,
      steps,
    },
  };
};

const getStatus = (
  chunk:
    | (LanguageModelV1StreamPart & { type: "finish" })
    | (ToolResultStreamPart & { type: "step-finish" }),
): MessageStatus => {
  if (chunk.finishReason === "tool-calls") {
    return {
      type: "requires-action",
      reason: "tool-calls",
    };
  } else if (
    chunk.finishReason === "stop" ||
    chunk.finishReason === "unknown"
  ) {
    return {
      type: "complete",
      reason: chunk.finishReason,
    };
  } else {
    return {
      type: "incomplete",
      reason: chunk.finishReason,
    };
  }
};

const appendOrUpdateCancel = (
  message: ChatModelRunResult,
): ChatModelRunResult => {
  return {
    ...message,
    status: {
      type: "incomplete",
      reason: "cancelled",
    },
  };
};
