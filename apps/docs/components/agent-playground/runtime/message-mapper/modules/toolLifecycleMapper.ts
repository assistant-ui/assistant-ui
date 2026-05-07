import type { ServerEvent } from '../../../augment/types';
import type { AssistantToolPart } from '../../assistantTypes';
import { asRecord } from './guards';
import { findToolPart, updateToolPartIfPresent } from './storeMutations';
import type { AugmentAssistantStore } from './store';

export function appendToolArgsDelta(store: AugmentAssistantStore, event: ServerEvent): AugmentAssistantStore {
  const payload = asRecord(event.payload);
  const toolCallId = String(payload.toolCallId ?? activeToolId(store) ?? `tool-${event.id}`);
  const delta = String(payload.argsTextDelta ?? '');
  const existing = findToolPart(store, toolCallId);
  const tool: AssistantToolPart = {
    type: 'tool-call',
    toolCallId,
    toolName: existing?.toolName ?? String(payload.toolName ?? 'tool'),
    args: existing?.args ?? {},
    argsText: `${existing?.argsText ?? ''}${delta}`,
    status: { type: 'running' },
  };
  return updateToolPartIfPresent(store, tool).store;
}

export function toolPartFromEvent(event: ServerEvent, options: { status: 'running' | 'complete' }): AssistantToolPart {
  const payload = asRecord(event.payload);
  const args = asRecord(payload.args);
  return {
    type: 'tool-call',
    toolCallId: String(payload.toolCallId ?? `tool-${event.id}`),
    toolName: String(payload.toolName ?? 'tool'),
    args,
    argsText: typeof payload.argsText === 'string' ? payload.argsText : JSON.stringify(args),
    result: options.status === 'complete' ? payload.result : payload.artifact ?? payload.result,
    isError: Boolean(payload.isError),
    artifact: payload.artifact,
    status: { type: options.status === 'complete' ? (payload.isError ? 'incomplete' : 'complete') : 'running', reason: payload.isError ? 'error' : undefined },
  };
}

export function toolPartFromPayload(
  payload: Record<string, any>,
  fallbackId: string,
  status?: AssistantToolPart['status'],
): AssistantToolPart {
  const args = asRecord(payload.args);
  return {
    type: 'tool-call',
    toolCallId: String(payload.toolCallId ?? fallbackId),
    toolName: String(payload.toolName ?? payload.name ?? 'tool'),
    args,
    argsText: typeof payload.argsText === 'string' ? payload.argsText : JSON.stringify(args),
    result: payload.result,
    isError: Boolean(payload.isError),
    artifact: payload.artifact,
    status,
  };
}

export function toolStatusFromActiveTool(activeTool: Record<string, any>): AssistantToolPart['status'] {
  const status = String(activeTool.status ?? '').toLowerCase();
  if (status === 'completed' || status === 'complete' || status === 'done') {
    return { type: activeTool.isError ? 'incomplete' : 'complete', reason: activeTool.isError ? 'error' : undefined };
  }
  if (status === 'waiting' || status === 'requires-action' || status === 'requires_action') {
    return { type: 'requires-action', reason: 'tool-calls' };
  }
  if (status === 'failed' || status === 'error') {
    return { type: 'incomplete', reason: 'error' };
  }
  return { type: 'running' };
}

function activeToolId(store: AugmentAssistantStore): string | null {
  const lastAssistant = [...store.messages].reverse().find((message) => message.role === 'assistant');
  const lastTool = lastAssistant?.content.filter((part) => part.type === 'tool-call').at(-1);
  return lastTool?.type === 'tool-call' ? lastTool.toolCallId : null;
}
