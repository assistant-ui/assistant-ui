import { AssistantStreamChunk } from "../AssistantStream";
import { parsePartialJson } from "./partial-json/parse-partial-json";
import { AssistantMessage, ToolCallContentPart } from "../utils/types";

export const assistantMessageAccumulator = () => {
  let message: AssistantMessage = {
    role: "assistant",
    content: [],
    status: { type: "running" },
    metadata: {
      steps: [],
      custom: {},
    },
  };
  const transformer = new TransformStream<
    AssistantStreamChunk,
    AssistantMessage
  >({
    transform(chunk, controller) {
      const { type } = chunk;
      switch (type) {
        case "text-delta": {
          message = appendOrUpdateText(message, chunk.textDelta);
          controller.enqueue(message);
          break;
        }

        case "tool-call-begin": {
          const { toolCallId, toolName } = chunk;
          message = appendToolCall(message, toolCallId, toolName);
          controller.enqueue(message);
          break;
        }
        case "tool-call-delta": {
          const { toolCallId, argsTextDelta } = chunk;
          message = appendToolArgsTextDelta(message, toolCallId, argsTextDelta);
          controller.enqueue(message);
          break;
        }
        case "tool-result" as string: {
          const { toolCallId, result } = chunk as unknown as {
            toolCallId: string;
            result: unknown;
          };
          message = setToolResult(message, toolCallId, result);
          controller.enqueue(message);

          break;
        }
      }
    },
    flush(controller) {
      message = appendOrUpdateFinish(message);
      controller.enqueue(message);
    },
  });

  return transformer;
};

const appendOrUpdateText = (message: AssistantMessage, textDelta: string) => {
  let contentParts = message.content ?? [];
  let contentPart = message.content?.at(-1);
  if (contentPart?.type !== "text") {
    contentPart = {
      type: "text",
      text: textDelta,
      status: { type: "running" },
    };
  } else {
    contentParts = contentParts.slice(0, -1);
    contentPart = {
      type: "text",
      text: contentPart.text + textDelta,
      status: { type: "running" },
    };
  }
  return {
    ...message,
    content: contentParts.concat([contentPart]),
  };
};

const appendToolCall = (
  message: AssistantMessage,
  toolCallId: string,
  toolName: string,
): AssistantMessage => {
  return {
    ...message,
    content: [
      ...message.content,
      {
        type: "tool-call",
        toolCallId,
        toolName,
        argsText: "",
        args: {},
        status: { type: "running", isArgsComplete: false },
      },
    ],
  };
};

const appendToolArgsTextDelta = (
  message: AssistantMessage,
  toolCallId: string,
  argsTextDelta: string,
): AssistantMessage => {
  const contentPartIdx = message.content.findIndex(
    (part) => part.type === "tool-call" && part.toolCallId === toolCallId,
  );
  if (contentPartIdx === -1)
    throw new Error(
      `Received tool call delta for unknown tool call "${toolCallId}".`,
    );
  const contentPart = message.content[contentPartIdx]! as ToolCallContentPart;
  const newArgsText = contentPart.argsText + argsTextDelta;

  return {
    ...message,
    content: [
      ...message.content.slice(0, contentPartIdx),
      {
        ...contentPart,
        argsText: newArgsText,
        args: parsePartialJson(newArgsText),
      },
      ...message.content.slice(contentPartIdx + 1),
    ],
  };
};

const setToolResult = (
  message: AssistantMessage,
  toolCallId: string,
  result: any,
) => {
  let found = false;
  const newContentParts = message.content?.map((part) => {
    if (part.type !== "tool-call" || part.toolCallId !== toolCallId)
      return part;
    found = true;

    return {
      ...part,
      result,
    };
  });
  if (!found)
    throw new Error(
      `Received tool result for unknown tool call "${toolCallId}". This is likely an internal bug in assistant-ui.`,
    );

  return {
    ...message,
    content: newContentParts!,
  };
};

const appendOrUpdateFinish = (message: AssistantMessage): AssistantMessage => {
  return {
    ...message,
    status: {
      type: "complete",
      reason: "unknown",
    },
  };
};
