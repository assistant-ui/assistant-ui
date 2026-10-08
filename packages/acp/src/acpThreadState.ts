import type {
  CompleteAttachment,
  MessageStatus,
  ThreadAssistantMessage,
  ThreadUserMessagePart,
  ToolApprovalOption,
} from "@assistant-ui/core";
import { isRecord } from "@assistant-ui/core/internal";
import type {
  AcpAgentCapabilities,
  AcpAvailableCommand,
  AcpConnectionState,
  AcpImplementation,
  AcpPermissionRequest,
  AcpPlanEntry,
  AcpSessionConfigOption,
  AcpSessionModeState,
  AcpSessionUpdate,
  AcpUsage,
} from "./types";
import {
  appendContentBlock,
  applyToolCallUpdate,
  attachToolCallApproval,
  permissionOptionToApprovalOption,
  resolveToolCallApproval,
} from "./conversions";

type AssistantPart = ThreadAssistantMessage["content"][number];

export type AcpLoadState =
  | { readonly type: "idle" }
  | { readonly type: "loading" }
  | { readonly type: "ready" };

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
  readonly assistantId: string;
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
  /**
   * A cancelled turn whose `session/prompt` has not settled yet. The agent may
   * still report its tool calls, and they land on this message.
   */
  readonly settlingAssistantId: string | undefined;
  readonly permissions: Readonly<Record<string, AcpPendingPermission>>;
  readonly plan: readonly AcpPlanEntry[] | undefined;
  readonly sessionTitle: string | undefined;
  readonly currentModeId: string | undefined;
  readonly availableCommands: readonly AcpAvailableCommand[] | undefined;
  readonly configOptions: readonly AcpSessionConfigOption[] | undefined;
  readonly usage: AcpUsage | undefined;
};

export type AcpThreadEvent =
  | { readonly type: "load-start" }
  | { readonly type: "load-ready" }
  | {
      readonly type: "connection";
      readonly connectionState: AcpConnectionState;
      readonly sessionId: string | undefined;
      readonly agentInfo?: AcpImplementation | undefined;
      readonly agentCapabilities?: AcpAgentCapabilities | undefined;
      readonly sessionModes?: AcpSessionModeState | undefined;
      readonly sessionConfigOptions?:
        | readonly AcpSessionConfigOption[]
        | undefined;
    }
  | { readonly type: "append-message"; readonly message: AcpThreadMessage }
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
  | {
      readonly type: "run-end";
      readonly assistantId: string;
      readonly status: MessageStatus;
      readonly settling?: boolean | undefined;
    }
  | { readonly type: "run-settled"; readonly assistantId: string }
  | { readonly type: "reset" };

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
  settlingAssistantId: undefined,
  permissions: {},
  plan: undefined,
  sessionTitle: undefined,
  currentModeId: undefined,
  availableCommands: undefined,
  configOptions: undefined,
  usage: undefined,
};

export const createAcpThreadState = (): AcpThreadState =>
  EMPTY_ACP_THREAD_STATE;

export const isAcpStateRunning = (state: AcpThreadState): boolean =>
  state.run.type === "running";

const RUNNING_STATUS: MessageStatus = { type: "running" };

const runningId = (state: AcpThreadState): string | undefined =>
  state.run.type === "running" ? state.run.assistantId : undefined;

const withMessage = (
  state: AcpThreadState,
  message: AcpThreadMessage,
): AcpThreadState => ({
  ...state,
  messageOrder: state.messagesById[message.id]
    ? state.messageOrder
    : [...state.messageOrder, message.id],
  messagesById: { ...state.messagesById, [message.id]: message },
  headId: message.id,
});

const patchAssistant = (
  state: AcpThreadState,
  assistantId: string | undefined,
  patch: (message: AcpAssistantMessage) => AcpAssistantMessage,
): AcpThreadState => {
  if (assistantId === undefined) return state;
  const message = state.messagesById[assistantId];
  if (message?.role !== "assistant") return state;
  const next = patch(message);
  if (next === message) return state;
  return {
    ...state,
    messagesById: { ...state.messagesById, [assistantId]: next },
  };
};

const resolveApproval = (
  message: AcpAssistantMessage,
  approvalId: string,
  resolution: Parameters<typeof resolveToolCallApproval>[2],
  stillWaiting: boolean,
): AcpAssistantMessage => {
  const content = resolveToolCallApproval(
    message.content,
    approvalId,
    resolution,
  );
  const resumes = !stillWaiting && message.status.type === "requires-action";
  if (!content && !resumes) return message;
  return {
    ...message,
    ...(content && { content }),
    ...(resumes && { status: RUNNING_STATUS }),
  };
};

const cancelPermissions = (state: AcpThreadState): AcpThreadState => {
  const pending = Object.values(state.permissions);
  if (pending.length === 0) return state;
  let next: AcpThreadState = { ...state, permissions: {} };
  for (const permission of pending) {
    next = patchAssistant(next, permission.assistantId, (message) =>
      resolveApproval(
        message,
        permission.approvalId,
        { resolution: "cancelled" },
        false,
      ),
    );
  }
  return next;
};

const reduceSessionUpdate = (
  state: AcpThreadState,
  update: AcpSessionUpdate,
): AcpThreadState => {
  switch (update.sessionUpdate) {
    case "agent_message_chunk":
    case "agent_thought_chunk": {
      if (state.settlingAssistantId !== undefined) return state;
      const kind =
        update.sessionUpdate === "agent_message_chunk" ? "text" : "reasoning";
      return patchAssistant(state, runningId(state), (message) => {
        const content = appendContentBlock(
          message.content,
          update.content,
          kind,
        );
        return content ? { ...message, content } : message;
      });
    }
    case "tool_call":
    case "tool_call_update": {
      if (typeof update.toolCallId !== "string") return state;
      return patchAssistant(
        state,
        state.settlingAssistantId ?? runningId(state),
        (message) => {
          const content = applyToolCallUpdate(message.content, update);
          return content ? { ...message, content } : message;
        },
      );
    }
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
    case "usage_update":
      return {
        ...state,
        usage: {
          used: update.used,
          size: update.size,
          cost: update.cost ?? null,
        },
      };
    default:
      return state;
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

    case "connection": {
      const sessionOpened =
        event.sessionId !== undefined && event.sessionId !== state.sessionId;
      return {
        ...state,
        connectionState: event.connectionState,
        sessionId: event.sessionId,
        ...(event.agentInfo !== undefined && { agentInfo: event.agentInfo }),
        ...(event.agentCapabilities !== undefined && {
          agentCapabilities: event.agentCapabilities,
        }),
        ...(sessionOpened && {
          currentModeId: event.sessionModes?.currentModeId,
          configOptions: event.sessionConfigOptions,
        }),
      };
    }

    case "append-message":
      return withMessage(state, event.message);

    case "run-start":
      return {
        ...withMessage(state, event.message),
        run: { type: "running", assistantId: event.message.id },
      };

    case "session-update":
      return isRecord(event.update)
        ? reduceSessionUpdate(state, event.update)
        : state;

    case "permission-request": {
      const assistantId = runningId(state);
      if (assistantId === undefined) return state;
      const { toolCall, options } = event.request;
      const approval = {
        id: event.approvalId,
        options: options.map(permissionOptionToApprovalOption),
      };
      const next = patchAssistant(state, assistantId, (message) => ({
        ...message,
        status: { type: "requires-action", reason: "tool-calls" },
        content: attachToolCallApproval(message.content, toolCall, approval),
      }));
      return {
        ...next,
        permissions: {
          ...next.permissions,
          [event.approvalId]: {
            approvalId: event.approvalId,
            assistantId,
            toolCallId: toolCall.toolCallId,
            options: approval.options,
          },
        },
      };
    }

    case "permission-resolved": {
      const permission = state.permissions[event.approvalId];
      if (!permission) return state;
      const { [event.approvalId]: _resolved, ...permissions } =
        state.permissions;
      const stillWaiting = Object.values(permissions).some(
        (other) => other.assistantId === permission.assistantId,
      );
      const next = patchAssistant(state, permission.assistantId, (message) =>
        resolveApproval(
          message,
          event.approvalId,
          {
            approved: event.approved,
            ...(event.optionId !== undefined && { optionId: event.optionId }),
            ...(event.cancelled && { resolution: "cancelled" as const }),
          },
          stillWaiting,
        ),
      );
      return { ...next, permissions };
    }

    case "permissions-cancelled":
      return cancelPermissions(state);

    case "run-end": {
      if (runningId(state) !== event.assistantId) return state;
      const next = patchAssistant(
        cancelPermissions(state),
        event.assistantId,
        (message) => ({ ...message, status: event.status }),
      );
      return {
        ...next,
        run: { type: "idle" },
        ...(event.settling && { settlingAssistantId: event.assistantId }),
      };
    }

    case "run-settled":
      return state.settlingAssistantId === event.assistantId
        ? { ...state, settlingAssistantId: undefined }
        : state;

    case "reset":
      return {
        ...EMPTY_ACP_THREAD_STATE,
        loadState: state.loadState,
        connectionState: state.connectionState,
        agentInfo: state.agentInfo,
        agentCapabilities: state.agentCapabilities,
      };

    default:
      return state;
  }
};
