import {
  getExternalStoreMessages,
  type ThreadMessage,
} from "@assistant-ui/core";
import type { LangChainMessage, LangChainToolCall, UIMessage } from "./types";

export const getPendingToolCalls = (messages: LangChainMessage[]) => {
  const pendingToolCalls = new Map<string, LangChainToolCall>();
  for (const message of messages) {
    if (message.type === "ai") {
      for (const toolCall of message.tool_calls ?? []) {
        pendingToolCalls.set(toolCall.id, toolCall);
      }
    }
    if (message.type === "tool") {
      pendingToolCalls.delete(message.tool_call_id);
    }
  }

  return [...pendingToolCalls.values()];
};

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
