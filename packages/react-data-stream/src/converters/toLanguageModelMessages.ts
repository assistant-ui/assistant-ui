import type {
  JSONValue,
  LanguageModelV2FilePart,
  LanguageModelV2Message,
  LanguageModelV2TextPart,
  LanguageModelV2ToolCallPart,
  LanguageModelV2ToolResultPart,
} from "@ai-sdk/provider";
import type { ThreadMessage } from "@assistant-ui/core";
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
      data: part.data,
      mediaType: part.mediaType,
      ...(part.filename && { filename: part.filename }),
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

  if (!includeId) {
    return toGenericMessages(messages as any).map(
      convertGenericToLanguageModel,
    );
  }

  const result: LanguageModelV2Message[] = [];

  for (const message of messages) {
    for (const generic of toGenericMessages([message] as any)) {
      const converted = convertGenericToLanguageModel(generic);
      if (generic.role !== "tool") {
        (converted as any).unstable_id = message.id;
      }
      result.push(converted);
    }
  }

  return result;
}
