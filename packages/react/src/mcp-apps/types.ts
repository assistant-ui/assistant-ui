import type { CSSProperties } from "react";
import type {
  McpAppMetadata,
  ToolCallMessagePartMcpMetadata,
} from "@assistant-ui/core";
import type { SandboxOption } from "safe-content-frame";

export type { McpAppMetadata, ToolCallMessagePartMcpMetadata };

export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app" as const;

export const MCP_APP_PROTOCOL_VERSION = "0.1" as const;

export type McpAppResourceCSP = {
  connectDomains?: string[];
  resourceDomains?: string[];
  frameDomains?: string[];
  [k: string]: unknown;
};

export type McpAppResourceMeta = {
  prefersBorder?: boolean;
  csp?: McpAppResourceCSP;
  permissions?: Record<string, unknown>;
  [k: string]: unknown;
};

export type McpAppResource = {
  uri: string;
  mimeType: typeof MCP_APP_MIME_TYPE;
  html: string;
  meta?: McpAppResourceMeta;
};

export type McpAppDisplayMode = "inline" | "fullscreen" | "pip";

export type McpAppHostContext = {
  theme?: "light" | "dark";
  displayMode?: McpAppDisplayMode;
  availableDisplayModes?: McpAppDisplayMode[];
  [k: string]: unknown;
};

export type McpAppHostInfo = {
  name: string;
  version: string;
};

/**
 * What `McpAppRenderer` needs from its host — the data-plane operations
 * the widget can request. Provided by a host resource like
 * `McpAppsRemoteHost`.
 */
export type McpAppsHost = {
  loadResource: (params: { uri: string }) => Promise<McpAppResource>;
  callTool: (params: McpAppToolCallParams) => Promise<unknown>;
  readResource: (params: { uri: string }) => Promise<unknown>;
  listResources: (params?: unknown) => Promise<unknown>;
};

/**
 * Options for `McpAppsRemoteHost`. The host POSTs `{ method, params }` to
 * `url` and expects JSON responses. Method names sent:
 * - `mcp-apps/read-resource` (`{ uri }`) → `McpAppResource`
 * - `tools/call` (`{ name, arguments? }`) → tool result
 * - `resources/read` (`{ uri }`) → resource read result
 * - `resources/list` (`params?`) → list result
 */
export type McpAppsRemoteHostOptions = {
  url: string;
  fetch?: typeof fetch;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
};

export type McpAppToolCallParams = {
  name: string;
  arguments?: Record<string, unknown>;
};

export type McpAppBridgeHandlers = {
  allowedTools?: readonly string[];
  callTool?: (params: McpAppToolCallParams) => Promise<unknown> | unknown;
  readResource?: (params: { uri: string }) => Promise<unknown> | unknown;
  listResources?: (params?: unknown) => Promise<unknown> | unknown;
  openLink?: (params: { url: string }) => Promise<unknown> | unknown;
  sendMessage?: (params: unknown) => Promise<unknown> | unknown;
  updateModelContext?: (params: unknown) => Promise<unknown> | unknown;
  requestDisplayMode?: (params: {
    mode: McpAppDisplayMode;
  }) => Promise<{ mode: McpAppDisplayMode }> | { mode: McpAppDisplayMode };
  onSizeChange?: (params: { width?: number; height?: number }) => void;
  onInitialized?: () => void;
  onRequestTeardown?: (params: unknown) => void;
  onLog?: (params: unknown) => void;
  onError?: (error: Error) => void;
};

export type McpAppSandboxConfig = {
  sandbox?: SandboxOption[];
  useShadowDom?: boolean;
  enableBrowserCaching?: boolean;
  salt?: string;
  product?: string;
  className?: string;
  style?: CSSProperties;
  unsafeDocumentWrite?: boolean;
};

export type McpAppFrameProps = {
  app: McpAppMetadata;
  resource: McpAppResource;
  input?: unknown;
  output?: unknown;
  sandbox?: McpAppSandboxConfig | undefined;
  handlers?: McpAppBridgeHandlers | undefined;
  hostInfo?: McpAppHostInfo | undefined;
  hostContext?: McpAppHostContext | undefined;
  /**
   * Upper bound (in pixels) for the auto-resize height driven by the widget's
   * `notifications/size_changed`. Defaults to 800.
   */
  maxHeight?: number | undefined;
};

export type McpAppJsonRpcRequest = {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
};

export type McpAppJsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
};

export type McpAppJsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

export type McpAppJsonRpcResponse =
  | {
      jsonrpc: "2.0";
      id: string | number;
      result: unknown;
      error?: never;
    }
  | {
      jsonrpc: "2.0";
      id: string | number;
      result?: never;
      error: McpAppJsonRpcError;
    };

export type McpAppJsonRpcMessage =
  | McpAppJsonRpcRequest
  | McpAppJsonRpcNotification
  | McpAppJsonRpcResponse;
