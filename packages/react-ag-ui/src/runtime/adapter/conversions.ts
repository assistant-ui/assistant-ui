"use client";

import { type Tool, toToolsJSONSchema } from "assistant-stream";

type ThreadMessageLike = {
  id: string;
  role: string;
  content: unknown;
  name?: string;
  toolCallId?: string;
  error?: string;
};

type AgUiToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type AgUiMessage =
  | {
      id: string;
      role: string;
      content: string;
      name?: string;
      toolCalls?: AgUiToolCall[];
    }
  | {
      id: string;
      role: "tool";
      content: string;
      toolCallId: string;
      error?: string;
    };

type ToolCallPart = {
  type: "tool-call";
  toolCallId?: string;
  toolName?: string;
  argsText?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  isError?: boolean;
};

function generateId(): string {
  return (
    (globalThis.crypto as { randomUUID?: () => string })?.randomUUID?.() ??
    Math.random().toString(36).slice(2)
  );
}

function normalizeToolCall(part: ToolCallPart): {
  id: string;
  call: AgUiToolCall;
} {
  const id = part.toolCallId ?? generateId();
  const argsText =
    typeof part.argsText === "string"
      ? part.argsText
      : JSON.stringify(part.args ?? {});

  return {
    id,
    call: {
      id,
      type: "function",
      function: {
        name: part.toolName ?? "tool",
        arguments: argsText,
      },
    },
  };
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter(
      (part): part is { type: "text"; text: string } =>
        part?.type === "text" && typeof part?.text === "string",
    )
    .map((part) => part.text)
    .join("\n");
}

function convertAssistantMessage(
  message: ThreadMessageLike,
  converted: AgUiMessage[],
): void {
  const content = extractText(message.content);
  const contentArray = Array.isArray(message.content) ? message.content : [];

  const toolCallParts = contentArray.filter(
    (part): part is ToolCallPart => part?.type === "tool-call",
  );

  const toolCalls = toolCallParts.map((part) => ({
    ...normalizeToolCall(part),
    part,
  }));

  const assistantMessage: AgUiMessage = {
    id: message.id,
    role: "assistant",
    content,
  };
  if (message.name) {
    assistantMessage.name = message.name;
  }
  if (toolCalls.length > 0) {
    assistantMessage.toolCalls = toolCalls.map((entry) => entry.call);
  }
  converted.push(assistantMessage);

  for (const { id: toolCallId, part } of toolCalls) {
    if (part.result === undefined) continue;

    const resultContent =
      typeof part.result === "string"
        ? part.result
        : JSON.stringify(part.result);

    const toolMessage: AgUiMessage = {
      id: `${toolCallId}:tool`,
      role: "tool",
      content: resultContent,
      toolCallId,
    };
    if (part.isError) {
      toolMessage.error = resultContent;
    }
    converted.push(toolMessage);
  }
}

function convertToolMessage(
  message: ThreadMessageLike,
  converted: AgUiMessage[],
): void {
  const content = extractText(message.content);
  const toolCallId = message.toolCallId ?? generateId();

  const toolMessage: AgUiMessage = {
    id: message.id,
    role: "tool",
    content,
    toolCallId,
  };
  if (typeof message.error === "string") {
    toolMessage.error = message.error;
  }
  converted.push(toolMessage);
}

export function toAgUiMessages(
  messages: readonly ThreadMessageLike[],
): AgUiMessage[] {
  const converted: AgUiMessage[] = [];

  for (const message of messages) {
    if (message.role === "assistant") {
      convertAssistantMessage(message, converted);
      continue;
    }

    if (message.role === "tool") {
      convertToolMessage(message, converted);
      continue;
    }

    const genericMessage: AgUiMessage = {
      id: message.id,
      role: message.role,
      content: extractText(message.content),
    };
    if (message.name) {
      genericMessage.name = message.name;
    }
    converted.push(genericMessage);
  }

  return converted;
}

type AgUiTool = {
  name: string;
  description: string | undefined;
  parameters: unknown;
};

export function toAgUiTools(
  tools: Record<string, Tool> | undefined,
): AgUiTool[] {
  if (!tools) return [];

  const toolsSchema = toToolsJSONSchema(tools);
  return Object.entries(toolsSchema).map(([name, tool]) => ({
    name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}
