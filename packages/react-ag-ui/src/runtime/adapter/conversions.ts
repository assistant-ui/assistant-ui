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
  unstable_toolMessageId?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
};

const getToolCallId = (record: Record<string, unknown>) =>
  getString(record, "toolCallId") ?? getString(record, "tool_call_id");

function parseJSONText(value: string): unknown {
  if (!value) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

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

function toToolCallPart(value: unknown): ToolCallPart | null {
  if (!isObject(value)) return null;
  const rawFunction = isObject(value["function"]) ? value["function"] : null;
  const toolCallId = getString(value, "toolCallId") ?? getString(value, "id");
  const toolName =
    getString(value, "toolName") ??
    getString(value, "name") ??
    (rawFunction ? getString(rawFunction, "name") : undefined) ??
    "tool";
  const argsText =
    getString(value, "argsText") ??
    getString(value, "arguments") ??
    (rawFunction ? getString(rawFunction, "arguments") : undefined);

  const parsedArgs =
    typeof argsText === "string" ? parseJSONText(argsText) : undefined;
  const args =
    isObject(parsedArgs) && !Array.isArray(parsedArgs)
      ? (parsedArgs as Record<string, unknown>)
      : isObject(value["args"]) && !Array.isArray(value["args"])
        ? (value["args"] as Record<string, unknown>)
        : undefined;

  const part: ToolCallPart = {
    type: "tool-call",
    ...(toolCallId !== undefined ? { toolCallId } : {}),
    toolName,
    argsText: argsText ?? JSON.stringify(args ?? {}),
    ...(args !== undefined ? { args } : {}),
  };

  if (value["type"] === "tool-call") {
    const result = value["result"];
    const isError = value["isError"];
    if (result !== undefined) part.result = result;
    if (typeof isError === "boolean") part.isError = isError;
  }

  return part;
}

function extractAssistantToolCalls(
  message: Record<string, unknown>,
): ToolCallPart[] {
  const parts: ToolCallPart[] = [];
  const seenToolCallIds = new Set<string>();
  const pushPart = (part: ToolCallPart | null) => {
    if (!part) return;
    const id = part.toolCallId ?? generateId();
    if (seenToolCallIds.has(id)) return;
    seenToolCallIds.add(id);
    parts.push({
      ...part,
      toolCallId: id,
    });
  };

  const content = message["content"];
  if (Array.isArray(content)) {
    for (const part of content) {
      if (isObject(part) && part["type"] === "tool-call") {
        pushPart(toToolCallPart(part));
      }
    }
  }

  const toolCalls = Array.isArray(message["toolCalls"])
    ? message["toolCalls"]
    : Array.isArray(message["tool_calls"])
      ? message["tool_calls"]
      : [];
  for (const call of toolCalls) {
    pushPart(toToolCallPart(call));
  }

  return parts;
}

function toAssistantSnapshotMessage(
  rawMessage: Record<string, unknown>,
): ThreadMessageLike {
  const text = extractText(rawMessage["content"]);
  const toolCallParts = extractAssistantToolCalls(rawMessage);
  const assistantContent = [
    ...(text.length > 0 ? [{ type: "text" as const, text }] : []),
    ...toolCallParts,
  ];
  const messageName = getString(rawMessage, "name");
  return {
    id: getString(rawMessage, "id") ?? generateId(),
    role: "assistant",
    content: assistantContent.length > 0 ? assistantContent : "",
    ...(messageName !== undefined ? { name: messageName } : {}),
  };
}

function toUserOrSystemSnapshotMessage(
  role: "user" | "system",
  rawMessage: Record<string, unknown>,
): ThreadMessageLike {
  const messageName = getString(rawMessage, "name");
  return {
    id: getString(rawMessage, "id") ?? generateId(),
    role,
    content: extractText(rawMessage["content"]),
    ...(messageName !== undefined ? { name: messageName } : {}),
  };
}

export function fromAgUiMessages(
  messages: readonly unknown[],
): ThreadMessageLike[] {
  const converted: ThreadMessageLike[] = [];

  for (const rawMessage of messages) {
    if (!isObject(rawMessage)) continue;
    const role = getString(rawMessage, "role");
    if (!role) continue;

    if (role === "tool") {
      const toolCallId = getToolCallId(rawMessage) ?? `tool-${generateId()}`;
      const toolMessageId = getString(rawMessage, "id");
      const result =
        rawMessage["result"] !== undefined
          ? rawMessage["result"]
          : typeof rawMessage["content"] === "string"
            ? parseJSONText(rawMessage["content"])
            : rawMessage["content"];
      const isError =
        typeof rawMessage["error"] === "string" ||
        rawMessage["isError"] === true ||
        rawMessage["status"] === "error"
          ? true
          : rawMessage["isError"] === false
            ? false
            : undefined;

      let updated = false;
      for (
        let messageIndex = converted.length - 1;
        messageIndex >= 0 && !updated;
        messageIndex--
      ) {
        const message = converted[messageIndex];
        if (
          !message ||
          message.role !== "assistant" ||
          !Array.isArray(message.content)
        )
          continue;

        for (
          let partIndex = message.content.length - 1;
          partIndex >= 0;
          partIndex--
        ) {
          const part = message.content[partIndex];
          if (!isObject(part) || part["type"] !== "tool-call") continue;
          if (getString(part, "toolCallId") !== toolCallId) continue;

          const updatedPart: ToolCallPart = {
            ...(part as ToolCallPart),
            result,
            ...(isError !== undefined ? { isError } : {}),
            ...(toolMessageId !== undefined
              ? { unstable_toolMessageId: toolMessageId }
              : {}),
          };
          const updatedContent = message.content.map((contentPart, index) =>
            index === partIndex ? updatedPart : contentPart,
          );
          converted[messageIndex] = { ...message, content: updatedContent };
          updated = true;
          break;
        }
      }

      if (updated) {
        continue;
      }

      const id = toolMessageId ?? toolCallId;
      const toolName =
        getString(rawMessage, "name") ??
        getString(rawMessage, "toolName") ??
        "tool";
      converted.push({
        id: `${id}:assistant`,
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId,
            toolName,
            args: {},
            argsText: "{}",
            result,
            ...(isError !== undefined ? { isError } : {}),
            ...(toolMessageId !== undefined
              ? { unstable_toolMessageId: toolMessageId }
              : {}),
          },
        ],
      });
      continue;
    }

    if (role === "assistant") {
      converted.push(toAssistantSnapshotMessage(rawMessage));
      continue;
    }

    if (role === "user" || role === "system") {
      converted.push(toUserOrSystemSnapshotMessage(role, rawMessage));
    }
  }

  return converted;
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
      id: part.unstable_toolMessageId ?? `${toolCallId}:tool`,
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
