// Main hook
export { useAcpRuntime } from "./useAcpRuntime";
export type { UseAcpRuntimeOptions } from "./useAcpRuntime";
export {
  useAcpConnectionState,
  useAcpSessionId,
  useAcpAgentInfo,
  useAcpPlan,
  useAcpSessionTitle,
  useAcpCurrentModeId,
  useAcpAvailableCommands,
} from "./hooks";

// Client
export { AcpClient, AcpError, autoAllowPermissionHandler } from "./AcpClient";
export type {
  AcpClientOptions,
  AcpPermissionHandler,
  AcpWebSocketFactory,
  AcpWebSocketLike,
} from "./AcpClient";

// Runtime core (advanced usage)
export { AcpThreadRuntimeCore } from "./AcpThreadRuntimeCore";
export type {
  AcpThreadRuntimeCoreOptions,
  AcpPermissionsMode,
} from "./AcpThreadRuntimeCore";
export { acpExtras } from "./acpExtras";

// Protocol types
export type {
  AcpAnnotations,
  AcpTextContentBlock,
  AcpImageContentBlock,
  AcpAudioContentBlock,
  AcpResourceLink,
  AcpResourceContentBlock,
  AcpContentBlock,
  AcpToolKind,
  AcpToolCallStatus,
  AcpToolCallContent,
  AcpToolCallLocation,
  AcpToolCall,
  AcpToolCallUpdate,
  AcpPlanEntry,
  AcpAvailableCommand,
  AcpSessionUpdate,
  AcpPermissionOptionKind,
  AcpPermissionOption,
  AcpPermissionRequest,
  AcpPermissionOutcome,
  AcpStopReason,
  AcpPromptCapabilities,
  AcpAgentCapabilities,
  AcpImplementation,
  AcpInitializeResponse,
  AcpClientCapabilities,
  AcpMcpServer,
  AcpConnectionState,
  AcpExtras,
} from "./types";
export { ACP_PROTOCOL_VERSION } from "./types";

// Conversion utilities (for advanced usage)
export {
  threadContentToAcpBlocks,
  toolCallContentToText,
  stopReasonToMessageStatus,
  acpToolStatusToPartStatus,
  permissionOptionToApprovalOption,
  isAllowKind,
  AcpContentAccumulator,
} from "./conversions";
