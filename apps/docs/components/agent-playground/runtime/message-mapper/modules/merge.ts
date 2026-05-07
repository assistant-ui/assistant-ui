import type { AssistantMessagePart, AssistantThreadMessageLike, AssistantToolPart } from '../../assistantTypes';
import type { AugmentAssistantStore } from './store';

export function mergeMessageParts(
  existing: AssistantMessagePart[],
  incoming: AssistantMessagePart[],
  authoritative: boolean = false,
): AssistantMessagePart[] {
  const incomingHasText = incoming.some((part) => part.type === 'text');
  const incomingHasReasoning = incoming.some((part) => part.type === 'reasoning');
  const incomingHasToolCalls = incoming.some((part) => part.type === 'tool-call');
  const incomingToolIds = new Set(
    incoming.filter((part) => part.type === 'tool-call').map((part) => part.toolCallId),
  );
  const preserved = existing.filter((part) => {
    if (part.type === 'text') return !incomingHasText;
    if (part.type === 'reasoning') return !incomingHasReasoning;
    if (part.type === 'tool-call') {
      if (authoritative && incomingHasToolCalls) return false;
      return !incomingToolIds.has(part.toolCallId);
    }
    return true;
  });
  return [...preserved, ...incoming];
}

export function mergeIncomingToolPartsWithExisting(
  store: AugmentAssistantStore,
  parts: AssistantMessagePart[],
): AssistantMessagePart[] {
  return parts.map((part) => {
    if (part.type !== 'tool-call') return part;
    const existing = findToolPartInMessages(store.messages, part.toolCallId);
    return existing ? mergeToolPart(existing, part) : part;
  });
}

export function removeToolPartsFromOtherMessages(
  store: AugmentAssistantStore,
  targetMessageId: string,
  toolCallIds: Set<string>,
): AugmentAssistantStore {
  if (toolCallIds.size === 0) return store;
  let changed = false;
  const messages = store.messages.flatMap((message) => {
    if (message.id === targetMessageId) return [message];
    const content = message.content.filter((part) => part.type !== 'tool-call' || !toolCallIds.has(part.toolCallId));
    if (content.length === message.content.length) return [message];
    changed = true;
    if (message.role === 'assistant' && content.length === 0) return [];
    return [{ ...message, content }];
  });
  return changed ? { ...store, messages } : store;
}

export function mergeToolPart(existing: AssistantToolPart, incoming: AssistantToolPart): AssistantToolPart {
  const args = mergeToolArgs(existing.args, incoming.args);
  return {
    ...existing,
    ...incoming,
    toolName: incoming.toolName === 'tool' ? existing.toolName : incoming.toolName,
    args,
    argsText: incoming.argsText && incoming.argsText !== '{}' ? incoming.argsText : existing.argsText,
    result: incoming.result !== undefined ? incoming.result : existing.result,
    isError: incoming.isError ?? existing.isError,
    artifact: incoming.artifact ?? existing.artifact,
    status: incoming.status ?? existing.status,
  };
}

export function mergeToolArgs(
  existing: Record<string, unknown> = {},
  incoming: Record<string, unknown> = {},
): Record<string, unknown> {
  if (Object.keys(incoming).length === 0) return existing;
  return { ...existing, ...incoming };
}

function findToolPartInMessages(
  messages: AssistantThreadMessageLike[],
  toolCallId: string,
): AssistantToolPart | null {
  for (const message of messages) {
    const part = message.content.find(
      (candidate) => candidate.type === 'tool-call' && candidate.toolCallId === toolCallId,
    );
    if (part?.type === 'tool-call') return part;
  }
  return null;
}
