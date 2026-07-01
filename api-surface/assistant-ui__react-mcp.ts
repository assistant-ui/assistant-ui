import { ComponentPropsWithoutRef, ComponentRef, FC, PropsWithChildren, ReactNode } from "react";

import { Primitive } from "@radix-ui/react-primitive";

import { OAuthClientInformationFull, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";

type MCPAuthConfig = {
  type: "none";
} | {
  type: "bearer";
  token?: string | undefined;
} | {
  type: "oauth";
  scopes?: string[] | undefined;
  authorizationEndpoint?: string | undefined;
  tokenEndpoint?: string | undefined;
  registrationEndpoint?: string | undefined;
  clientId?: string | undefined;
  clientSecret?: string | undefined;
};

type MCPConnector = {
  id: string;
  name: string;
  url: string;
  icon?: string | undefined;
  auth: MCPAuthConfig;
  connectionTimeout?: number | undefined;
};

type MCPCustomServerRecord = {
  id: string;
  name: string;
  url: string;
  auth: MCPAuthConfig;
  connectionTimeout?: number | undefined;
  createdAt: number;
};

type MCPServerKind = "connector" | "custom";

type MCPConnectionState = "authPending" | "authRequired" | "connected" | "connecting" | "disconnected" | "error";

type MCPToolInfo = {
  name: string;
  description?: string | undefined;
  inputSchema: unknown;
};

type MCPServerState = {
  id: string;
  kind: MCPServerKind;
  name: string;
  url: string;
  icon?: string | undefined;
  connectionState: MCPConnectionState;
  lastError: {
    message: string;
  } | null;
  tools: MCPToolInfo[];
  authorizationUrl: string | null;
};

type MCPManagerState = {
  servers: MCPServerState[];
  connectors: MCPServerState[];
  customServers: MCPServerState[];
  isHydrated: boolean;
};

type MCPServerMethods = {
  getState: () => MCPServerState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  remove: () => Promise<void>;
  callTool: (name: string, args: unknown) => Promise<unknown>;
  readResource: (uri: string) => Promise<unknown>;
  completeAuth: (callbackUrl: string) => Promise<void>;
};

type MCPServerQuery = {
  id: string;
} | {
  kind: "connector";
  index: number;
} | {
  kind: "custom";
  index: number;
};

type MCPManagerMethods = {
  getState: () => MCPManagerState;
  server: (query: MCPServerQuery) => MCPServerMethods;
  connector: (query: {
    index: number;
  }) => MCPServerMethods;
  customServer: (query: {
    index: number;
  }) => MCPServerMethods;
  addCustomServer: (input: {
    name: string;
    url: string;
    auth: MCPAuthConfig;
    connectionTimeout?: number | undefined;
  }) => Promise<string>;
  removeServer: (id: string) => Promise<void>;
};

interface ScopeRegistry {
    mcp: {
      methods: MCPManagerMethods;
    };
    mcpServer: {
      methods: MCPServerMethods;
      meta: {
        source: "mcp";
        query: MCPServerQuery;
      };
    };
}

type MCPPersistedAuthState = {
  tokens?: OAuthTokens;
  clientInformation?: OAuthClientInformationFull;
  codeVerifier?: string;
  token?: string;
};

type ResourceElement<R, A extends readonly unknown[] = any[]> = {
  readonly hook: (...args: A) => R;
  readonly args: Readonly<A>;
  readonly key?: string | number;
  readonly deps?: readonly unknown[];
};

type Resource<R, A extends readonly unknown[] = any[]> = (...args: A) => ResourceElement<R, A>;

type MCPStorage = {
  loadCustomServers: () => Promise<MCPCustomServerRecord[]>;
  saveCustomServers: (records: MCPCustomServerRecord[]) => Promise<void>;
  loadAuthState: (serverId: string) => Promise<MCPPersistedAuthState | null>;
  saveAuthState: (serverId: string, state: MCPPersistedAuthState) => Promise<void>;
  clearAuthState: (serverId: string) => Promise<void>;
};

type MCPStorageElement = ResourceElement<MCPStorage>;

declare function defineConnector(connector: MCPConnector): MCPConnector;

declare const McpConnectorByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

declare const McpCustomServerByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

declare const McpServerByIdProvider: FC<PropsWithChildren<{
  id: string;
}>>;

type UseMcpOAuthCallbackOptions = {
  url?: string;
  onComplete?: (serverId: string) => void;
  onError?: (err: Error) => void;
};

type UseMcpOAuthCallbackResult = {
  status: "done" | "error" | "idle" | "running";
  serverId: string | null;
  error: Error | null;
};

declare function useMcpOAuthCallback(opts?: UseMcpOAuthCallbackOptions): UseMcpOAuthCallbackResult;

declare const McpOAuthCallback: FC<UseMcpOAuthCallbackOptions & {
  children?: (result: UseMcpOAuthCallbackResult) => ReactNode;
}>;

interface ClientMethods {
  [key: string | symbol]: (...args: any[]) => any;
}

type ClientMetaType = {
  source: ClientNames;
  query: Record<string, unknown>;
};

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

type ClientEventsType<K extends ClientNames> = Record<`${K}.${string}`, unknown>;

type ClientError<E extends string> = {
  methods: Record<E, () => E>;
  meta: {
    source: ClientNames;
    query: Record<E, E>;
  };
  events: Record<`${E}.`, E>;
};

type ValidateClient<K extends keyof ScopeRegistry> = ScopeRegistry[K] extends {
  methods: ClientMethods;
} ? "meta" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["meta"] extends ClientMetaType ? "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid meta type`> : "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid methods type`>;

type ClientSchemas = keyof ScopeRegistry extends never ? {
  "ERROR: No clients were defined": ClientError<"ERROR: No clients were defined">;
} : {
  [K in keyof ScopeRegistry]: ValidateClient<K>;
};

type ClientOutput<K extends ClientNames> = ClientSchemas[K]["methods"] & ClientMethods;

type ClientNames = keyof ClientSchemas extends infer U ? U : never;

type McpManagerResourceProps = {
  connectors?: MCPConnector[] | undefined;
  storage?: MCPStorageElement | undefined;
  oauthRedirectUri?: string | undefined;
  autoConnect?: boolean | undefined;
  connectionTimeout?: number | undefined;
};

declare const McpManagerResource: Resource<ClientOutput<"mcp">, [
  props: McpManagerResourceProps
]>;

type McpServerResourceProps = {
  id: string;
  kind: MCPServerKind;
  name: string;
  url: string;
  icon?: string | undefined;
  auth: MCPAuthConfig;
  storage: MCPStorage;
  redirectUri: string;
  autoConnect: boolean;
  connectionTimeout?: number | undefined;
  onRemove: () => Promise<void>;
};

declare const McpServerResource: Resource<ClientOutput<"mcpServer">, [
  props: McpServerResourceProps
]>;

type McpLocalStorageOptions = {
  keyPrefix?: string;
  storage?: Storage;
};

declare const McpLocalStorage: Resource<MCPStorage, [
  opts?: McpLocalStorageOptions | undefined
]>;

declare const McpMemoryStorage: Resource<MCPStorage, [
]>;

declare const McpCustomStorage: Resource<MCPStorage, [
  impl: MCPStorage
]>;

declare namespace McpManagerPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

declare const McpManagerPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace McpManagerPrimitiveConnectors {
  type Props = {
    children: (value: {
      server: MCPServerState;
    }) => ReactNode;
  };
}

declare const McpManagerPrimitiveConnectors: FC<McpManagerPrimitiveConnectors.Props>;

declare namespace McpManagerPrimitiveCustomServers {
  type Props = {
    children: (value: {
      server: MCPServerState;
    }) => ReactNode;
  };
}

declare const McpManagerPrimitiveCustomServers: FC<McpManagerPrimitiveCustomServers.Props>;

declare namespace McpManagerPrimitiveAddCustomTrigger {
  type Element = ComponentRef<typeof Primitive.button>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

declare const McpManagerPrimitiveAddCustomTrigger: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace manager_d_exports {
  export { McpManagerPrimitiveAddCustomTrigger as AddCustomTrigger, McpManagerPrimitiveConnectors as Connectors, McpManagerPrimitiveCustomServers as CustomServers, McpManagerPrimitiveRoot as Root };
}

declare namespace McpServerPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

declare const McpServerPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace McpServerPrimitiveName {
  type Element = ComponentRef<typeof Primitive.span>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

declare const McpServerPrimitiveName: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLSpanElement>>;

declare namespace McpServerPrimitiveStatus {
  type Element = ComponentRef<typeof Primitive.span>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

declare const McpServerPrimitiveStatus: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLSpanElement>>;

declare namespace McpServerPrimitiveError {
  type Element = ComponentRef<typeof Primitive.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

declare const McpServerPrimitiveError: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace McpServerPrimitiveIcon {
  type Element = ComponentRef<typeof Primitive.img>;
  type Props = Omit<ComponentPropsWithoutRef<typeof Primitive.img>, "alt" | "src"> & {
    src?: string;
    alt?: string;
  };
}

declare const McpServerPrimitiveIcon: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLImageElement> & import("react").ImgHTMLAttributes<HTMLImageElement> & {
  asChild?: boolean;
}, "ref">, "alt" | "src"> & {
  src?: string;
  alt?: string;
} & import("react").RefAttributes<HTMLImageElement>>;

declare namespace McpServerPrimitiveConnectButton {
  type Element = ComponentRef<typeof Primitive.button>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

declare const McpServerPrimitiveConnectButton: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace McpServerPrimitiveDisconnectButton {
  type Element = ComponentRef<typeof Primitive.button>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

declare const McpServerPrimitiveDisconnectButton: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace McpServerPrimitiveRemoveButton {
  type Element = ComponentRef<typeof Primitive.button>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

declare const McpServerPrimitiveRemoveButton: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace McpServerPrimitiveOAuthLink {
  type Element = ComponentRef<typeof Primitive.a>;
  type Props = Omit<ComponentPropsWithoutRef<typeof Primitive.a>, "href"> & {
    href?: string;
  };
}

declare const McpServerPrimitiveOAuthLink: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLAnchorElement> & import("react").AnchorHTMLAttributes<HTMLAnchorElement> & {
  asChild?: boolean;
}, "ref">, "href"> & {
  href?: string;
} & import("react").RefAttributes<HTMLAnchorElement>>;

declare const useMcpServerTool: () => MCPToolInfo;

declare namespace McpServerPrimitiveTools {
  type Props = {
    children: ReactNode | ((tool: MCPToolInfo) => ReactNode);
  };
}

declare const McpServerPrimitiveTools: FC<McpServerPrimitiveTools.Props>;

declare namespace McpServerPrimitiveToolName {
  type Element = ComponentRef<typeof Primitive.span>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

declare const McpServerPrimitiveToolName: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLSpanElement>>;

declare namespace server_d_exports {
  export { McpServerPrimitiveConnectButton as ConnectButton, McpServerPrimitiveDisconnectButton as DisconnectButton, McpServerPrimitiveError as Error, McpServerPrimitiveIcon as Icon, McpServerPrimitiveName as Name, McpServerPrimitiveOAuthLink as OAuthLink, McpServerPrimitiveRemoveButton as RemoveButton, McpServerPrimitiveRoot as Root, McpServerPrimitiveStatus as Status, McpServerPrimitiveToolName as ToolName, McpServerPrimitiveTools as Tools, useMcpServerTool };
}

declare namespace McpAddFormPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive.form>;
  type Props = Omit<ComponentPropsWithoutRef<typeof Primitive.form>, "onSubmit"> & {
    onSubmitted?: (id: string) => void;
    onCancel?: () => void;
  };
}

declare const McpAddFormPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLFormElement> & import("react").FormHTMLAttributes<HTMLFormElement> & {
  asChild?: boolean;
}, "ref">, "onSubmit"> & {
  onSubmitted?: (id: string) => void;
  onCancel?: () => void;
} & import("react").RefAttributes<HTMLFormElement>>;

declare namespace McpAddFormPrimitiveNameField {
  type Element = ComponentRef<typeof Primitive.input>;
  type Props = Omit<ComponentPropsWithoutRef<typeof Primitive.input>, "onChange" | "type" | "value">;
}

declare const McpAddFormPrimitiveNameField: import("react").ForwardRefExoticComponent<McpAddFormPrimitiveNameField.Props & import("react").RefAttributes<HTMLInputElement>>;

declare namespace McpAddFormPrimitiveUrlField {
  type Element = ComponentRef<typeof Primitive.input>;
  type Props = Omit<ComponentPropsWithoutRef<typeof Primitive.input>, "onChange" | "type" | "value">;
}

declare const McpAddFormPrimitiveUrlField: import("react").ForwardRefExoticComponent<McpAddFormPrimitiveUrlField.Props & import("react").RefAttributes<HTMLInputElement>>;

declare namespace McpAddFormPrimitiveAuthSelect {
  type Element = ComponentRef<typeof Primitive.select>;
  type Props = Omit<ComponentPropsWithoutRef<typeof Primitive.select>, "onChange" | "value">;
}

declare const McpAddFormPrimitiveAuthSelect: import("react").ForwardRefExoticComponent<McpAddFormPrimitiveAuthSelect.Props & import("react").RefAttributes<HTMLSelectElement>>;

type AddFormAuthType = MCPAuthConfig["type"];

declare namespace McpAddFormPrimitiveAuthFields {
  type Props = {
    children?: FC<{
      authType: AddFormAuthType;
    }>;
  };
}

declare const McpAddFormPrimitiveAuthFields: FC<McpAddFormPrimitiveAuthFields.Props>;

declare namespace McpAddFormPrimitiveSubmit {
  type Element = ComponentRef<typeof Primitive.button>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

declare const McpAddFormPrimitiveSubmit: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace McpAddFormPrimitiveCancel {
  type Element = ComponentRef<typeof Primitive.button>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

declare const McpAddFormPrimitiveCancel: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace McpAddFormPrimitiveError {
  type Element = ComponentRef<typeof Primitive.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

declare const McpAddFormPrimitiveError: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace addForm_d_exports {
  export { McpAddFormPrimitiveAuthFields as AuthFields, McpAddFormPrimitiveAuthSelect as AuthSelect, McpAddFormPrimitiveCancel as Cancel, McpAddFormPrimitiveError as Error, McpAddFormPrimitiveNameField as NameField, McpAddFormPrimitiveRoot as Root, McpAddFormPrimitiveSubmit as Submit, McpAddFormPrimitiveUrlField as UrlField };
}

declare namespace entry_root_exports {
  export { MCPAuthConfig, MCPConnectionState, MCPConnector, MCPCustomServerRecord, MCPManagerMethods, MCPManagerState, MCPPersistedAuthState, MCPServerKind, MCPServerMethods, MCPServerQuery, MCPServerState, MCPStorage, MCPStorageElement, MCPToolInfo, addForm_d_exports as McpAddFormPrimitive, McpConnectorByIndexProvider, McpCustomServerByIndexProvider, McpCustomStorage, McpLocalStorage, McpLocalStorageOptions, manager_d_exports as McpManagerPrimitive, McpManagerResource, McpManagerResourceProps, McpMemoryStorage, McpOAuthCallback, McpServerByIdProvider, server_d_exports as McpServerPrimitive, McpServerResource, McpServerResourceProps, UseMcpOAuthCallbackOptions, UseMcpOAuthCallbackResult, defineConnector, useMcpOAuthCallback };
}

export { entry_root_exports as entry_root };
