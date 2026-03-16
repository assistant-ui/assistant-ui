// Main hook
export {
  useA2ARuntime,
  useA2ATask,
  useA2AArtifacts,
  useA2AAgentCard,
} from "./useA2ARuntime";
export type {
  UseA2ARuntimeOptions,
  UseA2AThreadListAdapter,
} from "./useA2ARuntime";

// Client
export { A2AClient, A2AError } from "./A2AClient";
export type { A2AClientOptions } from "./A2AClient";

// Protocol types
export type {
  A2ARole,
  A2APart,
  A2AMessage,
  A2ATaskState,
  A2ATaskStatus,
  A2AArtifact,
  A2ATask,
  A2AStreamEvent,
  A2ATaskStatusUpdateEvent,
  A2ATaskArtifactUpdateEvent,
  A2AAuthenticationInfo,
  A2ATaskPushNotificationConfig,
  A2AListTaskPushNotificationConfigsResponse,
  A2ASendMessageConfiguration,
  A2AListTasksRequest,
  A2AListTasksResponse,
  A2AErrorInfo,
  A2AApiKeySecurityScheme,
  A2AHttpAuthSecurityScheme,
  A2AAuthorizationCodeOAuthFlow,
  A2AClientCredentialsOAuthFlow,
  A2ADeviceCodeOAuthFlow,
  A2AImplicitOAuthFlow,
  A2APasswordOAuthFlow,
  A2AOAuthFlows,
  A2AOAuth2SecurityScheme,
  A2AOpenIdConnectSecurityScheme,
  A2AMutualTlsSecurityScheme,
  A2ASecurityScheme,
  A2ASecurityRequirement,
  A2AAgentCardSignature,
  A2AAgentSkill,
  A2AAgentCapabilities,
  A2AAgentInterface,
  A2AAgentCard,
} from "./types";
export { A2A_PROTOCOL_VERSION } from "./types";

// Conversion utilities (for advanced usage)
export {
  a2aPartToContent,
  a2aPartsToContent,
  a2aMessageToContent,
  taskStateToMessageStatus,
  contentPartsToA2AParts,
  isTerminalTaskState,
  isInterruptedTaskState,
} from "./conversions";
