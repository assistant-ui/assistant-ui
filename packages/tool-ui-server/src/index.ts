// Server SDK
export { createToolUIServer } from "./create-tool-ui-server";
export {
  createToolUIRuntime,
  emitAction,
  emitResult,
  getGlobals,
  onGlobalsChange,
  callTool,
  setWidgetState,
  requestDisplayMode,
  sendFollowUpMessage,
  requestModal,
  requestClose,
  openExternal,
  notifyIntrinsicHeight,
  uploadFile,
  getFileDownloadUrl,
  type ToolUIComponentConfig,
  type ToolUIRuntime,
} from "./create-tool-ui-runtime";
export type {
  ToolUIServerOptions,
  ToolWithUIConfig,
  UICapability,
} from "./types";

// OAuth types and schemas
export type {
  SecurityScheme,
  NoAuthSecurityScheme,
  OAuth2SecurityScheme,
  OAuthResourceServerConfig,
  TokenClaims,
  TokenValidationResult,
  AuthenticatedRequest,
  ToolExecutionContext,
} from "./types/oauth";

export {
  SecuritySchemeSchema,
  NoAuthSecuritySchemeSchema,
  OAuth2SecuritySchemeSchema,
  OAuthResourceServerConfigSchema,
  ProtectedResourceMetadataSchema,
  type ProtectedResourceMetadata,
} from "./schemas/oauth";

// OAuth module - comprehensive OAuth 2.1 support
export * as OAuth from "./oauth";

// Registry API types (for consumers building registry clients)
export {
  REGISTRY_BASE_URL,
  HOSTING_BASE_URL,
  RegistryErrorCodes,
  RateLimits,
  type ListServersRequest,
  type ListServersResponse,
  type ServerSummary,
  type ServerDetails,
  type GetServerResponse,
  type GetManifestResponse,
  type PublishRequest,
  type PublishResponse,
  type PublishErrorResponse,
  type GetCapabilityResponse,
} from "./registry-api";

// Schemas - Core shared schemas only
export {
  // Shared
  ToolUIIdSchema,
  type ToolUIId,
  ActionSchema,
  type Action,
  ActionButtonsPropsSchema,
  SerializableActionSchema,
  SerializableActionsSchema,
  type ActionsConfig,
  SerializableActionsConfigSchema,
  type SerializableActionsConfig,
  type SerializableAction,
} from "./schemas";

// Shared primitives
export {
  ActionButtons,
  type ActionButtonsProps,
} from "./remote/components/shared/action-buttons";

// Utils
export {
  cn,
  formatRelativeTime,
  formatCount,
  getDomain,
  formatDuration,
  normalizeActionsConfig,
  type ActionsProp,
} from "./utils";

// Hooks
export {
  useToolUI,
  type ToolUIRegistration,
  useActionButtons,
  type UseActionButtonsOptions,
  type UseActionButtonsResult,
  AUIProvider,
  useAUI,
  useTheme,
  useLocale,
  useDisplayMode,
  useToolInput,
  useToolOutput,
  useWidgetState,
  useCallTool,
  useRequestDisplayMode,
  useSendFollowUpMessage,
  useMaxHeight,
  useUserAgent,
  useSafeArea,
  useUserLocation,
  useToolResponseMetadata,
  useUploadFile,
  useGetFileDownloadUrl,
} from "./hooks";

// Remote components
export {
  RemoteToolUI,
  type RemoteToolUIProps,
  MCPToolUIProvider,
  type MCPToolUIProviderProps,
} from "./remote";

// Manifest schemas
export {
  ComponentDefinitionSchema,
  type ComponentDefinition,
  UIManifestSchema,
  type UIManifest,
  MCPUICapabilitySchema,
  type MCPUICapability,
} from "./schemas/manifest";

// Protocol types
export type {
  DisplayMode,
  Theme,
  WidgetState,
  AUIGlobals,
  AUIAPI,
  WindowAUI,
  CallToolResponse,
  ModalOptions,
  UserAgent,
  SafeArea,
  ParentToIframeMessage,
  IframeToParentMessage,
  UserLocation,
  ToolResponseMetadata,
  UploadFileResponse,
  GetFileDownloadUrlResponse,
} from "./types/protocol";

// Runtime utilities
export {
  generateBridgeScript,
  DEFAULT_GLOBALS,
} from "./runtime/bridge-script";
