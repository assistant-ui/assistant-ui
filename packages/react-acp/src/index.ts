export { useAcpRuntime } from "./useAcpRuntime";
export type { UseAcpRuntimeOptions } from "./useAcpRuntime";

export {
  useAcpAgentCapabilities,
  useAcpAgentInfo,
  useAcpAvailableCommands,
  useAcpConfigOptions,
  useAcpConnectionState,
  useAcpCurrentModeId,
  useAcpPlan,
  useAcpSessionId,
  useAcpSessionTitle,
  useAcpUsage,
} from "./hooks";

export { acpExtras } from "./acpExtras";

export {
  AcpClient,
  AcpError,
  autoAllowPermissionHandler,
  cancelPermissionHandler,
} from "./AcpClient";
export type {
  AcpClientOptions,
  AcpPermissionHandler,
  AcpWebSocketFactory,
  AcpWebSocketLike,
} from "./AcpClient";

// Lower-level building blocks, deliberately public as advanced API.
export { AcpThreadController } from "./AcpThreadController";
export type {
  AcpPermissionsMode,
  AcpThreadControllerLike,
  AcpThreadControllerOptions,
} from "./AcpThreadController";
export {
  createAcpThreadState,
  isAcpStateRunning,
  reduceAcpThreadState,
  EMPTY_ACP_THREAD_STATE,
} from "./acpThreadState";
export type {
  AcpAssistantMessage,
  AcpLoadState,
  AcpPendingPermission,
  AcpRunState,
  AcpThreadEvent,
  AcpThreadMessage,
  AcpThreadState,
  AcpUserMessage,
} from "./acpThreadState";
export {
  projectAcpThreadRepository,
  toThreadMessage,
  toThreadMessageLike,
} from "./acpMessageProjection";
export { useAcpControllerState } from "./useAcpControllerState";

// Protocol types
export type {
  AcpAgentCapabilities,
  AcpAnnotations,
  AcpAudioContentBlock,
  AcpAuthMethod,
  AcpAvailableCommand,
  AcpBlobResourceContents,
  AcpClientCapabilities,
  AcpConnectionState,
  AcpContentBlock,
  AcpCost,
  AcpEmbeddedResourceContentBlock,
  AcpEnvVariable,
  AcpExtras,
  AcpHttpHeader,
  AcpImageContentBlock,
  AcpImplementation,
  AcpInitializeResponse,
  AcpMcpCapabilities,
  AcpMcpServer,
  AcpPermissionOption,
  AcpPermissionOptionKind,
  AcpPermissionOutcome,
  AcpPermissionRequest,
  AcpPlanEntry,
  AcpPlanEntryPriority,
  AcpPlanEntryStatus,
  AcpPromptCapabilities,
  AcpResourceContents,
  AcpResourceLinkContentBlock,
  AcpSessionConfigOption,
  AcpSessionUpdate,
  AcpStopReason,
  AcpTextContentBlock,
  AcpTextResourceContents,
  AcpToolCall,
  AcpToolCallContent,
  AcpToolCallLocation,
  AcpToolCallStatus,
  AcpToolCallUpdate,
  AcpToolKind,
  AcpUsage,
} from "./types";
export { ACP_PROTOCOL_VERSION } from "./types";

// Conversion utilities (for advanced usage)
export {
  appendContentBlock,
  applySessionUpdateToContent,
  applyToolCallUpdate,
  attachToolCallApproval,
  buildToolCallPart,
  isAllowKind,
  isRejectKind,
  mergeToolCallPart,
  permissionOptionToApprovalOption,
  resolvePermissionOutcome,
  resolveToolCallApproval,
  stopReasonToMessageStatus,
  threadContentToAcpBlocks,
  toolCallContentToText,
} from "./conversions";
export type { AcpApprovalDecision } from "./conversions";
