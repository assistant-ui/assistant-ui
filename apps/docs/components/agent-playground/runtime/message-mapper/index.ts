import type { ServerEvent, SessionStateResponse } from '@/components/agent-playground/augment/types';
import type {
  AssistantMessagePart,
  AssistantThreadMessageLike,
  AssistantToolPart,
  PendingFollowUp,
  PendingApproval,
  PendingQuestion,
  PendingWorkspaceEnvRequest,
} from '../assistantTypes';
import { normalizeParts, partsFromPayloadMessage } from './modules/canonicalTranscript';
import { DEBUG_MAPPING, debugLog } from './modules/debug';
import { asRecord, stringAt } from './modules/guards';
import { messageIdFromEvent, toolCallIdFromPayload } from './modules/ids';
import {
  mergeIncomingToolPartsWithExisting,
  mergeMessageParts,
  removeToolPartsFromOtherMessages,
} from './modules/merge';
import {
  initialAugmentAssistantStore,
  safeConvertMessage,
  type AugmentAssistantStore,
} from './modules/store';
import {
  findToolPart,
  updateToolPartByNameIfPresent,
  updateToolPartIfPresent,
  upsertToolPart,
} from './modules/storeMutations';
import {
  appendNestedToolToSubagent,
  appendSubagentTextDelta,
  subagentPartFromEvent,
} from './modules/subagentMapper';
import {
  appendToolArgsDelta,
  toolPartFromEvent,
  toolPartFromPayload,
  toolStatusFromActiveTool,
} from './modules/toolLifecycleMapper';

export {
  createUserMessage,
  initialAugmentAssistantStore,
  safeConvertMessage,
  type AugmentAssistantStore,
} from './modules/store';

export function hydrateStoreFromSessionState(state: SessionStateResponse): AugmentAssistantStore {
  const store: AugmentAssistantStore = {
    ...initialAugmentAssistantStore,
    session: state.session,
    threadId: state.session.threadId,
    threads: (state.threads ?? []).map((thread) => ({
      id: thread.id,
      title: thread.title ?? thread.id.slice(0, 8),
      status: 'regular',
    })),
    messages: (state.messages ?? []).map(normalizeStoredMessage).filter(Boolean) as AssistantThreadMessageLike[],
    isRunning: state.session.status === 'running',
  };
  return applyDisplayStateRecord(store, asRecord(state.displayState));
}

export function applyServerEvent(store: AugmentAssistantStore, event: ServerEvent): AugmentAssistantStore {
  if (DEBUG_MAPPING && ['message_update', 'message_end', 'tool_input_start', 'tool_start', 'tool_end', 'subagent_start', 'subagent_end', 'subagent_tool_start', 'subagent_tool_end'].includes(event.type)) {
    const p = asRecord(event.payload);
    if (['message_update', 'message_end'].includes(event.type)) {
      const content = asRecord(p.message).content;
      const rawParts = Array.isArray(content) ? content : [];
      const toolCalls = rawParts.filter((c: any) => c.type === 'tool_call');
      const toolResults = rawParts.filter((c: any) => c.type === 'tool_result');
      debugLog(`EVENT ${event.type}`, `msgId=${String(asRecord(p.message).id ?? '?').slice(0,12)} raw=[${toolCalls.length} call, ${toolResults.length} result]`);
      toolCalls.forEach((tc: any) => debugLog(`  ├─ tool_call:`, `name=${tc.name ?? tc.toolName} id=${(tc.id ?? tc.toolCallId ?? '?').slice(0,16)}`));
      toolResults.forEach((tr: any) => debugLog(`  ├─ tool_result:`, `name=${tr.name ?? tr.toolName} id=${(tr.id ?? tr.toolCallId ?? '?').slice(0,16)}`));
    } else {
      debugLog(`EVENT ${event.type}`, `toolCallId=${String(p.toolCallId ?? p.subagentId ?? '?').slice(0,16)} toolName=${p.toolName ?? p.subToolName ?? '?'}`);
    }
  }

  switch (event.type) {
    case 'agent_start':
      return applyAgentStart(store);
    case 'agent_end':
      return finalizeRunningAssistantMessages(
        clearPendingInteractions({ ...store, isRunning: false }),
      );
    case 'message_start':
      return upsertAssistantMessage(store, messageIdFromEvent(event), [], true, false);
    case 'message_update':
      return upsertAssistantMessage(store, messageIdFromEvent(event), partsFromPayloadMessage(event.payload), true, false);
    case 'message_end':
      return upsertAssistantMessage(store, messageIdFromEvent(event), partsFromPayloadMessage(event.payload), false, true);
    case 'tool_input_start':
      return updateToolPartIfPresent(store, toolPartFromEvent(event, { status: 'running' })).store;
    case 'tool_input_delta':
      return appendToolArgsDelta(store, event);
    case 'tool_start':
      return updateToolPartIfPresent(store, toolPartFromEvent(event, { status: 'running' })).store;
    case 'tool_update':
      return updateToolPartIfPresent(store, toolPartFromEvent(event, { status: 'running' })).store;
    case 'tool_end':
      return clearPendingQuestionForToolCall(
        clearPendingApprovalForToolCall(
          updateToolPartIfPresent(store, toolPartFromEvent(event, { status: 'complete' })).store,
          String(asRecord(event.payload).toolCallId ?? ''),
        ),
        String(asRecord(event.payload).toolCallId ?? ''),
      );
    case 'tool_suspended':
      return applyToolSuspension(store, event);
    case 'workspace_env_request_created':
      return addPendingWorkspaceEnvRequest(store, event);
    case 'workspace_env_updated':
    case 'workspace_env_skipped':
      return clearPendingWorkspaceEnvRequest(store, event);
    case 'agent_follow_up_queued':
      return addPendingFollowUp(store, event);
    case 'tool_approval_required':
      return addPendingApproval(store, event);
    case 'ask_question':
      return addPendingQuestion(store, event);
    case 'subagent_start':
      return upsertToolPart(store, subagentPartFromEvent(event, { status: 'running' }));
    case 'subagent_text_delta':
      return appendSubagentTextDelta(store, event);
    case 'subagent_tool_start':
      return appendNestedToolToSubagent(store, event, 'running');
    case 'subagent_tool_end':
      return appendNestedToolToSubagent(store, event, 'complete');
    case 'subagent_end':
      return upsertToolPart(store, subagentPartFromEvent(event, { status: 'complete' }));
    case 'thread_created':
      return addThread(store, event);
    case 'thread_changed':
      return { ...store, threadId: stringAt(event.payload, ['threadId']) ?? store.threadId };
    case 'mode_changed':
      return store.session
        ? { ...store, session: { ...store.session, modeId: stringAt(event.payload, ['modeId']) ?? store.session.modeId } }
        : store;
    case 'usage_update':
      return store;
    case 'display_state_changed':
      return applyDisplayState(store, event);
    case 'error':
      return {
        ...store,
        isRunning: false,
        lastError: errorMessageFromPayload(event.payload),
        messages: appendErrorMessage(store.messages, errorMessageFromPayload(event.payload)),
      };
    default:
      return store;
  }
}

function normalizeStoredMessage(message: unknown): AssistantThreadMessageLike | null {
  const record = asRecord(message);
  const role = record.role === 'user' || record.role === 'assistant' ? record.role : null;
  if (!role) return null;
  const rawParts = Array.isArray(record.parts) ? record.parts : Array.isArray(record.content) ? record.content : [];
  const content = normalizeParts(rawParts);
  const base: AssistantThreadMessageLike = {
    id: typeof record.id === 'string' ? record.id : crypto.randomUUID(),
    role,
    createdAt: record.createdAt ? new Date(String(record.createdAt)) : new Date(),
    content,
    attachments: Array.isArray(record.attachments) ? record.attachments : undefined,
  };
  if (role === 'assistant') {
    base.status = { type: 'complete', reason: 'stop' };
  }
  return safeConvertMessage(base);
}

function applyAgentStart(store: AugmentAssistantStore): AugmentAssistantStore {
  const pendingFollowUps = !store.isRunning && store.pendingFollowUps.length > 0
    ? store.pendingFollowUps.slice(1)
    : store.pendingFollowUps;
  return { ...store, pendingFollowUps, isRunning: true, lastError: null };
}

function upsertAssistantMessage(
  store: AugmentAssistantStore,
  id: string,
  parts: AssistantMessagePart[],
  running: boolean,
  authoritative: boolean = false,
): AugmentAssistantStore {
  const isRunning = running ? true : false;

  // Check if this message only contains "orphan" tool results (tool_result without matching tool_call in same message)
  // These are identified by having: result !== undefined AND empty args (args: {})
  // If so, merge results into existing tools in other messages instead of creating a new message
  const isOrphanToolResult = (part: AssistantMessagePart): part is AssistantToolPart =>
    part.type === 'tool-call' &&
    part.result !== undefined &&
    Object.keys(part.args ?? {}).length === 0;

  const orphanToolResults = parts.filter(isOrphanToolResult);
  const nonOrphanParts = parts.filter((part) => !isOrphanToolResult(part));

  // If we ONLY have orphan tool results (no new tool calls, text, or reasoning),
  // try to merge them into existing tools without creating a new message
  if (orphanToolResults.length > 0 && nonOrphanParts.length === 0) {
    const existingMessageIndex = store.messages.findIndex((msg) => msg.id === id);
    // Only apply this optimization for NEW messages (not updates to existing ones)
    if (existingMessageIndex === -1) {
      let allResultsMerged = true;
      let updatedStore = store;

      for (const toolResult of orphanToolResults) {
        const existingTool = findToolPart(updatedStore, toolResult.toolCallId);
        if (existingTool) {
          // Merge result into existing tool
          const mergedTool: AssistantToolPart = {
            ...existingTool,
            result: toolResult.result,
            isError: toolResult.isError,
            status: toolResult.status,
          };
          const updateResult = updateToolPartIfPresent(updatedStore, mergedTool);
          if (updateResult.found) {
            updatedStore = updateResult.store;
            if (DEBUG_MAPPING) {
              debugLog(`upsertAssistantMessage: merged orphan result`, `toolCallId=${toolResult.toolCallId.slice(0, 12)} into existing tool (skipping new msg ${id.slice(0, 12)})`);
            }
          } else {
            allResultsMerged = false;
          }
        } else {
          allResultsMerged = false;
        }
      }

      if (allResultsMerged) {
        if (DEBUG_MAPPING) {
          const allTools = updatedStore.messages.flatMap((m) => m.content.filter((p) => p.type === 'tool-call'));
          debugLog(`STORE after merge (no new msg)`, `total=${allTools.length} tool parts:`, allTools.map((t: any) => `${t.toolName}(${t.toolCallId.slice(0, 8)})`));
        }
        return { ...updatedStore, isRunning };
      }
      // Fall through to normal processing if not all results could be merged
    }
  }

  const incomingToolCallIds = new Set(parts.filter((part) => part.type === 'tool-call').map((part) => part.toolCallId));
  const migratedParts = mergeIncomingToolPartsWithExisting(store, parts);
  const nextStore = removeToolPartsFromOtherMessages(store, id, incomingToolCallIds);

  if (DEBUG_MAPPING) {
    const incomingTools = parts.filter((p) => p.type === 'tool-call');
    const migratedTools = migratedParts.filter((p) => p.type === 'tool-call');
    debugLog(`upsertAssistantMessage`, `msgId=${id.slice(0,12)} incoming=${incomingTools.length} tools, migrated=${migratedTools.length} tools, authoritative=${authoritative}`);
  }

  if (migratedParts.length === 0 && parts.length > 0) {
    return { ...nextStore, isRunning };
  }

  const nextMessage: AssistantThreadMessageLike = {
    id,
    role: 'assistant',
    createdAt: new Date(),
    content: migratedParts,
    status: running ? { type: 'running' } : { type: 'complete', reason: 'stop' },
  };

  const index = nextStore.messages.findIndex((message) => message.id === id);
  if (index === -1) {
    const result = { ...nextStore, messages: [...nextStore.messages, nextMessage], isRunning };
    if (DEBUG_MAPPING) {
      const allTools = result.messages.flatMap((m) => m.content.filter((p) => p.type === 'tool-call'));
      debugLog(`STORE after upsert (new msg)`, `total=${allTools.length} tool parts:`, allTools.map((t: any) => `${t.toolName}(${t.toolCallId.slice(0,8)})`));
    }
    return result;
  }

  const messages = [...nextStore.messages];
  const existingMessage = messages[index]!;
  const nextContent = migratedParts.length > 0 ? mergeMessageParts(existingMessage.content, migratedParts, authoritative) : existingMessage.content;
  messages[index] = {
    ...existingMessage,
    content: nextContent,
    status: nextMessage.status,
  };
  const result = { ...nextStore, messages, isRunning };

  if (DEBUG_MAPPING) {
    const allTools = result.messages.flatMap((m) => m.content.filter((p) => p.type === 'tool-call'));
    debugLog(`STORE after upsert (update)`, `total=${allTools.length} tool parts:`, allTools.map((t: any) => `${t.toolName}(${t.toolCallId.slice(0,8)})`));
  }

  return result;
}

function addPendingApproval(store: AugmentAssistantStore, event: ServerEvent): AugmentAssistantStore {
  const payload = asRecord(event.payload);
  if (isCompletedTool(store, toolCallIdFromPayload(payload))) return store;
  return applyPendingApprovalPayload(store, payload, event.id);
}

function addPendingFollowUp(store: AugmentAssistantStore, event: ServerEvent): AugmentAssistantStore {
  const payload = asRecord(event.payload);
  const id = typeof payload.id === 'string' ? payload.id : event.id;
  if (store.pendingFollowUps.some((item) => item.id === id)) return store;
  const followUp: PendingFollowUp = {
    id,
    title: typeof payload.title === 'string' ? payload.title : 'Queued follow-up',
    content: typeof payload.content === 'string' ? payload.content : '',
    ...(typeof payload.source === 'string' ? { source: payload.source } : {}),
  };
  return { ...store, pendingFollowUps: [...store.pendingFollowUps, followUp] };
}

function addPendingWorkspaceEnvRequest(store: AugmentAssistantStore, event: ServerEvent): AugmentAssistantStore {
  const payload = asRecord(event.payload);
  const id = typeof payload.requestId === 'string' ? payload.requestId : event.id;
  if (store.pendingWorkspaceEnvRequests.some((request) => request.id === id)) return store;
  const requested = Array.isArray(payload.requested)
    ? payload.requested
      .map((item): PendingWorkspaceEnvRequest['requested'][number] | null => {
        const record = asRecord(item);
        const name = typeof record.name === 'string' ? record.name : null;
        const envFile = record.envFile === '.env' || record.envFile === '.env.local'
          ? record.envFile
          : '.env.local';
        if (!name) return null;
        return {
          name,
          required: record.required !== false,
          secret: record.secret !== false,
          envFile,
          ...(typeof record.description === 'string' ? { description: record.description } : {}),
        };
      })
      .filter(Boolean) as PendingWorkspaceEnvRequest['requested']
    : [];
  const request: PendingWorkspaceEnvRequest = {
    id,
    appPath: typeof payload.appPath === 'string' ? payload.appPath : '',
    reason: typeof payload.reason === 'string' ? payload.reason : 'Add workspace environment values.',
    requested,
  };
  return {
    ...store,
    pendingWorkspaceEnvRequests: [...store.pendingWorkspaceEnvRequests, request],
  };
}

function clearPendingWorkspaceEnvRequest(store: AugmentAssistantStore, event: ServerEvent): AugmentAssistantStore {
  const payload = asRecord(event.payload);
  const requestId = typeof payload.requestId === 'string' ? payload.requestId : null;
  if (!requestId) return store;
  const pendingWorkspaceEnvRequests = store.pendingWorkspaceEnvRequests.filter((request) => request.id !== requestId);
  return pendingWorkspaceEnvRequests.length === store.pendingWorkspaceEnvRequests.length
    ? store
    : { ...store, pendingWorkspaceEnvRequests };
}

function applyPendingApprovalPayload(
  store: AugmentAssistantStore,
  payload: Record<string, any>,
  fallbackId: string = crypto.randomUUID(),
): AugmentAssistantStore {
  if (payload.toolName === 'ask_user') {
    const pendingQuestion = pendingQuestionFromPayload(payload);
    const tool = toolPartFromPayload(payload, fallbackId, { type: 'requires-action', reason: 'human-input' });
    const updated = updateToolPartIfPresent(store, tool);
    const withTool = updated.found ? updated.store : upsertToolPart(store, tool);
    return pendingQuestion ? applyPendingQuestion(withTool, pendingQuestion) : withTool;
  }

  const approval: PendingApproval = {
    id: String(payload.requestId ?? payload.toolCallId ?? fallbackId),
    toolCallId: typeof payload.toolCallId === 'string' ? payload.toolCallId : undefined,
    toolName: String(payload.toolName ?? 'tool'),
    args: payload.args,
  };
  const withTool = upsertToolPart(store, {
    type: 'tool-call',
    toolCallId: approval.toolCallId ?? approval.id,
    toolName: approval.toolName,
    args: asRecord(approval.args),
    argsText: JSON.stringify(asRecord(approval.args)),
    status: { type: 'requires-action', reason: 'tool-calls' },
  });
  if (withTool.pendingApprovals.some((item) => item.id === approval.id)) return withTool;
  return { ...withTool, pendingApprovals: [...withTool.pendingApprovals, approval] };
}

function clearPendingApprovalForToolCall(store: AugmentAssistantStore, toolCallId: string): AugmentAssistantStore {
  if (!toolCallId) return store;
  const pendingApprovals = store.pendingApprovals.filter((approval) => approval.toolCallId !== toolCallId);
  return pendingApprovals.length === store.pendingApprovals.length ? store : { ...store, pendingApprovals };
}

function clearPendingQuestionForToolCall(store: AugmentAssistantStore, toolCallId: string): AugmentAssistantStore {
  if (!toolCallId) return store;
  const pendingQuestions = store.pendingQuestions.filter((question) => question.toolCallId !== toolCallId);
  return pendingQuestions.length === store.pendingQuestions.length ? store : { ...store, pendingQuestions };
}

function clearPendingInteractions(store: AugmentAssistantStore): AugmentAssistantStore {
  if (store.pendingApprovals.length === 0 && store.pendingQuestions.length === 0) return store;
  return { ...store, pendingApprovals: [], pendingQuestions: [] };
}

// Forces every assistant message currently flagged as `status: { type: 'running' }`
// to `complete`. The composer's "is the assistant typing" state is derived from
// the trailing message's status, NOT from `store.isRunning`. If a `message_end`
// event is dropped but `agent_end` still arrives, the message stays running and
// the composer keeps spinning even though the runtime knows the turn finished.
// Call this from any "the turn is over" code path to keep the two views aligned.
function finalizeRunningAssistantMessages(store: AugmentAssistantStore): AugmentAssistantStore {
  let changed = false;
  const messages = store.messages.map((message) => {
    if (message.role !== 'assistant') return message;
    const status = (message as AssistantThreadMessageLike).status;
    if (!status || status.type !== 'running') return message;
    changed = true;
    return { ...message, status: { type: 'complete', reason: 'stop' } as const };
  });
  return changed ? { ...store, messages } : store;
}

function addPendingQuestion(store: AugmentAssistantStore, event: ServerEvent): AugmentAssistantStore {
  const payload = asRecord(event.payload);
  const pendingQuestion = pendingQuestionFromPayload(payload);
  if (!pendingQuestion) return store;
  if (isCompletedTool(store, pendingQuestion.toolCallId ?? pendingQuestion.id)) return store;
  return applyPendingQuestion(store, pendingQuestion);
}

function applyDisplayState(store: AugmentAssistantStore, event: ServerEvent): AugmentAssistantStore {
  const displayState = asRecord(asRecord(event.payload).displayState);
  return applyDisplayStateRecord(store, displayState);
}

function applyDisplayStateRecord(store: AugmentAssistantStore, displayState: Record<string, any>): AugmentAssistantStore {
  let nextStore = typeof displayState.isRunning === 'boolean' ? { ...store, isRunning: displayState.isRunning } : store;
  const activeTools = asRecord(displayState.activeTools);
  for (const [toolCallId, value] of Object.entries(activeTools)) {
    const activeTool = asRecord(value);
    const tool = toolPartFromPayload({ ...activeTool, toolCallId }, toolCallId, toolStatusFromActiveTool(activeTool));
    const updated = updateToolPartIfPresent(nextStore, tool);
    if (updated.found) {
      nextStore = updated.store;
    } else if (isSuccessfulWorkspaceTool(tool)) {
      nextStore = updateToolPartByNameIfPresent(nextStore, 'request_workspace', tool).store;
    }
  }

  const pendingSuspension = asRecord(displayState.pendingSuspension);
  const pendingSuspensionToolCallId = toolCallIdFromPayload(pendingSuspension);
  if (Object.keys(pendingSuspension).length > 0 && !isCompletedTool(nextStore, pendingSuspensionToolCallId)) {
    nextStore = applyToolSuspensionPayload(nextStore, pendingSuspension, pendingSuspensionToolCallId ?? crypto.randomUUID());
  }

  if (!nextStore.isRunning) return finalizeRunningAssistantMessages(clearPendingInteractions(nextStore));

  const pendingApproval = asRecord(displayState.pendingApproval);
  const pendingApprovalToolCallId = toolCallIdFromPayload(pendingApproval);
  if (Object.keys(pendingApproval).length > 0 && !isCompletedTool(nextStore, pendingApprovalToolCallId)) {
    nextStore = applyPendingApprovalPayload(nextStore, pendingApproval);
  }

  const pendingQuestion = pendingQuestionFromPayload(asRecord(displayState.pendingQuestion));
  if (!pendingQuestion || isCompletedTool(nextStore, pendingQuestion.toolCallId ?? pendingQuestion.id)) return nextStore;
  return applyPendingQuestion(nextStore, pendingQuestion);
}

function applyPendingQuestion(store: AugmentAssistantStore, pendingQuestion: PendingQuestion): AugmentAssistantStore {
  const toolCallId = pendingQuestion.toolCallId ?? latestToolCallIdByName(store, 'ask_user') ?? pendingQuestion.id;
  const withTool = upsertToolPart(store, {
    type: 'tool-call',
    toolCallId,
    toolName: 'ask_user',
    args: {
      questionId: pendingQuestion.id,
      question: pendingQuestion.question,
      options: pendingQuestion.options ?? [],
    },
    argsText: JSON.stringify({
      question: pendingQuestion.question,
      options: pendingQuestion.options ?? [],
    }),
    status: { type: 'requires-action', reason: 'human-input' },
  });
  const nextPendingQuestion = { ...pendingQuestion, toolCallId };
  if (withTool.pendingQuestions.some((item) => item.id === pendingQuestion.id)) return withTool;
  return { ...withTool, pendingQuestions: [...withTool.pendingQuestions, nextPendingQuestion] };
}

function applyToolSuspension(store: AugmentAssistantStore, event: ServerEvent): AugmentAssistantStore {
  const payload = asRecord(event.payload);
  if (isCompletedTool(store, toolCallIdFromPayload(payload))) return store;
  return applyToolSuspensionPayload(store, payload, `tool-${event.id}`);
}

function applyToolSuspensionPayload(
  store: AugmentAssistantStore,
  payload: Record<string, any>,
  fallbackId: string,
): AugmentAssistantStore {
  const tool = toolPartFromPayload(
    {
      ...payload,
      artifact: {
        suspendPayload: payload.suspendPayload,
        resumeSchema: payload.resumeSchema,
      },
    },
    fallbackId,
    { type: 'requires-action', reason: 'human-input' },
  );
  const updated = updateToolPartIfPresent(store, tool);
  return updated.found ? updated.store : upsertToolPart(store, tool);
}

function pendingQuestionFromPayload(payload: Record<string, any>): PendingQuestion | null {
  const args = asRecord(payload.args);
  const id = typeof payload.questionId === 'string'
    ? payload.questionId
    : typeof payload.id === 'string'
      ? payload.id
      : typeof payload.toolCallId === 'string'
        ? payload.toolCallId
        : null;
  const question = typeof payload.question === 'string'
    ? payload.question
    : typeof payload.message === 'string'
      ? payload.message
      : typeof args.question === 'string'
        ? args.question
        : null;
  if (!id || !question) return null;
  const options = Array.isArray(payload.options) ? payload.options : Array.isArray(args.options) ? args.options : undefined;
  return {
    id,
    toolCallId: typeof payload.toolCallId === 'string' ? payload.toolCallId : undefined,
    question,
    options,
  };
}

function latestToolCallIdByName(store: AugmentAssistantStore, toolName: string): string | null {
  for (const message of [...store.messages].reverse()) {
    for (const part of [...message.content].reverse()) {
      if (part.type === 'tool-call' && part.toolName === toolName) return part.toolCallId;
    }
  }
  return null;
}

function addThread(store: AugmentAssistantStore, event: ServerEvent): AugmentAssistantStore {
  const thread = asRecord(asRecord(event.payload).thread);
  const id = typeof thread.id === 'string' ? thread.id : stringAt(event.payload, ['threadId']);
  if (!id || store.threads.some((item) => item.id === id)) return store;
  return {
    ...store,
    threadId: id,
    threads: [{ id, title: String(thread.title ?? id.slice(0, 8)), status: 'regular' }, ...store.threads],
  };
}

function isCompletedTool(store: AugmentAssistantStore, toolCallId: string | null): boolean {
  if (!toolCallId) return false;
  const tool = findToolPart(store, toolCallId);
  return Boolean(tool && (tool.result !== undefined || tool.status?.type === 'complete' || tool.status?.type === 'incomplete'));
}

function isSuccessfulWorkspaceTool(tool: AssistantToolPart): boolean {
  return tool.toolName === 'request_workspace' && !tool.isError && tool.status?.type === 'complete' && tool.result !== undefined;
}

function appendErrorMessage(messages: AssistantThreadMessageLike[], text: string): AssistantThreadMessageLike[] {
  return [
    ...messages,
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      createdAt: new Date(),
      content: [{ type: 'text', text }],
      status: { type: 'incomplete', reason: 'error' },
    },
  ];
}

function errorMessageFromPayload(payload: unknown): string {
  const record = asRecord(payload);
  const error = record.error;
  if (typeof error === 'string') return error;
  const errorRecord = asRecord(error);
  return String(errorRecord.message ?? record.message ?? 'Agent run failed');
}
