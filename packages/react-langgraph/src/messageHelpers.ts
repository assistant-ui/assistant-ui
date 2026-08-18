import {
  getExternalStoreMessages,
  type ThreadMessage,
} from "@assistant-ui/core";
import type { LangChainMessage, LangChainToolCall, UIMessage } from "./types";

export type PendingToolCallGroup = {
  key: string;
  toolCalls: LangChainToolCall[];
};

export const pendingToolCallGroupKey = (
  message: Extract<LangChainMessage, { type: "ai" }>,
): string | undefined => {
  if (message.id !== undefined) return `message:${message.id}`;
  const firstToolCallId = message.tool_calls?.[0]?.id;
  if (firstToolCallId !== undefined) return `tool:${firstToolCallId}`;
  return undefined;
};

export const getPendingToolCallGroups = (
  messages: LangChainMessage[],
  resolveGroupKey: (
    message: Extract<LangChainMessage, { type: "ai" }>,
  ) => string | undefined = pendingToolCallGroupKey,
): PendingToolCallGroup[] => {
  const pendingToolCalls = new Map<
    string,
    { toolCall: LangChainToolCall; groupKey: string }
  >();
  for (const message of messages) {
    if (message.type === "ai") {
      const groupKey =
        resolveGroupKey(message) ?? pendingToolCallGroupKey(message);
      if (!groupKey) continue;
      for (const toolCall of message.tool_calls ?? []) {
        pendingToolCalls.set(toolCall.id, { toolCall, groupKey });
      }
    }
    if (message.type === "tool") {
      pendingToolCalls.delete(message.tool_call_id);
    }
  }

  const groups = new Map<string, LangChainToolCall[]>();
  for (const { toolCall, groupKey } of pendingToolCalls.values()) {
    const group = groups.get(groupKey);
    if (group) group.push(toolCall);
    else groups.set(groupKey, [toolCall]);
  }
  return [...groups].map(([key, toolCalls]) => ({ key, toolCalls }));
};

export const getPendingToolCalls = (messages: LangChainMessage[]) =>
  getPendingToolCallGroups(messages).flatMap((group) => group.toolCalls);

export const hasToolResult = (
  messages: LangChainMessage[],
  toolCallId: string,
): boolean =>
  messages.some((m) => m.type === "tool" && m.tool_call_id === toolCallId);

export const truncateLangChainMessages = (
  threadMessages: readonly ThreadMessage[],
  parentId: string | null,
): LangChainMessage[] => {
  if (parentId === null) return [];
  const parentIndex = threadMessages.findIndex((m) => m.id === parentId);
  if (parentIndex === -1) return [];
  const truncated: LangChainMessage[] = [];
  for (let i = 0; i <= parentIndex && i < threadMessages.length; i++) {
    truncated.push(
      ...getExternalStoreMessages<LangChainMessage>(threadMessages[i]!),
    );
  }
  return truncated;
};

export const filterUIMessagesBySurvivingIds = (
  uiMessages: readonly UIMessage[],
  survivingMessages: readonly LangChainMessage[],
): UIMessage[] => {
  const survivingIds = new Set<string>();
  for (const m of survivingMessages) {
    if (m.id) survivingIds.add(m.id);
  }
  return uiMessages.filter((ui) => {
    const parentId = ui.metadata?.message_id;
    // orphans (no message_id) represent global UI, cleared only via delete_ui_message
    if (!parentId) return true;
    return survivingIds.has(parentId);
  });
};
