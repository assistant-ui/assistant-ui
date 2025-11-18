"use client";

type ThreadMessageLike = {
  id: string;
  role: string;
  content: any;
  name?: string;
};

const generateId = () =>
  (globalThis.crypto as any)?.randomUUID?.() ??
  Math.random().toString(36).slice(2);

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

const normaliseToolCall = (part: ToolCallPart) => {
  const id = part.toolCallId ?? generateId();
  const argsText =
    typeof part.argsText === "string"
      ? part.argsText
      : JSON.stringify(part.args ?? {});
  return {
    id,
    call: {
      id,
      type: "function" as const,
      function: {
        name: part.toolName ?? "tool",
        arguments: argsText,
      },
    },
  };
};

export const toAgUiMessages = (
  messages: readonly ThreadMessageLike[],
): AgUiMessage[] => {
  const converted: AgUiMessage[] = [];

  for (const message of messages) {
    const role = message.role;
    const content = extractText(message.content);

    if (role === "assistant" && Array.isArray(message.content)) {
      const toolCallParts = message.content.filter(
        (part): part is ToolCallPart => part?.type === "tool-call",
      );

      const toolCalls = toolCallParts.map((part) => {
        const { id, call } = normaliseToolCall(part);
        return { id, call, part };
      });

      converted.push({
        id: message.id,
        role: "assistant",
        content,
        ...(message.name ? { name: message.name } : {}),
        ...(toolCalls.length > 0
          ? { toolCalls: toolCalls.map((entry) => entry.call) }
          : {}),
      });

      for (const { id: toolCallId, part } of toolCalls) {
        if (part.result === undefined) continue;

        const resultContent =
          typeof part.result === "string"
            ? part.result
            : JSON.stringify(part.result);
        converted.push({
          id: `${toolCallId}:tool`,
          role: "tool",
          content: resultContent,
          toolCallId,
          ...(part.isError ? { error: resultContent } : {}),
        });
      }

      continue;
    }

    if (role === "tool") {
      const toolCallId = (message as any).toolCallId ?? generateId();
      converted.push({
        id: message.id,
        role: "tool",
        content,
        toolCallId,
        ...(typeof (message as any).error === "string"
          ? { error: (message as any).error }
          : undefined),
      });
      continue;
    }

    converted.push({
      id: message.id,
      role,
      content,
      ...(message.name ? { name: message.name } : {}),
    });
  }

  return converted;
};

const extractText = (content: any): string => {
  if (!Array.isArray(content)) {
    if (typeof content === "string") return content;
    return "";
  }

  return content
    .filter((part) => part?.type === "text" && typeof part?.text === "string")
    .map((part) => part.text as string)
    .join("\n");
};

export const toAgUiTools = (tools: Record<string, any> | undefined) => {
  if (!tools) return [];

  return Object.entries(tools)
    .filter(([, tool]) => !tool?.disabled && tool?.type !== "backend")
    .map(([name, tool]) => ({
      name,
      description: tool?.description ?? undefined,
      parameters:
        typeof tool?.parameters?.toJSON === "function"
          ? tool.parameters.toJSON()
          : typeof tool?.parameters?.toJSONSchema === "function"
            ? tool.parameters.toJSONSchema()
            : tool?.parameters,
    }));
};
