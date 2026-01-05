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
} from "./components/shared/action-buttons";

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
