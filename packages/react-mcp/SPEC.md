# @assistant-ui/react-mcp Specification

External API spec for the MCP integration package. Mirrors `@assistant-ui/react-o11y`: scope-augmented store types, tap-backed resources, Radix-style unstyled primitives.

## Scope (v1)

`react-mcp` is the **user-facing** configuration surface for MCP servers in an assistant-ui app. Two ways a server reaches the user:

- **Connector** — A preset declared by the app developer (`defineConnector(...)`). User just connects (and authenticates).
- **Custom server** — User supplies URL, name, auth, via `<McpAddFormPrimitive.*>`.

Both share one connection lifecycle and one persisted state surface.

**Tools only.** v1 lists and invokes tools. Resources, prompts, sampling, server-pushed list updates, and resumable sessions are deferred.

**Three auth modes only:** OAuth (PKCE + RFC 7591 DCR), Bearer, None.

**No auto-reconnect.** Connect/disconnect is user-driven. A failed connection sets `connectionState: "error"` with `lastError` and stops; the UI surfaces a reconnect button.

## Design principles

- **One source of truth.** All persisted state goes through a `MCPStorage` tap resource. localStorage is the default; swap by passing a different resource element.
- **Tap-first.** Connection lifecycle and tool lists are tap state. Components read via `useAuiState`.
- **Unstyled primitives.** `data-*` attributes for styling, no CSS, no business logic in components — matches `SpanPrimitive`.
- **Token refresh is internal.** Refresh runs inside the OAuth strategy on 401. A failed refresh transitions to `authRequired`.

## Package layout

```
packages/react-mcp/
├── src/
│   ├── mcp-scope.ts                          ScopeRegistry augmentation
│   ├── connector.ts                          defineConnector()
│   ├── resources/
│   │   ├── MCPManagerResource.tsx
│   │   ├── MCPServerResource.tsx
│   │   └── storage/
│   │       ├── MCPLocalStorage.ts
│   │       ├── MCPMemoryStorage.ts
│   │       └── MCPCustomStorage.ts
│   ├── auth/
│   │   ├── types.ts                          MCPAuthConfig, MCPPersistedAuthState
│   │   ├── createOAuthProvider.ts            OAuthClientProvider implementation
│   │   └── buildHeaders.ts                   for bearer / none
│   ├── context/
│   │   ├── MCPProvider.tsx
│   │   └── MCPServerByIdProvider.tsx
│   ├── primitives/
│   │   ├── manager.ts                        barrel (McpManagerPrimitive)
│   │   ├── manager/
│   │   │   ├── McpManagerRoot.tsx
│   │   │   ├── McpManagerConnectors.tsx
│   │   │   ├── McpManagerCustomServers.tsx
│   │   │   └── McpManagerAddCustomTrigger.tsx
│   │   ├── server.ts                         barrel (McpServerPrimitive)
│   │   ├── server/
│   │   │   ├── McpServerRoot.tsx
│   │   │   ├── McpServerIcon.tsx
│   │   │   ├── McpServerName.tsx
│   │   │   ├── McpServerStatus.tsx
│   │   │   ├── McpServerError.tsx
│   │   │   ├── McpServerConnectButton.tsx
│   │   │   ├── McpServerDisconnectButton.tsx
│   │   │   ├── McpServerRemoveButton.tsx
│   │   │   ├── McpServerOAuthLink.tsx
│   │   │   ├── McpServerTools.tsx
│   │   │   └── McpServerToolName.tsx
│   │   ├── addForm.ts                        barrel (McpAddFormPrimitive)
│   │   └── addForm/
│   │       ├── McpAddFormRoot.tsx
│   │       ├── McpAddFormNameField.tsx
│   │       ├── McpAddFormUrlField.tsx
│   │       ├── McpAddFormAuthSelect.tsx
│   │       ├── McpAddFormAuthFields.tsx
│   │       ├── McpAddFormSubmit.tsx
│   │       ├── McpAddFormCancel.tsx
│   │       └── McpAddFormError.tsx
│   ├── hooks/
│   │   ├── useMcpManager.ts
│   │   ├── useMcpTools.ts
│   │   └── useMcpOAuthCallback.tsx
│   └── index.ts
├── package.json
├── tsconfig.json
└── SPEC.md
```

```jsonc
// package.json
{
  "name": "@assistant-ui/react-mcp",
  "dependencies": {
    "@assistant-ui/store": "workspace:*",
    "@assistant-ui/tap": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.29.0",
    "@radix-ui/react-primitive": "^2.1.4"
  },
  "peerDependencies": { "react": "^18 || ^19" }
}
```

Single `.` export.

---

## 1. Types

### 1.1 Connector

```ts
export type MCPConnector = {
  id: string;
  name: string;
  url: string;
  icon?: string;                       // URL only — keep types primitive
  auth: MCPAuthConfig;
};

export function defineConnector(c: MCPConnector): MCPConnector;
```

### 1.2 Custom server record (persisted)

```ts
export type MCPCustomServerRecord = {
  id: string;
  name: string;
  url: string;
  auth: MCPAuthConfig;
  createdAt: number;
};
```

### 1.3 Live state

```ts
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
  description?: string;
  inputSchema: unknown;
};

export type MCPServerState = {
  id: string;
  kind: MCPServerKind;
  name: string;
  url: string;
  icon?: string;
  connectionState: MCPConnectionState;
  lastError: { message: string } | null;
  tools: MCPToolInfo[];
  authorizationUrl: string | null;     // set when authRequired
};

export type MCPManagerState = {
  servers: MCPServerState[];
  connectors: MCPServerState[];
  customServers: MCPServerState[];
  isHydrated: boolean;
};
```

### 1.4 Scopes

```ts
// mcp-scope.ts
type MCPManagerMethods = {
  getState: () => MCPManagerState;
  server: (lookup: { id: string }) => MCPServerMethods;
  addCustomServer: (input: {
    name: string;
    url: string;
    auth: MCPAuthConfig;
  }) => Promise<string>;
  removeServer: (id: string) => Promise<void>;
};

type MCPServerMethods = {
  getState: () => MCPServerState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  remove: () => Promise<void>;
  callTool: (name: string, args: unknown) => Promise<unknown>;
  /** OAuth only: pass full callback URL (window.location.href) */
  completeAuth: (callbackUrl: string) => Promise<void>;
};

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    mcp: { methods: MCPManagerMethods };
    mcpServer: {
      methods: MCPServerMethods;
      meta: { source: "mcp"; query: { id: string } };
    };
  }
}
```

Two scopes. Storage is **not** a registered scope — it's a sub-resource of the manager, configured via `MCPProvider`'s `storage` prop.

---

## 2. Storage

A simple async interface, backed by a tap resource so swappability is uniform.

```ts
export type MCPStorage = {
  loadCustomServers: () => Promise<MCPCustomServerRecord[]>;
  saveCustomServers: (records: MCPCustomServerRecord[]) => Promise<void>;
  loadAuthState: (serverId: string) => Promise<MCPPersistedAuthState | null>;
  saveAuthState: (serverId: string, state: MCPPersistedAuthState) => Promise<void>;
  clearAuthState: (serverId: string) => Promise<void>;
};

export type MCPPersistedAuthState = {
  // OAuth
  tokens?: { access_token: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string };
  clientInformation?: { client_id: string; client_secret?: string; [k: string]: unknown };
  codeVerifier?: string;
  // Bearer
  token?: string;
};

export const MCPLocalStorage: (opts?: {
  keyPrefix?: string;                          // default "aui-mcp"
  storage?: Storage;                           // default globalThis.localStorage
}) => ResourceElement<{ getState: () => { isHydrated: boolean } } & MCPStorage>;

export const MCPMemoryStorage: () => ResourceElement<{ getState: () => { isHydrated: boolean } } & MCPStorage>;

export const MCPCustomStorage: (impl: MCPStorage) => ResourceElement<{ getState: () => { isHydrated: boolean } } & MCPStorage>;
```

The localStorage default is fine for prototyping; production apps with security requirements should pass `MCPCustomStorage` backed by a server endpoint. This is documented, not papered over.

---

## 3. Provider

```tsx
export type MCPProviderProps = {
  connectors?: MCPConnector[];
  storage?: ResourceElement<MCPStorage & { getState: () => { isHydrated: boolean } }>;
  /** If false, addCustomServer rejects and McpManagerPrimitive.AddCustomTrigger is data-disabled. Default true. */
  canAddCustom?: boolean;
  /** Where the OAuth server redirects back. Used to construct the redirect_uri. Default: window.location.origin + "/mcp/callback". */
  oauthRedirectUri?: string;
  /** Connect on mount if a valid token / DCR registration exists. Default true. */
  autoConnect?: boolean;
  children: React.ReactNode;
};

export const MCPProvider: React.FC<MCPProviderProps>;

export const MCPServerByIdProvider: React.FC<{ id: string; children: React.ReactNode }>;
```

`MCPProvider` mounts `MCPManagerResource` and re-exposes via `AuiProvider`. Composes safely under an outer `AuiProvider` (adds only the `mcp` scope).

---

## 4. Auth

```ts
export type MCPAuthConfig =
  | { type: "none" }
  | { type: "bearer"; token?: string }    // if absent, user is prompted in the connect flow
  | {
      type: "oauth";
      scopes?: string[];
      /** Override OAuth metadata discovery. */
      authorizationEndpoint?: string;
      tokenEndpoint?: string;
      registrationEndpoint?: string;
      /** Static client (skip DCR). */
      clientId?: string;
      clientSecret?: string;
    };
```

### 4.1 OAuth implementation

`createOAuthProvider(serverId, config, storage, redirectUri)` returns an `OAuthClientProvider` (from `@modelcontextprotocol/sdk/client/auth.js`). The SDK's `StreamableHTTPClientTransport` handles discovery, DCR, PKCE, and code exchange; this provider only implements load/save against `MCPStorage`.

Flow:
1. `server.connect()` builds the transport with the provider and calls `client.connect(transport)`.
2. If the SDK needs auth, our `redirectToAuthorization(url)` **does not navigate** — it stores `authorizationUrl` on the server state and transitions to `authRequired`. The UI renders `<McpServerPrimitive.OAuthLink>` (anchor) or the app opens a popup.
3. The user authorizes and is redirected to `oauthRedirectUri`. The app renders `<McpOAuthCallback>` there, which calls `server.completeAuth(window.location.href)`.
4. `completeAuth` invokes `transport.finishAuth(code)` (MCP SDK API), retries the connection.
5. On 401 mid-session, the SDK calls our `tokens()`; if the access token is expired, the SDK refreshes via the token endpoint and saves through `saveTokens()`. A refresh failure transitions to `authRequired`.

### 4.2 Bearer

If `auth.type === "bearer"` and `token` is present, transport is constructed with `requestInit: { headers: { Authorization: `Bearer ${token}` } }`. If `token` is absent on a custom record, the user is prompted via the add form (the form's auth fields include a token input for bearer).

### 4.3 None

No headers added.

---

## 5. Primitives

All follow the `SpanPrimitive` pattern: `forwardRef`, Radix `Primitive.<tag>`, namespaced `Element`/`Props`, data-attribute rendering. Imported as:

```tsx
import {
  McpManagerPrimitive,
  McpServerPrimitive,
  McpAddFormPrimitive,
} from "@assistant-ui/react-mcp";
```

### 5.1 `McpManagerPrimitive.*`

```tsx
<McpManagerPrimitive.Root>                         {/* data-mcp-hydrated, data-can-add-custom */}
  <McpManagerPrimitive.Connectors>                 {/* iterates connectors; provides MCPServerByIdProvider per item */}
    {/* children rendered once per connector */}
  </McpManagerPrimitive.Connectors>
  <McpManagerPrimitive.CustomServers>
    {/* children rendered once per custom server */}
  </McpManagerPrimitive.CustomServers>
  <McpManagerPrimitive.AddCustomTrigger />         {/* button; data-disabled when canAddCustom=false */}
</McpManagerPrimitive.Root>
```

`Connectors` / `CustomServers` accept children directly (RenderChildrenWithAccessor pattern from store) — each child render is wrapped in `MCPServerByIdProvider` so nested `<McpServerPrimitive.*>` works.

### 5.2 `McpServerPrimitive.*`

```tsx
<McpServerPrimitive.Root>                          {/* data-server-id, data-kind, data-connection-state */}
  <McpServerPrimitive.Icon />
  <McpServerPrimitive.Name />
  <McpServerPrimitive.Status />                    {/* data-state="<connectionState>" */}
  <McpServerPrimitive.Error />                     {/* visible only when lastError !== null */}

  <McpServerPrimitive.ConnectButton />             {/* visible when state ∈ {disconnected, error, authRequired} */}
  <McpServerPrimitive.DisconnectButton />          {/* visible when state ∈ {connected, connecting, authPending} */}
  <McpServerPrimitive.RemoveButton />              {/* visible only when kind === "custom" */}

  <McpServerPrimitive.OAuthLink />                 {/* anchor to authorizationUrl, visible when authRequired */}

  <McpServerPrimitive.Tools>                       {/* iterates tools */}
    <McpServerPrimitive.ToolName />                {/* used inside Tools children */}
  </McpServerPrimitive.Tools>
</McpServerPrimitive.Root>
```

No `Description`, no `Resources`, no `ToolToggle` in v1.

### 5.3 `McpAddFormPrimitive.*`

```tsx
<McpAddFormPrimitive.Root onSubmitted={(id) => ...}>
  <McpAddFormPrimitive.NameField />
  <McpAddFormPrimitive.UrlField />
  <McpAddFormPrimitive.AuthSelect />               {/* none | bearer | oauth */}
  <McpAddFormPrimitive.AuthFields />               {/* conditionally renders bearer token input */}
  <McpAddFormPrimitive.Error />
  <McpAddFormPrimitive.Submit />
  <McpAddFormPrimitive.Cancel />
</McpAddFormPrimitive.Root>
```

`Root` owns local form draft state. Submit calls `mcp.addCustomServer(...)` and calls `onSubmitted(id)`. Apps wrap this in their own dialog/sheet.

---

## 6. Lifecycle

`MCPManagerResource`:

```
mount
  → mount storage resource
  → wait for storage isHydrated
  → loadCustomServers()
  → for each (connector | custom):
       create MCPServerResource (state: disconnected)
       if autoConnect && hasUsableAuth: server.connect()
```

`MCPServerResource.connect()`:

```
state = "connecting"
authProvider = createAuthForRecord(record, storage, redirectUri)
transport = new StreamableHTTPClientTransport(url, { authProvider })
client = new Client({ name: "assistant-ui-mcp", version })
try {
  await client.connect(transport)        // throws UnauthorizedError on first OAuth
  tools = await client.listTools()
  state = "connected"
} catch (UnauthorizedError) {
  // authorizationUrl already set by our redirectToAuthorization
  state = "authRequired"
} catch (other) {
  lastError = { message }
  state = "error"
}
```

`completeAuth(url)`:

```
state = "authPending"
code = new URL(url).searchParams.get("code")
await transport.finishAuth(code)         // SDK exchanges code, saves tokens via our provider
await client.connect(transport)
tools = await client.listTools()
state = "connected"
```

---

## 7. Hooks

```ts
/** Imperative accessor. Equivalent to useAui().mcp(). */
export function useMcpManager(): MCPManagerMethods;

/** Aggregates tools across connected servers; returns a runtime-agnostic shape. */
export function useMcpTools(opts?: {
  filter?: (server: MCPServerState) => boolean;
}): { tools: Record<string, MCPRuntimeTool>; byServer: Record<string, MCPRuntimeTool[]> };

export type MCPRuntimeTool = {
  serverId: string;
  name: string;
  description?: string;
  parameters: unknown;
  execute: (args: unknown) => Promise<unknown>;
};

/** Reads window.location, resolves the target server from state param, calls completeAuth. */
export function useMcpOAuthCallback(opts?: {
  url?: string;
  onComplete?: (serverId: string) => void;
  onError?: (err: Error) => void;
}): { status: "idle" | "running" | "done" | "error"; serverId: string | null; error: Error | null };

export const McpOAuthCallback: React.FC<{
  url?: string;
  onComplete?: (serverId: string) => void;
  onError?: (err: Error) => void;
  children?: (status: ReturnType<typeof useMcpOAuthCallback>) => React.ReactNode;
}>;
```

State subscription via existing `useAuiState`. Tool name collision is resolved with `serverId__toolName` prefixing in `useMcpTools` (v1 default; not configurable).

---

## 8. Runtime integration

`react-mcp` does not auto-wire tools into any runtime. The app reads `useMcpTools().tools` and feeds it into its chat runtime — see §11. A small adapter `mcpRuntimeToolsToAiSdkTools(tools)` is exported (zero runtime dependency on `ai`).

---

## 9. Errors

```ts
export class MCPError extends Error { code: string }
export class MCPAuthError extends MCPError { serverId: string }
```

All async methods reject with one of these. `<McpServerPrimitive.Error>` renders `lastError.message`.

---

## 10. SSR

- `MCPLocalStorage` returns `isHydrated: false` during SSR and flips on mount.
- `McpOAuthCallback` reads `window.location` — must be client-only.

---

## 11. End-to-end example

```tsx
// app/providers.tsx
import { MCPProvider, defineConnector } from "@assistant-ui/react-mcp";

const connectors = [
  defineConnector({
    id: "linear",
    name: "Linear",
    url: "https://mcp.linear.app",
    auth: { type: "oauth", scopes: ["read"] },
    icon: "/icons/linear.svg",
  }),
];

export function Providers({ children }) {
  return (
    <MCPProvider connectors={connectors} oauthRedirectUri="http://localhost:3000/mcp/callback">
      {children}
    </MCPProvider>
  );
}
```

```tsx
// app/mcp/page.tsx
"use client";
import { McpManagerPrimitive, McpServerPrimitive, McpAddFormPrimitive } from "@assistant-ui/react-mcp";

export default function McpPage() {
  return (
    <McpManagerPrimitive.Root>
      <h2>Connectors</h2>
      <McpManagerPrimitive.Connectors>
        <McpServerPrimitive.Root>
          <McpServerPrimitive.Icon />
          <McpServerPrimitive.Name />
          <McpServerPrimitive.Status />
          <McpServerPrimitive.ConnectButton>Connect</McpServerPrimitive.ConnectButton>
          <McpServerPrimitive.DisconnectButton>Disconnect</McpServerPrimitive.DisconnectButton>
          <McpServerPrimitive.OAuthLink>Authorize</McpServerPrimitive.OAuthLink>
          <McpServerPrimitive.Error />
        </McpServerPrimitive.Root>
      </McpManagerPrimitive.Connectors>

      <h2>Custom servers</h2>
      <McpManagerPrimitive.CustomServers>
        <McpServerPrimitive.Root>
          <McpServerPrimitive.Name />
          <McpServerPrimitive.Status />
          <McpServerPrimitive.ConnectButton>Connect</McpServerPrimitive.ConnectButton>
          <McpServerPrimitive.DisconnectButton />
          <McpServerPrimitive.RemoveButton>Remove</McpServerPrimitive.RemoveButton>
        </McpServerPrimitive.Root>
      </McpManagerPrimitive.CustomServers>

      <McpManagerPrimitive.AddCustomTrigger>Add server</McpManagerPrimitive.AddCustomTrigger>
      {/* In a dialog elsewhere: */}
      <McpAddFormPrimitive.Root onSubmitted={() => /* close dialog */ undefined}>
        <McpAddFormPrimitive.NameField />
        <McpAddFormPrimitive.UrlField />
        <McpAddFormPrimitive.AuthSelect />
        <McpAddFormPrimitive.AuthFields />
        <McpAddFormPrimitive.Error />
        <McpAddFormPrimitive.Submit>Add</McpAddFormPrimitive.Submit>
        <McpAddFormPrimitive.Cancel>Cancel</McpAddFormPrimitive.Cancel>
      </McpAddFormPrimitive.Root>
    </McpManagerPrimitive.Root>
  );
}
```

```tsx
// app/mcp/callback/page.tsx
"use client";
import { McpOAuthCallback } from "@assistant-ui/react-mcp";
import { useRouter } from "next/navigation";

export default function Callback() {
  const router = useRouter();
  return <McpOAuthCallback onComplete={() => router.replace("/mcp")} />;
}
```

```tsx
// app/chat/page.tsx
"use client";
import { useMcpTools, mcpRuntimeToolsToAiSdkTools } from "@assistant-ui/react-mcp";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

export function Chat() {
  const { tools } = useMcpTools();
  const runtime = useChatRuntime({ api: "/api/chat", tools: mcpRuntimeToolsToAiSdkTools(tools) });
  /* … */
}
```

---

## 12. Deferred / non-goals

- Resources, prompts, sampling, server-pushed tool list updates
- Auto-reconnect (manual reconnect only)
- Tool enable/disable persistence
- Per-tool consent UI
- API-key / custom-headers / custom-strategy auth — bearer + headers gets folded in later if asked
- Default styling (apps theme via `data-*`; shadcn wrappers belong in `@assistant-ui/ui`)
- Storage encryption out of the box (escape hatch is `MCPCustomStorage` against an app-controlled backend)
