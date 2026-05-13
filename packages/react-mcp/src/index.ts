// Scope augmentation must be imported for module declaration side-effect.
import "./mcp-scope";

// Primitives (namespaced)
export * as McpManagerPrimitive from "./primitives/manager";
export * as McpServerPrimitive from "./primitives/server";
export * as McpAddFormPrimitive from "./primitives/addForm";

// Context providers
export { MCPProvider, type MCPProviderProps } from "./context/MCPProvider";
export { MCPServerByIdProvider } from "./context/MCPServerByIdProvider";

// Connector helper
export { defineConnector } from "./connector";

// Hooks
export { useMcpManager } from "./hooks/useMcpManager";
export {
  useMcpTools,
  mcpRuntimeToolsToAiSdkTools,
  type UseMcpToolsOptions,
  type UseMcpToolsResult,
  type MCPRuntimeTool,
} from "./hooks/useMcpTools";
export {
  useMcpOAuthCallback,
  McpOAuthCallback,
  type UseMcpOAuthCallbackOptions,
  type UseMcpOAuthCallbackResult,
} from "./hooks/useMcpOAuthCallback";

// Resources (advanced)
export {
  MCPManagerResource,
  type MCPManagerResourceProps,
} from "./resources/MCPManagerResource";
export {
  MCPServerResource,
  type MCPServerResourceProps,
} from "./resources/MCPServerResource";

// Storage resources
export {
  MCPLocalStorage,
  type MCPLocalStorageOptions,
} from "./resources/storage/MCPLocalStorage";
export { MCPMemoryStorage } from "./resources/storage/MCPMemoryStorage";
export { MCPCustomStorage } from "./resources/storage/MCPCustomStorage";
export type {
  MCPStorage,
  MCPStorageElement,
} from "./resources/storage/types";

// Auth helpers
export type { MCPPersistedAuthState } from "./auth/types";

// Public types
export type {
  MCPAuthConfig,
  MCPConnector,
  MCPCustomServerRecord,
  MCPServerKind,
  MCPConnectionState,
  MCPToolInfo,
  MCPServerState,
  MCPManagerState,
  MCPServerMethods,
  MCPManagerMethods,
} from "./mcp-scope";
