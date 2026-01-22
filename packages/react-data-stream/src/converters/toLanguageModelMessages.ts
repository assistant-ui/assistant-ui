import type {
  JSONValue,
  LanguageModelV2FilePart,
  LanguageModelV2Message,
  LanguageModelV2TextPart,
  LanguageModelV2ToolCallPart,
  LanguageModelV2ToolResultPart,
} from "@ai-sdk/provider";
import type { ThreadMessage } from "@assistant-ui/react";
import {
  toGenericMessages,
  type GenericMessage,
  type GenericTextPart,
  type GenericToolCallPart,
  type GenericToolResultPart,
} from "assistant-stream";

function convertUserContent(
  content: GenericMessage & { role: "user" },
): (LanguageModelV2TextPart | LanguageModelV2FilePart)[] {
  return content.content.map((part) => {
    if (part.type === "text") {
      return part;
    }
    return {
      type: "file",
      data: typeof part.data === "string" ? new URL(part.data) : part.data,
      mediaType: part.mediaType,
    };
  });
}

function convertAssistantContent(
  content: (GenericTextPart | GenericToolCallPart)[],
): (LanguageModelV2TextPart | LanguageModelV2ToolCallPart)[] {
  return content.map((part) => {
    if (part.type === "text") {
      return part;
    }
    return {
      type: "tool-call",
      toolCallId: part.toolCallId,
      toolName: part.toolName,
      input: part.args,
    };
  });
}

function convertToolContent(
  content: GenericToolResultPart[],
): LanguageModelV2ToolResultPart[] {
  return content.map((part) => ({
    type: "tool-result",
    toolCallId: part.toolCallId,
    toolName: part.toolName,
    output: part.isError
      ? { type: "error-json", value: part.result as JSONValue }
      : { type: "json", value: part.result as JSONValue },
  }));
}

function convertGenericToLanguageModel(
  generic: GenericMessage,
): LanguageModelV2Message {
  switch (generic.role) {
    case "system":
      return { role: "system", content: generic.content };
    case "user":
      return { role: "user", content: convertUserContent(generic) };
    case "assistant":
      return {
        role: "assistant",
        content: convertAssistantContent(generic.content),
      };
    case "tool":
      return { role: "tool", content: convertToolContent(generic.content) };
  }
}

/**
 * @deprecated Use `toGenericMessages` from `assistant-stream` for framework-agnostic conversion.
 * This function is kept for AI SDK compatibility.
 */
export function toLanguageModelMessages(
  messages: readonly ThreadMessage[],
  options: { unstable_includeId?: boolean | undefined } = {},
): LanguageModelV2Message[] {
  const includeId = options.unstable_includeId ?? false;
  const genericMessages = toGenericMessages(messages as any);

  if (!includeId) {
    return genericMessages.map(convertGenericToLanguageModel);
  }

  // When includeId is true, we need to map back to original message IDs
  const result: LanguageModelV2Message[] = [];
  let messageIndex = 0;

  for (const generic of genericMessages) {
    const converted = convertGenericToLanguageModel(generic);

    // Find the corresponding original message for ID
    while (
      messageIndex < messages.length &&
      messages[messageIndex]!.role !== generic.role
    ) {
      messageIndex++;
    }

    if (messageIndex < messages.length) {
      (converted as any).unstable_id = messages[messageIndex]!.id;
    }

    result.push(converted);

    // Tool messages don't advance the original message index
    if (generic.role !== "tool") {
      messageIndex++;
    }
  }

  return result;
}
