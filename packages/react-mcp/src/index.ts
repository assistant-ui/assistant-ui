// Scope augmentation must be imported for module declaration side-effect.
import "./mcp-scope";

// Resource — the entry point. Mount via:
//   useAui({ mcp: McpManagerResource({ connectors }) })
export {
  McpManagerResource,
  type McpManagerResourceProps,
} from "./resources/McpManagerResource";

// Internal — exported for advanced cases (custom manager / lookup wiring).
export {
  McpServerResource,
  type McpServerResourceProps,
} from "./resources/McpServerResource";

// Connector helper
export { defineConnector } from "./connector";

// Storage resources
export {
  McpLocalStorage,
  type McpLocalStorageOptions,
} from "./resources/storage/McpLocalStorage";
export { McpMemoryStorage } from "./resources/storage/McpMemoryStorage";
export { McpCustomStorage } from "./resources/storage/McpCustomStorage";
export type { MCPStorage, MCPStorageElement } from "./resources/storage/types";

// Primitives (namespaced)
export * as McpManagerPrimitive from "./primitives/manager";
export * as McpServerPrimitive from "./primitives/server";
export * as McpAddFormPrimitive from "./primitives/addForm";

// Per-server scope providers. The iteration primitives wrap each item in
// the appropriate ByIndex provider. The ById provider is useful for
// rendering server UI outside the iteration primitives (static id known).
export { McpServerByIdProvider } from "./context/McpServerByIdProvider";
export { McpConnectorByIndexProvider } from "./context/McpConnectorByIndexProvider";
export { McpCustomServerByIndexProvider } from "./context/McpCustomServerByIndexProvider";

// OAuth callback
export {
  useMcpOAuthCallback,
  McpOAuthCallback,
  type UseMcpOAuthCallbackOptions,
  type UseMcpOAuthCallbackResult,
} from "./hooks/useMcpOAuthCallback";

// Auth state shape
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
  MCPServerQuery,
} from "./mcp-scope";
