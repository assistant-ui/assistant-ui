import "@assistant-ui/store";

export type MCPAuthConfig =
  | { type: "none" }
  | { type: "bearer"; token?: string | undefined }
  | {
      type: "oauth";
      scopes?: string[] | undefined;
      authorizationEndpoint?: string | undefined;
      tokenEndpoint?: string | undefined;
      registrationEndpoint?: string | undefined;
      clientId?: string | undefined;
      clientSecret?: string | undefined;
    };

export type MCPConnector = {
  id: string;
  name: string;
  url: string;
  icon?: string | undefined;
  auth: MCPAuthConfig;
};

export type MCPCustomServerRecord = {
  id: string;
  name: string;
  url: string;
  auth: MCPAuthConfig;
  createdAt: number;
};

export type MCPServerKind = "connector" | "custom";

export type MCPConnectionState =
  | "disconnected"
  | "authRequired"
  | "authPending"
  | "connecting"
  | "connected"
  | "error";

export type MCPToolInfo = {
  name: string;
  description?: string | undefined;
  inputSchema: unknown;
};

export type MCPServerState = {
  id: string;
  kind: MCPServerKind;
  name: string;
  url: string;
  icon?: string | undefined;
  connectionState: MCPConnectionState;
  lastError: { message: string } | null;
  tools: MCPToolInfo[];
  authorizationUrl: string | null;
};

export type MCPManagerState = {
  servers: MCPServerState[];
  connectors: MCPServerState[];
  customServers: MCPServerState[];
  isHydrated: boolean;
  canAddCustom: boolean;
};

export type MCPServerMethods = {
  getState: () => MCPServerState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  remove: () => Promise<void>;
  callTool: (name: string, args: unknown) => Promise<unknown>;
  /** Read a resource by URI. Returns the raw MCP `ReadResourceResult`. */
  readResource: (uri: string) => Promise<unknown>;
  /** OAuth only: pass full callback URL (e.g. window.location.href) */
  completeAuth: (callbackUrl: string) => Promise<void>;
};

export type MCPManagerMethods = {
  getState: () => MCPManagerState;
  server: (lookup: { id: string }) => MCPServerMethods;
  addCustomServer: (input: {
    name: string;
    url: string;
    auth: MCPAuthConfig;
  }) => Promise<string>;
  removeServer: (id: string) => Promise<void>;
};

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    mcp: {
      methods: MCPManagerMethods;
    };
    mcpServer: {
      methods: MCPServerMethods;
      meta: { source: "mcp"; query: { id: string } };
    };
  }
}
