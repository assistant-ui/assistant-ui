import type { AssistantMessagePart, AssistantToolPart } from '../../assistantTypes';
import { DEBUG_MAPPING, debugLog } from './debug';
import { asRecord } from './guards';

export function partsFromPayloadMessage(payload: unknown): AssistantMessagePart[] {
  const message = asRecord(asRecord(payload).message);
  const content = Array.isArray(message.content) ? message.content : [];
  return normalizeParts(content);
}

export function normalizeParts(rawParts: unknown[]): AssistantMessagePart[] {
  const normalized: AssistantMessagePart[] = [];
  for (const rawPart of rawParts) {
    const record = asRecord(rawPart);
    if (record.type === 'tool_result' || record.type === 'tool-result') {
      const toolCallId = String(record.toolCallId ?? record.id ?? '');
      const toolName = String(record.toolName ?? record.name ?? 'tool');
      const existingIndex = normalized.findIndex(
        (part) => part.type === 'tool-call' && part.toolCallId === toolCallId,
      );
      const result = record.result ?? record.output ?? record.content;
      if (existingIndex !== -1) {
        const existing = normalized[existingIndex] as AssistantToolPart;
        if (DEBUG_MAPPING) {
          debugLog(`normalizeParts: merge tool_result`, `id=${toolCallId.slice(0,12)} into existing tool_call at index ${existingIndex}`);
        }
        normalized[existingIndex] = {
          ...existing,
          result,
          isError: Boolean(record.isError),
          status: { type: Boolean(record.isError) ? 'incomplete' : 'complete', reason: Boolean(record.isError) ? 'error' : undefined },
        };
      } else {
        if (DEBUG_MAPPING) {
          debugLog(`normalizeParts: orphan tool_result`, `id=${toolCallId.slice(0,12)} name=${toolName} (no matching tool_call found)`);
        }
        normalized.push({
          type: 'tool-call',
          toolCallId,
          toolName,
          args: {},
          result,
          isError: Boolean(record.isError),
          status: { type: Boolean(record.isError) ? 'incomplete' : 'complete', reason: Boolean(record.isError) ? 'error' : undefined },
        });
      }
      continue;
    }
    const part = normalizePart(rawPart);
    if (part) normalized.push(part);
  }
  if (DEBUG_MAPPING) {
    const tools = normalized.filter((p) => p.type === 'tool-call');
    if (tools.length > 0) {
      debugLog(`normalizeParts result:`, `${tools.length} tool parts`, tools.map((t: any) => `${t.toolName}(${t.toolCallId.slice(0,8)}, hasResult=${t.result !== undefined})`));
    }
  }
  return normalized;
}

export function normalizePart(part: unknown): AssistantMessagePart | null {
  const record = asRecord(part);
  if (record.type === 'text') return { type: 'text', text: String(record.text ?? '') };
  if (record.type === 'thinking') return { type: 'reasoning', text: String(record.thinking ?? '') };
  if (record.type === 'reasoning') return { type: 'reasoning', text: String(record.text ?? '') };
  if (record.type === 'tool-call' || record.type === 'tool_call') {
    return {
      type: 'tool-call',
      toolCallId: String(record.toolCallId ?? record.id ?? ''),
      toolName: String(record.toolName ?? record.name ?? 'tool'),
      args: asRecord(record.args),
      argsText: typeof record.argsText === 'string' ? record.argsText : undefined,
      result: record.result,
      isError: Boolean(record.isError),
      artifact: record.artifact,
      status: normalizeToolStatus(record.status),
    };
  }
  return null;
}

export function normalizeToolStatus(status: unknown): AssistantToolPart['status'] | undefined {
  const record = asRecord(status);
  const type = record.type;
  if (type === 'running' || type === 'complete' || type === 'incomplete' || type === 'requires-action') {
    return { type, reason: typeof record.reason === 'string' ? record.reason : undefined };
  }
  return undefined;
}
