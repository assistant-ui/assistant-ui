import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "assistant-stream/utils";

export const ACP_PROTOCOL_VERSION = 1;

export type AcpAnnotations = {
  readonly audience?: readonly ("user" | "assistant")[] | null;
  readonly lastModified?: string | null;
  readonly priority?: number | null;
};

export type AcpTextContentBlock = {
  readonly type: "text";
  readonly text: string;
  readonly annotations?: AcpAnnotations | null;
};

export type AcpImageContentBlock = {
  readonly type: "image";
  readonly data: string;
  readonly mimeType: string;
  readonly uri?: string | null;
  readonly annotations?: AcpAnnotations | null;
};

export type AcpAudioContentBlock = {
  readonly type: "audio";
  readonly data: string;
  readonly mimeType: string;
  readonly annotations?: AcpAnnotations | null;
};

export type AcpResourceLinkContentBlock = {
  readonly type: "resource_link";
  readonly uri: string;
  readonly name: string;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly mimeType?: string | null;
  readonly size?: number | null;
  readonly annotations?: AcpAnnotations | null;
};

export type AcpTextResourceContents = {
  readonly uri: string;
  readonly text: string;
  readonly mimeType?: string | null;
};

export type AcpBlobResourceContents = {
  readonly uri: string;
  readonly blob: string;
  readonly mimeType?: string | null;
};

export type AcpResourceContents =
  | AcpTextResourceContents
  | AcpBlobResourceContents;

export type AcpEmbeddedResourceContentBlock = {
  readonly type: "resource";
  readonly resource: AcpResourceContents;
  readonly annotations?: AcpAnnotations | null;
};

export type AcpContentBlock =
  | AcpTextContentBlock
  | AcpImageContentBlock
  | AcpAudioContentBlock
  | AcpResourceLinkContentBlock
  | AcpEmbeddedResourceContentBlock;

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
  | { readonly type: "content"; readonly content: AcpContentBlock }
  | {
      readonly type: "diff";
      readonly path: string;
      readonly oldText?: string | null;
      readonly newText: string;
    }
  | { readonly type: "terminal"; readonly terminalId: string };

export type AcpToolCallLocation = {
  readonly path: string;
  readonly line?: number | null;
};

export type AcpToolCall = {
  readonly toolCallId: string;
  readonly title: string;
  readonly name?: string | null;
  readonly kind?: AcpToolKind;
  readonly status?: AcpToolCallStatus;
  readonly content?: readonly AcpToolCallContent[];
  readonly locations?: readonly AcpToolCallLocation[];
  readonly rawInput?: ReadonlyJSONValue;
  readonly rawOutput?: ReadonlyJSONValue;
};

export type AcpToolCallUpdate = {
  readonly toolCallId: string;
  readonly title?: string | null;
  readonly name?: string | null;
  readonly kind?: AcpToolKind | null;
  readonly status?: AcpToolCallStatus | null;
  readonly content?: readonly AcpToolCallContent[] | null;
  readonly locations?: readonly AcpToolCallLocation[] | null;
  readonly rawInput?: ReadonlyJSONValue;
  readonly rawOutput?: ReadonlyJSONValue;
};

export type AcpPlanEntryPriority = "high" | "medium" | "low";

export type AcpPlanEntryStatus = "pending" | "in_progress" | "completed";

export type AcpPlanEntry = {
  readonly content: string;
  readonly priority: AcpPlanEntryPriority;
  readonly status: AcpPlanEntryStatus;
};

export type AcpAvailableCommand = {
  readonly name: string;
  readonly description: string;
  readonly input?: { readonly hint: string } | null;
};

export type AcpSessionConfigOption = {
  readonly type: "select" | "boolean";
  readonly currentValue: string | boolean;
  readonly options?: readonly {
    readonly value: string;
    readonly name: string;
    readonly description?: string | null;
  }[];
} & ReadonlyJSONObject;

export type AcpCost = {
  readonly amount: number;
  readonly currency: string;
};

export type AcpUsage = {
  readonly used: number;
  readonly size: number;
  readonly cost?: AcpCost | null;
};

export type AcpSessionModeId = string;

export type AcpSessionMode = {
  readonly id: AcpSessionModeId;
  readonly name: string;
  readonly description?: string | null;
};

export type AcpSessionModeState = {
  readonly currentModeId: AcpSessionModeId;
  readonly availableModes: readonly AcpSessionMode[];
};

export type AcpSessionUpdate =
  | {
      readonly sessionUpdate: "user_message_chunk";
      readonly content: AcpContentBlock;
      readonly messageId?: string | null;
    }
  | {
      readonly sessionUpdate: "agent_message_chunk";
      readonly content: AcpContentBlock;
      readonly messageId?: string | null;
    }
  | {
      readonly sessionUpdate: "agent_thought_chunk";
      readonly content: AcpContentBlock;
      readonly messageId?: string | null;
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
      readonly sessionUpdate: "config_option_update";
      readonly configOptions: readonly AcpSessionConfigOption[];
    }
  | {
      readonly sessionUpdate: "session_info_update";
      readonly title?: string | null;
      readonly updatedAt?: string | null;
    }
  | ({ readonly sessionUpdate: "usage_update" } & AcpUsage);

export type AcpPermissionOptionKind =
  | "allow_once"
  | "allow_always"
  | "reject_once"
  | "reject_always";

export type AcpPermissionOption = {
  readonly optionId: string;
  readonly name: string;
  readonly kind: AcpPermissionOptionKind;
};

export type AcpPermissionRequest = {
  readonly sessionId: string;
  readonly toolCall: AcpToolCallUpdate;
  readonly options: readonly AcpPermissionOption[];
};

export type AcpPermissionOutcome =
  | { readonly outcome: "selected"; readonly optionId: string }
  | { readonly outcome: "cancelled" };

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

export type AcpMcpCapabilities = {
  readonly http?: boolean;
  readonly sse?: boolean;
};

export type AcpAgentCapabilities = {
  readonly loadSession?: boolean;
  readonly promptCapabilities?: AcpPromptCapabilities;
  readonly mcpCapabilities?: AcpMcpCapabilities;
};

export type AcpImplementation = {
  readonly name: string;
  readonly title?: string | null;
  readonly version: string;
};

export type AcpInitializeResponse = {
  readonly protocolVersion: number;
  readonly agentCapabilities?: AcpAgentCapabilities;
  readonly authMethods?: readonly AcpAuthMethod[];
  readonly agentInfo?: AcpImplementation | null;
};

export type AcpAuthMethod = {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
};

export type AcpClientCapabilities = {
  readonly fs?: {
    readonly readTextFile?: boolean;
    readonly writeTextFile?: boolean;
  };
  readonly terminal?: boolean;
};

export type AcpEnvVariable = {
  readonly name: string;
  readonly value: string;
};

export type AcpHttpHeader = {
  readonly name: string;
  readonly value: string;
};

export type AcpMcpServer =
  | {
      readonly type: "http";
      readonly name: string;
      readonly url: string;
      readonly headers: readonly AcpHttpHeader[];
    }
  | {
      readonly type: "sse";
      readonly name: string;
      readonly url: string;
      readonly headers: readonly AcpHttpHeader[];
    }
  | {
      readonly name: string;
      readonly command: string;
      readonly args: readonly string[];
      readonly env: readonly AcpEnvVariable[];
    };

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
  readonly configOptions: readonly AcpSessionConfigOption[] | undefined;
  readonly usage: AcpUsage | undefined;
};
