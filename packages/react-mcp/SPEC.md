# @assistant-ui/react-mcp Specification

External API spec for the MCP integration package. Mirrors `@assistant-ui/react-o11y`: scope-augmented store types, tap-backed resources, Radix-style unstyled primitives.

## Scope (v1)

`react-mcp` is the **user-facing** configuration surface for MCP servers in an assistant-ui app. Two ways a server reaches the user:

- **Connector** — A preset declared by the app developer (`defineConnector(...)`). User just connects (and authenticates).
- **Custom server** — User supplies URL, name, auth, via `<McpAddFormPrimitive.*>`. Hide the add UI to disable.

Both share one connection lifecycle, one persisted state surface, and one tool registration path.

**Tools only.** v1 lists and invokes tools, registering them as **frontend tools** with `modelContext` so a connected chat runtime sees them automatically. Resources, prompts, sampling, server-pushed list updates, and resumable sessions are deferred.

**Three auth modes only:** OAuth (PKCE + RFC 7591 DCR), Bearer, None.

**No auto-reconnect.** Connect/disconnect is user-driven. A failed connection sets `connectionState: "error"` and stops; the UI surfaces a reconnect button.

## Design principles

- **One entry point.** `McpManagerResource` — mount via `useAui({ mcp: McpManagerResource(...) })`. No provider wrapper, no imperative hooks.
- **Tap-first.** Connection lifecycle, tool lists, and tool registration are tap state. Components read via `useAuiState`; methods called via `aui.mcp().x()` in callbacks (never during render).
- **One source of truth.** Persisted state goes through `MCPStorage` (a tap resource). `McpLocalStorage` is the default; swap by passing a different resource.
- **Unstyled primitives.** `data-*` attributes for styling, no CSS, no business logic — matches `SpanPrimitive`.
- **Token refresh is internal.** Refresh runs inside the OAuth strategy on 401. A failed refresh transitions to `authRequired`.

## Package layout

```
packages/react-mcp/
├── src/
│   ├── mcp-scope.ts                            ScopeRegistry augmentation
│   ├── connector.ts                            defineConnector()
│   ├── resources/
│   │   ├── McpManagerResource.ts               root; auto-mounts modelContext
│   │   ├── McpServerResource.ts                per-server
│   │   └── storage/
│   │       ├── McpLocalStorage.ts
│   │       ├── McpMemoryStorage.ts
│   │       └── McpCustomStorage.ts
│   ├── auth/
│   │   ├── types.ts                            MCPAuthConfig, MCPPersistedAuthState
│   │   ├── createOAuthProvider.ts              OAuthClientProvider implementation
│   │   └── buildHeaders.ts                     for bearer / none
│   ├── context/
│   │   └── McpServerByIdProvider.tsx           scopes a subtree to one server
│   ├── primitives/
│   │   ├── manager.ts                          barrel (McpManagerPrimitive.*)
│   │   ├── manager/{Root,Connectors,CustomServers,AddCustomTrigger}.tsx
│   │   ├── server.ts                           barrel (McpServerPrimitive.*)
│   │   ├── server/{Root,Icon,Name,Status,Error,ConnectButton,DisconnectButton,RemoveButton,OAuthLink,Tools,ToolName}.tsx
│   │   ├── addForm.ts                          barrel (McpAddFormPrimitive.*)
│   │   └── addForm/{Root,NameField,UrlField,AuthSelect,AuthFields,Submit,Cancel,Error}.tsx
│   ├── hooks/
│   │   └── useMcpOAuthCallback.tsx
│   └── index.ts
└── SPEC.md
```

## Public API surface

After the v0.1 simplification, the package's runtime surface is:

| Export | Purpose |
| --- | --- |
| `McpManagerResource` | Root tap resource — mount via `useAui({ mcp: McpManagerResource({...}) })`. Auto-registers connected tools with `modelContext`. |
| `McpServerResource` | Per-server resource (advanced — used internally by `McpManagerResource`) |
| `McpLocalStorage`, `McpMemoryStorage`, `McpCustomStorage` | Storage resource factories |
| `defineConnector` | Identity-typed helper for `MCPConnector` objects |
| `McpManagerPrimitive.*`, `McpServerPrimitive.*`, `McpAddFormPrimitive.*` | Unstyled UI primitives |
| `McpServerByIdProvider` | Scope a subtree to one server (used by iteration primitives; useful standalone) |
| `useMcpOAuthCallback`, `McpOAuthCallback` | OAuth callback page handlers |

There is no `MCPProvider` (mount the resource directly with `useAui`), no `useMcpManager` (`useAui().mcp()` in callbacks per the [tap skill](/.claude/skills/tap/SKILL.md)), no `useMcpTools` (auto-registered via `modelContext`), no `canAddCustom` (hide the add-UI to disable), no `mcpRuntimeToolsToAiSdkTools` (the runtime sees tools through `modelContext`).

## 1. Types

### 1.1 Connector

```ts
type MCPConnector = {
  id: string;
  name: string;
  url: string;
  icon?: string;
  auth: MCPAuthConfig;
};
defineConnector(c: MCPConnector): MCPConnector;
```

### 1.2 Custom server record (persisted)

```ts
type MCPCustomServerRecord = {
  id: string;
  name: string;
  url: string;
  auth: MCPAuthConfig;
  createdAt: number;
};
```

### 1.3 Live state

```ts
type MCPServerKind = "connector" | "custom";

type MCPConnectionState =
  | "disconnected" | "authRequired" | "authPending"
  | "connecting" | "connected" | "error";

type MCPToolInfo = { name: string; description?: string; inputSchema: unknown };

type MCPServerState = {
  id: string; kind: MCPServerKind; name: string; url: string;
  icon?: string; connectionState: MCPConnectionState;
  lastError: { message: string } | null;
  tools: MCPToolInfo[];
  authorizationUrl: string | null;
};

type MCPManagerState = {
  servers: MCPServerState[];
  connectors: MCPServerState[];
  customServers: MCPServerState[];
  isHydrated: boolean;
};
```

### 1.4 Scope registration

```ts
declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    mcp: { methods: MCPManagerMethods };
    mcpServer: {
      methods: MCPServerMethods;
      meta: { source: "mcp"; query: { id: string } };
    };
  }
}

type MCPManagerMethods = {
  getState: () => MCPManagerState;
  server: (lookup: { id: string }) => MCPServerMethods;
  addCustomServer: (input: { name: string; url: string; auth: MCPAuthConfig }) => Promise<string>;
  removeServer: (id: string) => Promise<void>;
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
```

`McpManagerResource` calls `attachTransformScopes` to **auto-mount the `modelContext` scope** when no ancestor provides it. When a chat runtime adapter (which mounts `modelContext` itself) is present, `react-mcp` registers its tools into the existing scope; otherwise it brings one along.

## 2. Storage

```ts
type MCPStorage = {
  loadCustomServers: () => Promise<MCPCustomServerRecord[]>;
  saveCustomServers: (records: MCPCustomServerRecord[]) => Promise<void>;
  loadAuthState: (serverId: string) => Promise<MCPPersistedAuthState | null>;
  saveAuthState: (serverId: string, state: MCPPersistedAuthState) => Promise<void>;
  clearAuthState: (serverId: string) => Promise<void>;
};

type MCPPersistedAuthState = {
  tokens?: OAuthTokens;
  clientInformation?: OAuthClientInformationFull;
  codeVerifier?: string;
  token?: string;   // bearer
};

McpLocalStorage(opts?: { keyPrefix?: string; storage?: Storage }): ResourceElement<MCPStorage>;
McpMemoryStorage(): ResourceElement<MCPStorage>;
McpCustomStorage(impl: MCPStorage): ResourceElement<MCPStorage>;
```

`McpLocalStorage` defaults to `globalThis.localStorage` under the `aui-mcp:` prefix. Tokens are plain text — production apps should use `McpCustomStorage` against a server endpoint.

## 3. Mounting

```tsx
// One line — no provider component.
function App() {
  const aui = useAui({
    mcp: McpManagerResource({
      connectors: [
        defineConnector({
          id: "linear",
          name: "Linear",
          url: "https://mcp.linear.app",
          auth: { type: "oauth", scopes: ["read"] },
        }),
      ],
      // optional:
      // storage: McpCustomStorage({ ... }),
      // autoConnect: false,
      // oauthRedirectUri: "https://app.example.com/mcp/callback",
    }),
  });
  return <AuiProvider value={aui}><Page /></AuiProvider>;
}
```

Defaults baked in:

- `storage` → `McpLocalStorage()`
- `oauthRedirectUri` → `${window.location.origin}/mcp/callback`
- `autoConnect` → `true`

## 4. Auth

```ts
type MCPAuthConfig =
  | { type: "none" }
  | { type: "bearer"; token?: string }
  | {
      type: "oauth";
      scopes?: string[];
      authorizationEndpoint?: string;
      tokenEndpoint?: string;
      registrationEndpoint?: string;
      clientId?: string;
      clientSecret?: string;
    };
```

### OAuth (PKCE + DCR)

The OAuth strategy implements the MCP SDK's `OAuthClientProvider`. The SDK handles discovery, DCR, PKCE, token exchange, and refresh; this provider only mediates `MCPStorage` reads/writes and the redirect step.

The server id is embedded in the OAuth `state` parameter so a single `/mcp/callback` route routes back to the right server without app-level wiring.

Flow:

1. `aui.mcp().server({ id }).connect()` → SDK starts auth.
2. `redirectToAuthorization` stores `authorizationUrl` on server state, transitions to `authRequired`. **The package does not auto-navigate** — render `<McpServerPrimitive.OAuthLink>` (an anchor) or open a popup.
3. User returns to `oauthRedirectUri`. Mount `<McpOAuthCallback />` there.
4. Callback reads `?state=&code=`, derives the server id, calls `server.completeAuth(window.location.href)`.
5. Server transitions to `connecting → connected`. Refresh tokens are rotated automatically; a failed refresh moves to `authRequired`.

## 5. Primitives

Same conventions as `SpanPrimitive`: `forwardRef`, Radix `Primitive.<tag>`, namespaced `Element`/`Props`, `data-*` rendering.

```tsx
import { McpManagerPrimitive, McpServerPrimitive, McpAddFormPrimitive } from "@assistant-ui/react-mcp";

<McpManagerPrimitive.Root>
  <McpManagerPrimitive.Connectors>
    <McpServerPrimitive.Root>
      <McpServerPrimitive.Icon />
      <McpServerPrimitive.Name />
      <McpServerPrimitive.Status />
      <McpServerPrimitive.ConnectButton />
      <McpServerPrimitive.DisconnectButton />
      <McpServerPrimitive.OAuthLink />
      <McpServerPrimitive.Error />
    </McpServerPrimitive.Root>
  </McpManagerPrimitive.Connectors>
  <McpManagerPrimitive.CustomServers>
    {/* same shape; RemoveButton is visible here */}
  </McpManagerPrimitive.CustomServers>
  <McpManagerPrimitive.AddCustomTrigger />
</McpManagerPrimitive.Root>
```

`Connectors` / `CustomServers` wrap each iteration in `McpServerByIdProvider`. Each interactive primitive renders only when the relevant state matches (`ConnectButton` only when `state ∈ {disconnected, error, authRequired}`, etc.).

The add form owns its own draft state and submits via `aui.mcp().addCustomServer(...)`:

```tsx
<McpAddFormPrimitive.Root onSubmitted={(id) => closeDialog()}>
  <McpAddFormPrimitive.NameField />
  <McpAddFormPrimitive.UrlField />
  <McpAddFormPrimitive.AuthSelect />
  <McpAddFormPrimitive.AuthFields />
  <McpAddFormPrimitive.Error />
  <McpAddFormPrimitive.Submit />
  <McpAddFormPrimitive.Cancel />
</McpAddFormPrimitive.Root>
```

## 6. Lifecycle

```
mount McpManagerResource
  → mount storage; await loadCustomServers()
  → for each (connector | custom): mount McpServerResource (disconnected)
  → if autoConnect && usable auth: server.connect()
  → on connect: state = connecting → connected; listTools()
  → toolkit memo recomputes; modelContext.register(toolkit) (re-registers on change)
```

`McpServerResource.connect()`:

1. `state = "connecting"`.
2. Build transport with the appropriate auth provider.
3. `client.connect(transport)` — on `UnauthorizedError` set `authorizationUrl` and transition to `"authRequired"`; on other errors set `lastError` and transition to `"error"`.
4. On success: `listTools()`, transition to `"connected"`.

`completeAuth(url)`: parse `code`, call `transport.finishAuth(code)`, retry `client.connect()`.

## 7. OAuth callback

```tsx
useMcpOAuthCallback(opts?): { status; serverId; error };

<McpOAuthCallback
  url?
  onComplete?: (serverId: string) => void
  onError?: (err: Error) => void
>
  {(result) => /* optional render */}
</McpOAuthCallback>;
```

Reads `window.location` (override with `url` prop), extracts `state`/`code`, resolves the server, runs `completeAuth`. Pure client-side — mount under `"use client"`.

## 8. Tool integration

Connected tools auto-register as **frontend tools** in `modelContext`. With names prefixed `serverId__toolName` (collisions across servers). When a chat runtime is mounted (anywhere in the tree), the model sees them and can call them — no manual wiring.

For manual invocation outside a chat, use the standard tap pattern:

```ts
const aui = useAui();
// inside an event handler:
const out = await aui.mcp().server({ id: "linear" }).callTool("search", { q: "..." });
```

## 9. Errors

Errors surface as rejected promises on the manager/server methods. Tool failures populate `lastError` on the server state and transition `connectionState` to `"error"`. The `McpServerPrimitive.Error` primitive renders `lastError.message`.

## 10. SSR

- `McpLocalStorage` no-ops on the server; `isHydrated` flips on mount.
- `McpOAuthCallback` requires the browser — must render under `"use client"`.

## 11. End-to-end example

```tsx
// app/providers.tsx
"use client";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { McpManagerResource, defineConnector } from "@assistant-ui/react-mcp";

const connectors = [
  defineConnector({
    id: "linear",
    name: "Linear",
    url: "https://mcp.linear.app",
    auth: { type: "oauth", scopes: ["read"] },
  }),
];

export function Providers({ children }: { children: React.ReactNode }) {
  const aui = useAui({ mcp: McpManagerResource({ connectors }) });
  return <AuiProvider value={aui}>{children}</AuiProvider>;
}
```

```tsx
// app/mcp/page.tsx — connector list with built-in primitives
"use client";
import { McpManagerPrimitive, McpServerPrimitive } from "@assistant-ui/react-mcp";

export default function McpPage() {
  return (
    <McpManagerPrimitive.Root>
      <h2>Connectors</h2>
      <McpManagerPrimitive.Connectors>
        <McpServerPrimitive.Root>
          <McpServerPrimitive.Name />
          <McpServerPrimitive.Status />
          <McpServerPrimitive.ConnectButton>Connect</McpServerPrimitive.ConnectButton>
          <McpServerPrimitive.OAuthLink>Authorize ↗</McpServerPrimitive.OAuthLink>
          <McpServerPrimitive.DisconnectButton>Disconnect</McpServerPrimitive.DisconnectButton>
          <McpServerPrimitive.Error />
        </McpServerPrimitive.Root>
      </McpManagerPrimitive.Connectors>
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
// app/chat/page.tsx — chat runtime sees MCP tools through modelContext
// (no useMcpTools / no adapter call — the manager registers them itself)
"use client";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

export function Chat() {
  const runtime = useChatRuntime({ api: "/api/chat" });
  /* … */
}
```

## 12. Deferred / non-goals

- Resources, prompts, sampling, server-pushed tool list updates
- Auto-reconnect (manual reconnect only)
- Tool enable/disable persistence
- Per-tool consent UI
- API-key / custom-headers / custom-strategy auth
- Default styling (apps theme via `data-*`; shadcn wrappers belong in `@assistant-ui/ui`)
- Storage encryption out of the box (escape hatch is `McpCustomStorage` against an app-controlled backend)
- Automatic `MCPAppRenderer` wiring — apps mount `Tools({ mcpApp: MCPAppRenderer({ ... }) })` themselves when they want widget rendering
