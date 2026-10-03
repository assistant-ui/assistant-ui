import type {
  CompleteAttachment,
  MessageStatus,
  ThreadAssistantMessage,
  ThreadUserMessagePart,
  ToolApprovalOption,
} from "@assistant-ui/core";
import type {
  AcpAgentCapabilities,
  AcpAvailableCommand,
  AcpConnectionState,
  AcpImplementation,
  AcpPermissionRequest,
  AcpPlanEntry,
  AcpSessionConfigOption,
  AcpSessionUpdate,
  AcpToolCallStatus,
  AcpUsage,
} from "./types";
import {
  applySessionUpdateToContent,
  attachToolCallApproval,
  permissionOptionToApprovalOption,
  resolveToolCallApproval,
} from "./conversions";

type AssistantPart = ThreadAssistantMessage["content"][number];

export type AcpLoadState =
  | { readonly type: "idle" }
  | { readonly type: "loading" }
  | { readonly type: "ready" }
  | { readonly type: "error"; readonly error: string };

export type AcpRunState =
  | { readonly type: "idle" }
  | { readonly type: "running"; readonly assistantId: string };

export type AcpUserMessage = {
  readonly role: "user";
  readonly id: string;
  readonly parentId: string | null;
  readonly createdAt: number;
  readonly content: readonly ThreadUserMessagePart[];
  readonly attachments: readonly CompleteAttachment[];
};

export type AcpAssistantMessage = {
  readonly role: "assistant";
  readonly id: string;
  readonly parentId: string | null;
  readonly createdAt: number;
  readonly status: MessageStatus;
  readonly content: readonly AssistantPart[];
};

export type AcpThreadMessage = AcpUserMessage | AcpAssistantMessage;

export type AcpPendingPermission = {
  readonly approvalId: string;
  readonly toolCallId: string;
  readonly options: readonly ToolApprovalOption[];
};

export type AcpThreadState = {
  readonly loadState: AcpLoadState;
  readonly connectionState: AcpConnectionState;
  readonly sessionId: string | undefined;
  readonly agentInfo: AcpImplementation | undefined;
  readonly agentCapabilities: AcpAgentCapabilities | undefined;
  readonly messageOrder: readonly string[];
  readonly messagesById: Readonly<Record<string, AcpThreadMessage>>;
  readonly headId: string | null;
  readonly run: AcpRunState;
  readonly permissions: Readonly<Record<string, AcpPendingPermission>>;
  readonly plan: readonly AcpPlanEntry[] | undefined;
  readonly sessionTitle: string | undefined;
  readonly currentModeId: string | undefined;
  readonly availableCommands: readonly AcpAvailableCommand[] | undefined;
  readonly configOptions: readonly AcpSessionConfigOption[] | undefined;
  readonly usage: AcpUsage | undefined;
  readonly toolCallStatuses: Readonly<Record<string, AcpToolCallStatus>>;
};

export type AcpThreadEvent =
  | { readonly type: "load-start" }
  | { readonly type: "load-ready" }
  | { readonly type: "load-error"; readonly error: string }
  | {
      readonly type: "connection";
      readonly connectionState: AcpConnectionState;
      readonly sessionId: string | undefined;
      readonly agentInfo?: AcpImplementation | undefined;
      readonly agentCapabilities?: AcpAgentCapabilities | undefined;
    }
  | { readonly type: "append-message"; readonly message: AcpThreadMessage }
  | {
      readonly type: "replace-messages";
      readonly messages: readonly AcpThreadMessage[];
      readonly headId: string | null;
    }
  | { readonly type: "run-start"; readonly message: AcpAssistantMessage }
  | { readonly type: "session-update"; readonly update: AcpSessionUpdate }
  | {
      readonly type: "permission-request";
      readonly approvalId: string;
      readonly request: AcpPermissionRequest;
    }
  | {
      readonly type: "permission-resolved";
      readonly approvalId: string;
      readonly approved: boolean;
      readonly optionId?: string | undefined;
      readonly cancelled: boolean;
    }
  | { readonly type: "permissions-cancelled" }
  | { readonly type: "run-end"; readonly status: MessageStatus };

export const EMPTY_ACP_THREAD_STATE: AcpThreadState = {
  loadState: { type: "idle" },
  connectionState: "disconnected",
  sessionId: undefined,
  agentInfo: undefined,
  agentCapabilities: undefined,
  messageOrder: [],
  messagesById: {},
  headId: null,
  run: { type: "idle" },
  permissions: {},
  plan: undefined,
  sessionTitle: undefined,
  currentModeId: undefined,
  availableCommands: undefined,
  configOptions: undefined,
  usage: undefined,
  toolCallStatuses: {},
};

export const createAcpThreadState = (): AcpThreadState =>
  EMPTY_ACP_THREAD_STATE;

export const isAcpStateRunning = (state: AcpThreadState): boolean =>
  state.run.type === "running";

const withMessage = (
  state: AcpThreadState,
  message: AcpThreadMessage,
  headId: string | null = message.id,
): AcpThreadState => ({
  ...state,
  messageOrder: state.messagesById[message.id]
    ? state.messageOrder
    : [...state.messageOrder, message.id],
  messagesById: { ...state.messagesById, [message.id]: message },
  headId,
});

const runningAssistant = (
  state: AcpThreadState,
): AcpAssistantMessage | undefined => {
  if (state.run.type !== "running") return undefined;
  const message = state.messagesById[state.run.assistantId];
  return message?.role === "assistant" ? message : undefined;
};

const patchAssistant = (
  state: AcpThreadState,
  patch: (message: AcpAssistantMessage) => AcpAssistantMessage | undefined,
): AcpThreadState => {
  const message = runningAssistant(state);
  if (!message) return state;
  const next = patch(message);
  if (!next || next === message) return state;
  return {
    ...state,
    messagesById: { ...state.messagesById, [message.id]: next },
  };
};

const cancelPermissions = (state: AcpThreadState): AcpThreadState => {
  const approvalIds = Object.keys(state.permissions);
  if (approvalIds.length === 0) return state;
  let next = state;
  for (const approvalId of approvalIds) {
    next = patchAssistantAt(next, approvalId, (message) => ({
      ...message,
      content: resolveToolCallApproval(message.content, approvalId, {
        resolution: "cancelled",
      }) as AssistantPart[],
    }));
  }
  return { ...next, permissions: {} };
};

const patchAssistantAt = (
  state: AcpThreadState,
  approvalId: string,
  patch: (
    message: AcpAssistantMessage,
    approval: AcpPendingPermission,
  ) => AcpAssistantMessage | undefined,
): AcpThreadState => {
  const approval = state.permissions[approvalId];
  if (!approval) return state;
  for (const id of state.messageOrder) {
    const message = state.messagesById[id];
    if (message?.role !== "assistant") continue;
    const next = patch(message, approval);
    if (!next || next === message) continue;
    return {
      ...state,
      messagesById: { ...state.messagesById, [id]: next },
    };
  }
  return state;
};

const reduceSessionUpdate = (
  state: AcpThreadState,
  update: AcpSessionUpdate,
): AcpThreadState => {
  switch (update.sessionUpdate) {
    case "plan":
      return state.plan === update.entries
        ? state
        : { ...state, plan: update.entries };
    case "session_info_update": {
      if (update.title === undefined) return state;
      const title = update.title ?? undefined;
      return state.sessionTitle === title
        ? state
        : { ...state, sessionTitle: title };
    }
    case "current_mode_update":
      return state.currentModeId === update.currentModeId
        ? state
        : { ...state, currentModeId: update.currentModeId };
    case "available_commands_update":
      return state.availableCommands === update.availableCommands
        ? state
        : { ...state, availableCommands: update.availableCommands };
    case "config_option_update":
      return state.configOptions === update.configOptions
        ? state
        : { ...state, configOptions: update.configOptions };
    case "usage_update": {
      const usage: AcpUsage = {
        used: update.used,
        size: update.size,
        cost: update.cost ?? null,
      };
      return { ...state, usage };
    }
    case "user_message_chunk":
      return state;
    default: {
      const toolCall = update as Parameters<
        typeof applySessionUpdateToContent
      >[1];
      const toolCallId =
        typeof toolCall.toolCallId === "string"
          ? toolCall.toolCallId
          : undefined;
      const knownStatus =
        toolCallId === undefined
          ? undefined
          : state.toolCallStatuses[toolCallId];
      const next = patchAssistant(state, (message) => {
        const content = applySessionUpdateToContent(
          message.content,
          toolCall,
          knownStatus,
        );
        return content === undefined ? undefined : { ...message, content };
      });
      const reportedStatus = toolCall.status ?? undefined;
      if (toolCallId === undefined || reportedStatus === undefined) {
        return next;
      }
      return next.toolCallStatuses[toolCallId] === reportedStatus
        ? next
        : {
            ...next,
            toolCallStatuses: {
              ...next.toolCallStatuses,
              [toolCallId]: reportedStatus,
            },
          };
    }
  }
};

export const reduceAcpThreadState = (
  state: AcpThreadState,
  event: AcpThreadEvent,
): AcpThreadState => {
  switch (event.type) {
    case "load-start":
      return state.loadState.type === "loading"
        ? state
        : { ...state, loadState: { type: "loading" } };

    case "load-ready":
      return state.loadState.type === "loading"
        ? { ...state, loadState: { type: "ready" } }
        : state;

    case "load-error":
      return { ...state, loadState: { type: "error", error: event.error } };

    case "connection":
      return {
        ...state,
        connectionState: event.connectionState,
        sessionId: event.sessionId,
        ...(event.agentInfo !== undefined && { agentInfo: event.agentInfo }),
        ...(event.agentCapabilities !== undefined && {
          agentCapabilities: event.agentCapabilities,
        }),
      };

    case "append-message":
      return withMessage(state, event.message);

    case "replace-messages": {
      const messagesById: Record<string, AcpThreadMessage> = {};
      const messageOrder: string[] = [];
      for (const message of event.messages) {
        messagesById[message.id] = message;
        messageOrder.push(message.id);
      }
      return {
        ...state,
        messagesById,
        messageOrder,
        headId: event.headId,
        run: { type: "idle" },
        permissions: {},
        toolCallStatuses: {},
      };
    }

    case "run-start":
      return {
        ...withMessage(state, event.message),
        run: { type: "running", assistantId: event.message.id },
      };

    case "session-update":
      return reduceSessionUpdate(state, event.update);

    case "permission-request": {
      const toolCallId = event.request.toolCall.toolCallId;
      const approval = {
        id: event.approvalId,
        options: event.request.options.map(permissionOptionToApprovalOption),
      };
      const next = patchAssistant(state, (message) => ({
        ...message,
        status: { type: "requires-action", reason: "tool-calls" },
        content: attachToolCallApproval(
          message.content,
          event.request.toolCall,
          approval,
        ) as AssistantPart[],
      }));
      return {
        ...next,
        permissions: {
          ...next.permissions,
          [event.approvalId]: {
            approvalId: event.approvalId,
            toolCallId,
            options: approval.options,
          },
        },
      };
    }

    case "permission-resolved": {
      const next = patchAssistantAt(state, event.approvalId, (message) => ({
        ...message,
        status: { type: "running" },
        content: resolveToolCallApproval(message.content, event.approvalId, {
          approved: event.approved,
          ...(event.optionId !== undefined && { optionId: event.optionId }),
          ...(event.cancelled && { resolution: "cancelled" as const }),
        }) as AssistantPart[],
      }));
      const { [event.approvalId]: _removed, ...remaining } = next.permissions;
      return { ...next, permissions: remaining };
    }

    case "permissions-cancelled": {
      const next = cancelPermissions(state);
      const assistant = runningAssistant(next);
      if (!assistant || assistant.status.type !== "requires-action")
        return next;
      return patchAssistant(next, (message) => ({
        ...message,
        status: { type: "running" },
      }));
    }

    case "run-end": {
      const next = cancelPermissions(state);
      const assistant = runningAssistant(next);
      if (!assistant) return { ...next, run: { type: "idle" } };
      return {
        ...next,
        messagesById: {
          ...next.messagesById,
          [assistant.id]: { ...assistant, status: event.status },
        },
        run: { type: "idle" },
      };
    }

    default:
      return state;
  }
};
