import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "assistant-stream/utils";

/** ACP v1 protocol version. */
export const ACP_PROTOCOL_VERSION = 1;

// ---------------------------------------------------------------------------
// Content blocks
// ---------------------------------------------------------------------------

export type AcpAnnotations = {
  readonly audience?: readonly ("user" | "assistant")[];
  readonly priority?: number;
};

export type AcpTextContentBlock = {
  readonly type: "text";
  readonly text: string;
  readonly annotations?: AcpAnnotations;
};

export type AcpImageContentBlock = {
  readonly type: "image";
  /** Base64-encoded image data. */
  readonly data: string;
  readonly mimeType: string;
  readonly uri?: string;
  readonly annotations?: AcpAnnotations;
};

export type AcpAudioContentBlock = {
  readonly type: "audio";
  /** Base64-encoded audio data. */
  readonly data: string;
  readonly mimeType: string;
  readonly annotations?: AcpAnnotations;
};

export type AcpResourceLink = {
  readonly uri: string;
  readonly name?: string;
  readonly description?: string;
  readonly mimeType?: string;
  readonly text?: string;
  /** Base64-encoded blob, when binary. */
  readonly blob?: string;
};

export type AcpResourceContentBlock = {
  readonly type: "resource";
  readonly resource: AcpResourceLink;
  readonly annotations?: AcpAnnotations;
};

export type AcpContentBlock =
  | AcpTextContentBlock
  | AcpImageContentBlock
  | AcpAudioContentBlock
  | AcpResourceContentBlock;

// ---------------------------------------------------------------------------
// Tool calls
// ---------------------------------------------------------------------------

export type AcpToolKind =
  | "read"
  | "edit"
  | "delete"
  | "move"
  | "search"
  | "execute"
  | "think"
  | "fetch"
  | "switch_mode"
  | "other";

export type AcpToolCallStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

export type AcpToolCallContent =
  | { readonly type: "content"; readonly content: readonly AcpContentBlock[] }
  | {
      readonly type: "diff";
      readonly path: string;
      readonly oldText?: string;
      readonly newText: string;
    };

export type AcpToolCallLocation = {
  readonly path: string;
  readonly line?: number;
};

export type AcpToolCall = {
  readonly toolCallId: string;
  readonly title?: string;
  readonly kind?: AcpToolKind;
  readonly status?: AcpToolCallStatus;
  readonly content?: readonly AcpToolCallContent[];
  readonly locations?: readonly AcpToolCallLocation[];
  readonly rawInput?: ReadonlyJSONValue;
  readonly rawOutput?: ReadonlyJSONValue;
};

/** All fields except toolCallId are optional in an update. */
export type AcpToolCallUpdate = {
  readonly toolCallId: string;
  readonly title?: string;
  readonly kind?: AcpToolKind;
  readonly status?: AcpToolCallStatus;
  readonly content?: readonly AcpToolCallContent[];
  readonly locations?: readonly AcpToolCallLocation[];
  readonly rawInput?: ReadonlyJSONValue;
  readonly rawOutput?: ReadonlyJSONValue;
};

// ---------------------------------------------------------------------------
// Session updates (server -> client notifications)
// ---------------------------------------------------------------------------

export type AcpPlanEntry = {
  readonly content: string;
  readonly priority: "high" | "medium" | "low";
  readonly status: "pending" | "in_progress" | "completed";
};

export type AcpAvailableCommand = {
  readonly name: string;
  readonly description: string;
  readonly input?: { readonly hint: string };
};

export type AcpSessionUpdate =
  | {
      readonly sessionUpdate: "agent_message_chunk";
      readonly content: AcpContentBlock;
      readonly stopReason?: AcpStopReason;
    }
  | {
      readonly sessionUpdate: "agent_thought_chunk";
      readonly content: AcpContentBlock;
    }
  | ({ readonly sessionUpdate: "tool_call" } & AcpToolCall)
  | ({ readonly sessionUpdate: "tool_call_update" } & AcpToolCallUpdate)
  | {
      readonly sessionUpdate: "plan";
      readonly entries: readonly AcpPlanEntry[];
    }
  | {
      readonly sessionUpdate: "available_commands_update";
      readonly availableCommands: readonly AcpAvailableCommand[];
    }
  | {
      readonly sessionUpdate: "current_mode_update";
      readonly currentModeId: string;
    }
  | {
      readonly sessionUpdate: "session_info_update";
      readonly title?: string;
      readonly updatedAt?: string;
    }
  | {
      readonly sessionUpdate: "user_message_chunk";
      readonly content: AcpContentBlock;
    };

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export type AcpPermissionOptionKind =
  | "allow_once"
  | "allow_always"
  | "reject_once"
  | "reject_always";

export type AcpPermissionOption = {
  readonly optionId: string;
  readonly name: string;
  readonly kind: AcpPermissionOptionKind;
  readonly description?: string;
};

export type AcpPermissionRequest = {
  readonly sessionId: string;
  readonly toolCall: AcpToolCallUpdate;
  readonly options: readonly AcpPermissionOption[];
};

export type AcpPermissionOutcome =
  | { readonly outcome: "selected"; readonly optionId: string }
  | { readonly outcome: "cancelled" };

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export type AcpStopReason =
  | "end_turn"
  | "max_tokens"
  | "max_turn_requests"
  | "refusal"
  | "cancelled";

export type AcpPromptCapabilities = {
  readonly image?: boolean;
  readonly audio?: boolean;
  readonly embeddedContext?: boolean;
};

export type AcpAgentCapabilities = {
  readonly loadSession?: boolean;
  readonly promptCapabilities?: AcpPromptCapabilities;
  readonly mcpCapabilities?: ReadonlyJSONObject;
};

export type AcpImplementation = {
  readonly name: string;
  readonly title?: string;
  readonly version: string;
};

export type AcpInitializeResponse = {
  readonly protocolVersion: number;
  readonly agentCapabilities?: AcpAgentCapabilities;
  readonly agentInfo?: AcpImplementation;
};

export type AcpClientCapabilities = {
  readonly fs?: {
    readonly readTextFile?: boolean;
    readonly writeTextFile?: boolean;
  };
  readonly terminal?: boolean;
};

export type AcpMcpServer = {
  readonly name: string;
  readonly command?: string;
  readonly args?: readonly string[];
  readonly url?: string;
};

// ---------------------------------------------------------------------------
// Client options / extras
// ---------------------------------------------------------------------------

export type AcpConnectionState = "disconnected" | "connecting" | "connected";

export type AcpExtras = {
  readonly connectionState: AcpConnectionState;
  readonly sessionId: string | undefined;
  readonly agentInfo: AcpImplementation | undefined;
  readonly agentCapabilities: AcpAgentCapabilities | undefined;
  readonly plan: readonly AcpPlanEntry[] | undefined;
  readonly sessionTitle: string | undefined;
  readonly currentModeId: string | undefined;
  readonly availableCommands: readonly AcpAvailableCommand[] | undefined;
};
