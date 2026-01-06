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
  type ToolUIComponentConfig,
  type ToolUIRuntime,
} from "./create-tool-ui-runtime";
export type {
  ToolUIServerOptions,
  ToolWithUIConfig,
  UICapability,
} from "./types";

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
} from "./types/protocol";
