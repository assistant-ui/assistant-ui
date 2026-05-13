import type { CSSProperties, ReactNode } from "react";
import type { MCPAppMetadata } from "@assistant-ui/core";
import type { SandboxOption } from "safe-content-frame";
import type { ToolCallMessagePartProps } from "@assistant-ui/core/react";

export type { MCPAppMetadata };

export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app" as const;

export const MCP_APP_PROTOCOL_VERSION = "0.1" as const;

export type MCPAppResourceCSP = {
  connectDomains?: string[];
  resourceDomains?: string[];
  frameDomains?: string[];
  [k: string]: unknown;
};

export type MCPAppResourceMeta = {
  prefersBorder?: boolean;
  csp?: MCPAppResourceCSP;
  permissions?: Record<string, unknown>;
  [k: string]: unknown;
};

export type MCPAppResource = {
  uri: string;
  mimeType: typeof MCP_APP_MIME_TYPE;
  html: string;
  meta?: MCPAppResourceMeta;
};

export type MCPAppDisplayMode = "inline" | "fullscreen" | "pip";

export type MCPAppHostContext = {
  theme?: "light" | "dark";
  displayMode?: MCPAppDisplayMode;
  availableDisplayModes?: MCPAppDisplayMode[];
  [k: string]: unknown;
};

export type MCPAppHostInfo = {
  name: string;
  version: string;
};

export type MCPAppToolCallParams = {
  name: string;
  arguments?: Record<string, unknown>;
};

export type MCPAppBridgeHandlers = {
  allowedTools?: readonly string[];
  callTool?: (params: MCPAppToolCallParams) => Promise<unknown> | unknown;
  readResource?: (params: { uri: string }) => Promise<unknown> | unknown;
  listResources?: (params?: unknown) => Promise<unknown> | unknown;
  openLink?: (params: { url: string }) => Promise<unknown> | unknown;
  sendMessage?: (params: unknown) => Promise<unknown> | unknown;
  updateModelContext?: (params: unknown) => Promise<unknown> | unknown;
  requestDisplayMode?: (params: {
    mode: MCPAppDisplayMode;
  }) => Promise<{ mode: MCPAppDisplayMode }> | { mode: MCPAppDisplayMode };
  onSizeChange?: (params: { width?: number; height?: number }) => void;
  onInitialized?: () => void;
  onRequestTeardown?: (params: unknown) => void;
  onLog?: (params: unknown) => void;
  onError?: (error: Error) => void;
};

export type MCPAppSandboxConfig = {
  sandbox?: SandboxOption[];
  useShadowDom?: boolean;
  enableBrowserCaching?: boolean;
  salt?: string;
  product?: string;
  className?: string;
  style?: CSSProperties;
  unsafeDocumentWrite?: boolean;
};

export type MCPAppFrameProps = {
  app: MCPAppMetadata;
  resource: MCPAppResource;
  input?: unknown;
  output?: unknown;
  sandbox?: MCPAppSandboxConfig | undefined;
  handlers?: MCPAppBridgeHandlers | undefined;
  hostInfo?: MCPAppHostInfo | undefined;
  hostContext?: MCPAppHostContext | undefined;
};

export type MCPAppRendererProps = {
  part: ToolCallMessagePartProps;
  sandbox?: MCPAppSandboxConfig | undefined;
  resource?: MCPAppResource | undefined;
  loadResource?: ((app: MCPAppMetadata) => Promise<MCPAppResource>) | undefined;
  handlers?: MCPAppBridgeHandlers | undefined;
  hostInfo?: MCPAppHostInfo | undefined;
  hostContext?: MCPAppHostContext | undefined;
  /** Rendered when no MCP app is on the part, or while `loadResource` is in flight / failed (unless `loadingFallback` / `errorFallback` override). */
  fallback?: ReactNode | undefined;
  /** Rendered while `loadResource` is in flight. Defaults to `fallback`. */
  loadingFallback?: ReactNode | undefined;
  /** Rendered when `loadResource` rejects. Receives the error so callers can show a message. Defaults to `fallback`. */
  errorFallback?: ReactNode | ((error: Error) => ReactNode) | undefined;
};

export type MCPAppJsonRpcRequest = {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
};

export type MCPAppJsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
};

export type MCPAppJsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

export type MCPAppJsonRpcResponse =
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
      error: MCPAppJsonRpcError;
    };

export type MCPAppJsonRpcMessage =
  | MCPAppJsonRpcRequest
  | MCPAppJsonRpcNotification
  | MCPAppJsonRpcResponse;
