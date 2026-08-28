import { getUIMessageParentId } from "@assistant-ui/react-langchain/converter";
import {
  getExternalStoreMessages,
  type ThreadMessage,
} from "@assistant-ui/core";
import { scanPendingToolCalls } from "@assistant-ui/core/internal";
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
  const pendingToolCalls = scanPendingToolCalls(
    messages,
    (message) => {
      if (message.type === "ai") {
        const groupKey =
          resolveGroupKey(message) ?? pendingToolCallGroupKey(message);
        return {
          toolCalls: groupKey
            ? (message.tool_calls ?? []).map((toolCall) => ({
                toolCall,
                groupKey,
              }))
            : [],
        };
      }
      if (message.type === "tool") {
        return { toolCallId: message.tool_call_id };
      }
      return undefined;
    },
    ({ toolCall }) => toolCall.id,
  );

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
    const parentId = getUIMessageParentId(ui);
    // orphans (no parent id) represent global UI, cleared only via delete_ui_message
    if (!parentId) return true;
    return survivingIds.has(parentId);
  });
};
