import {
  getExternalStoreMessages,
  type ThreadMessage,
} from "@assistant-ui/core";
import type { LangChainMessage, LangChainToolCall, UIMessage } from "./types";

const idlessToolCallScopes = new WeakMap<LangChainToolCall, number>();
let nextIdlessToolCallScope = 0;

const getLangChainToolCallFallbackId = (
  messageId: string | undefined,
  toolCall: LangChainToolCall,
  index: number,
) => {
  let scope = messageId;
  if (!scope) {
    let idlessScope = idlessToolCallScopes.get(toolCall);
    if (idlessScope === undefined) {
      idlessScope = nextIdlessToolCallScope++;
      idlessToolCallScopes.set(toolCall, idlessScope);
    }
    scope = `unknown-${idlessScope}`;
  }
  return `lc-toolcall-${scope}-${toolCall.index ?? index}`;
};

export const getLangChainToolCallIds = (
  messageId: string | undefined,
  toolCalls: readonly LangChainToolCall[],
) => {
  const usedIds = new Set(
    toolCalls.flatMap((toolCall) => (toolCall.id ? [toolCall.id] : [])),
  );

  return toolCalls.map((toolCall, index) => {
    if (toolCall.id) return toolCall.id;

    const fallbackId = getLangChainToolCallFallbackId(
      messageId,
      toolCall,
      index,
    );
    let toolCallId = fallbackId;
    let suffix = 1;
    while (usedIds.has(toolCallId)) {
      toolCallId = `${fallbackId}-${suffix++}`;
    }
    usedIds.add(toolCallId);
    return toolCallId;
  });
};

export const findMatchingLangChainToolCallIndex = (
  previousToolCalls: readonly LangChainToolCall[],
  toolCall: LangChainToolCall,
  toolCallIndex: number,
): number => {
  if (toolCall.id) {
    const byId = previousToolCalls.findIndex(
      (previous) => previous.id && previous.id === toolCall.id,
    );
    if (byId !== -1) return byId;
  }

  if (toolCall.index != null) {
    return previousToolCalls.findIndex(
      (previous) =>
        previous.index === toolCall.index && (!previous.id || !toolCall.id),
    );
  }

  const previousAtIndex = previousToolCalls[toolCallIndex];
  if (
    previousAtIndex &&
    !previousAtIndex.id &&
    previousAtIndex.index == null &&
    !toolCall.id
  ) {
    return toolCallIndex;
  }

  return -1;
};

export const getPendingToolCalls = (messages: LangChainMessage[]) => {
  const pendingToolCalls = new Map<string, LangChainToolCall>();
  const synthesizedIdsByRawId = new Map<string, string[]>();
  for (const message of messages) {
    if (message.type === "ai") {
      const toolCallIds = getLangChainToolCallIds(
        message.id,
        message.tool_calls ?? [],
      );
      for (const [index, toolCall] of (message.tool_calls ?? []).entries()) {
        const toolCallId = toolCallIds[index]!;
        pendingToolCalls.set(
          toolCallId,
          toolCall.id ? toolCall : { ...toolCall, id: toolCallId },
        );
        if (!toolCall.id) {
          const synthesizedIds = synthesizedIdsByRawId.get(toolCall.id) ?? [];
          synthesizedIds.push(toolCallId);
          synthesizedIdsByRawId.set(toolCall.id, synthesizedIds);
        }
      }
    }
    if (message.type === "tool") {
      if (!pendingToolCalls.delete(message.tool_call_id)) {
        const synthesizedIds = synthesizedIdsByRawId.get(message.tool_call_id);
        const synthesizedId = synthesizedIds?.find((id) =>
          pendingToolCalls.has(id),
        );
        if (synthesizedId) pendingToolCalls.delete(synthesizedId);
      }
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
