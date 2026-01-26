---
title: Migrate OpenAI App
---

# Migrating from OpenAI Apps SDK to MCP Apps SDK

This reference maps OpenAI Apps SDK concepts to their MCP Apps SDK (`@modelcontextprotocol/ext-apps`) equivalents. Use the tables below for quick lookup during migration, and refer to the code examples for complete before/after comparisons.

This guide covers server-side changes first (metadata, tools, resources), then client-side changes (setup, context, events).

> [!NOTE]
> Some OpenAI Apps SDK features don't have MCP equivalents yet. These are marked "Not yet implemented" in the tables below.

## Server-Side

The server-side changes involve updating metadata structure and using helper functions.

### Quick Start Comparison

| OpenAI Apps SDK                                            | MCP Apps SDK                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| Flat metadata keys (`_meta["openai/..."]`)                 | Nested metadata structure (`_meta.ui.*`)                       |
| Direct `server.registerTool()`/`server.registerResource()` | Helper functions: `registerAppTool()`, `registerAppResource()` |
| UI Resource MIME type: `text/html+skybridge`               | UI Resource MIME type: `text/html;profile=mcp-app`             |

### Tool Metadata

| OpenAI                                         | MCP Apps                           | Notes                                                       |
| ---------------------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| `_meta["openai/outputTemplate"]`               | `_meta.ui.resourceUri`             | URI of UI resource                                          |
| `_meta["openai/toolInvocation/invoking"]`      | —                                  | Not yet implemented                                         |
| `_meta["openai/toolInvocation/invoked"]`       | —                                  | Not yet implemented                                         |
| `_meta["openai/widgetAccessible"]` (`boolean`) | `_meta.ui.visibility` (`string[]`) | `true`/`false` → include/exclude `"app"` in array           |
| `_meta["openai/visibility"]` (`string`)        | `_meta.ui.visibility` (`string[]`) | `"public"`/`"private"` → include/exclude `"model"` in array |

### Resource Metadata

| OpenAI                                | MCP Apps                 | Notes                                                                   |
| ------------------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `_meta["openai/widgetCSP"]`           | `_meta.ui.csp`           | See [CSP field mapping](#csp-field-mapping) below                       |
| —                                     | `_meta.ui.permissions`   | MCP adds: permissions for camera, microphone, geolocation, clipboard    |
| `_meta["openai/widgetDomain"]`        | `_meta.ui.domain`        | Dedicated sandbox origin                                                |
| `_meta["openai/widgetPrefersBorder"]` | `_meta.ui.prefersBorder` | Visual boundary preference                                              |
| `_meta["openai/widgetDescription"]`   | —                        | Not yet implemented; use `app.updateModelContext()` for dynamic context |

### Resource MIME Type

| OpenAI                | MCP Apps                    | Notes                                                                            |
| --------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| `text/html+skybridge` | `text/html;profile=mcp-app` | Auto-set by `registerAppResource()`; use `RESOURCE_MIME_TYPE` constant if manual |

### CSP Field Mapping

| OpenAI             | MCP Apps          | Notes                                                      |
| ------------------ | ----------------- | ---------------------------------------------------------- |
| `resource_domains` | `resourceDomains` | Origins for static assets (images, fonts, styles, scripts) |
| `connect_domains`  | `connectDomains`  | Origins for fetch/XHR/WebSocket requests                   |
| `frame_domains`    | `frameDomains`    | Origins for nested iframes                                 |
| `redirect_domains` | —                 | OpenAI-only: origins for `openExternal` redirects          |
| —                  | `baseUriDomains`  | MCP-only: `base-uri` CSP directive                         |

### Server-Side Migration Example

#### Before (OpenAI)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function createServer() {
  const server = new McpServer({ name: "shop", version: "1.0.0" });

  // Register tool with OpenAI metadata
  server.registerTool(
    "shopping-cart",
    {
      title: "Shopping Cart",
      description: "Display the user's shopping cart",
      inputSchema: { userId: z.string() },
      annotations: { readOnlyHint: true },
      _meta: {
        "openai/outputTemplate": "ui://view/cart.html",
        "openai/toolInvocation/invoking": "Loading cart...",
        "openai/toolInvocation/invoked": "Cart ready",
        "openai/widgetAccessible": true,
      },
    },
    async (args) => {
      const cart = await getCart(args.userId);
      return {
        content: [{ type: "text", text: JSON.stringify(cart) }],
        structuredContent: { cart },
      };
    },
  );

  // Register UI resource
  server.registerResource(
    "Cart View",
    "ui://view/cart.html",
    { mimeType: "text/html+skybridge" },
    async () => ({
      contents: [
        {
          uri: "ui://view/cart.html",
          mimeType: "text/html+skybridge",
          text: getCartHtml(),
          _meta: {
            "openai/widgetCSP": {
              resource_domains: ["https://cdn.example.com"],
              connect_domains: ["https://api.example.com"],
              frame_domains: ["https://embed.example.com"],
            },
          },
        },
      ],
    }),
  );

  return server;
}
```

#### After (MCP Apps)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

function createServer() {
  const server = new McpServer({ name: "shop", version: "1.0.0" });

  // Register tool with MCP Apps metadata
  registerAppTool(
    server,
    "shopping-cart",
    {
      title: "Shopping Cart",
      description: "Display the user's shopping cart",
      inputSchema: { userId: z.string() },
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri: "ui://view/cart.html" } },
    },
    async (args) => {
      const cart = await getCart(args.userId);
      return {
        content: [{ type: "text", text: JSON.stringify(cart) }],
        structuredContent: { cart },
      };
    },
  );

  // Register UI resource
  registerAppResource(
    server,
    "Cart View",
    "ui://view/cart.html",
    { description: "Shopping cart UI" },
    async () => ({
      contents: [
        {
          uri: "ui://view/cart.html",
          mimeType: RESOURCE_MIME_TYPE,
          text: getCartHtml(),
          _meta: {
            ui: {
              csp: {
                resourceDomains: ["https://cdn.example.com"],
                connectDomains: ["https://api.example.com"],
                frameDomains: ["https://embed.example.com"],
              },
            },
          },
        },
      ],
    }),
  );

  return server;
}
```

### Key Differences Summary

1. **Metadata Structure**: OpenAI uses flat `_meta["openai/..."]` properties; MCP uses nested `_meta.ui.*` structure
2. **Tool Visibility**: OpenAI uses boolean/string (`true`/`"public"`); MCP uses string arrays (`["app", "model"]`)
3. **CSP Field Names**: snake_case → camelCase (e.g., `connect_domains` → `connectDomains`)
4. **App Permissions**: MCP adds `_meta.ui.permissions` for camera, microphone, geolocation, clipboard (not in OpenAI)
5. **Resource MIME Type**: `text/html+skybridge` → `text/html;profile=mcp-app` (use `RESOURCE_MIME_TYPE` constant)
6. **Helper Functions**: MCP provides `registerAppTool()` and `registerAppResource()` helpers
7. **Not Yet Implemented**: `_meta["openai/toolInvocation/invoking"]`, `_meta["openai/toolInvocation/invoked"]`, and `_meta["openai/widgetDescription"]` don't have MCP equivalents yet

## Client-Side

Client-side migration involves replacing the implicit `window.openai` global with an explicit `App` instance.

### Quick Start Comparison

| OpenAI Apps SDK                   | MCP Apps SDK                       |
| --------------------------------- | ---------------------------------- |
| Implicit global (`window.openai`) | Explicit instance (`new App(...)`) |
| Properties pre-populated on load  | Async connection + notifications   |
| Sync property access              | Getters + event handlers           |

### Setup & Connection

| OpenAI                           | MCP Apps                                           | Notes                                                                                                           |
| -------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `window.openai` (auto-available) | `const app = new App({name, version})`             | MCP requires explicit instantiation                                                                             |
| (implicit)                       | Vanilla: `await app.connect()` / React: `useApp()` | MCP requires async connection; auto-detects OpenAI env                                                          |
| —                                | `await app.connect(new OpenAITransport())`         | Force OpenAI mode (not yet available, see [PR #172](https://github.com/modelcontextprotocol/ext-apps/pull/172)) |
| —                                | `await app.connect(new PostMessageTransport(...))` | Force MCP mode explicitly                                                                                       |

### Host Context Properties

| OpenAI                      | MCP Apps                                      | Notes                                   |
| --------------------------- | --------------------------------------------- | --------------------------------------- |
| `window.openai.theme`       | `app.getHostContext()?.theme`                 | `"light"` \| `"dark"`                   |
| `window.openai.locale`      | `app.getHostContext()?.locale`                | BCP 47 language tag (e.g., `"en-US"`)   |
| `window.openai.displayMode` | `app.getHostContext()?.displayMode`           | `"inline"` \| `"pip"` \| `"fullscreen"` |
| `window.openai.maxHeight`   | `app.getHostContext()?.viewport?.maxHeight`   | Max container height in px              |
| `window.openai.safeArea`    | `app.getHostContext()?.safeAreaInsets`        | `{ top, right, bottom, left }`          |
| `window.openai.userAgent`   | `app.getHostContext()?.userAgent`             | Host user agent string                  |
| —                           | `app.getHostContext()?.availableDisplayModes` | MCP adds: which modes host supports     |
| —                           | `app.getHostContext()?.toolInfo`              | MCP adds: tool metadata during call     |

### Tool Data (Input/Output)

| OpenAI                               | MCP Apps                                                      | Notes                               |
| ------------------------------------ | ------------------------------------------------------------- | ----------------------------------- |
| `window.openai.toolInput`            | `app.ontoolinput = (params) => { params.arguments }`          | Tool arguments; MCP uses callback   |
| `window.openai.toolOutput`           | `app.ontoolresult = (params) => { params.structuredContent }` | Tool result; MCP uses callback      |
| `window.openai.toolResponseMetadata` | `app.ontoolresult` → `params._meta`                           | Widget-only metadata from server    |
| —                                    | `app.ontoolinputpartial = (params) => {...}`                  | MCP adds: streaming partial args    |
| —                                    | `app.ontoolcancelled = (params) => {...}`                     | MCP adds: cancellation notification |

### Calling Tools

| OpenAI                                     | MCP Apps                                              | Notes                        |
| ------------------------------------------ | ----------------------------------------------------- | ---------------------------- |
| `await window.openai.callTool(name, args)` | `await app.callServerTool({ name, arguments: args })` | Call another MCP server tool |

### Sending Messages

| OpenAI                                                | MCP Apps                                                                             | Notes                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| `await window.openai.sendFollowUpMessage({ prompt })` | `await app.sendMessage({ role: "user", content: [{ type: "text", text: prompt }] })` | MCP uses structured content array |

### External Links

| OpenAI                                       | MCP Apps                            | Notes                                |
| -------------------------------------------- | ----------------------------------- | ------------------------------------ |
| `await window.openai.openExternal({ href })` | `await app.openLink({ url: href })` | Different param name: `href` → `url` |

### Display Mode

| OpenAI                                             | MCP Apps                                                  | Notes                               |
| -------------------------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| `await window.openai.requestDisplayMode({ mode })` | `await app.requestDisplayMode({ mode })`                  | Same API                            |
| —                                                  | Check `app.getHostContext()?.availableDisplayModes` first | MCP lets you check what's available |

### Size Reporting

| OpenAI                                        | MCP Apps                                                             | Notes                                 |
| --------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------- |
| `window.openai.notifyIntrinsicHeight(height)` | `app.sendSizeChanged({ width, height })`                             | MCP includes width                    |
| Manual only                                   | `new App(appInfo, capabilities, { autoResize: true /* default */ })` | MCP auto-reports via `ResizeObserver` |

### State Persistence

| OpenAI                                | MCP Apps | Notes                                                                |
| ------------------------------------- | -------- | -------------------------------------------------------------------- |
| `window.openai.widgetState`           | —        | Not directly available in MCP                                        |
| `window.openai.setWidgetState(state)` | —        | Use alternative mechanisms (`localStorage`, server-side state, etc.) |

### File Operations (Not Yet in MCP Apps)

| OpenAI                                               | MCP Apps | Notes               |
| ---------------------------------------------------- | -------- | ------------------- |
| `await window.openai.uploadFile(file)`               | —        | Not yet implemented |
| `await window.openai.getFileDownloadUrl({ fileId })` | —        | Not yet implemented |

### Other (Not Yet in MCP Apps)

| OpenAI                                      | MCP Apps | Notes               |
| ------------------------------------------- | -------- | ------------------- |
| `await window.openai.requestModal(options)` | —        | Not yet implemented |
| `window.openai.requestClose()`              | —        | Not yet implemented |
| `window.openai.setOpenInAppUrl({ href })`   | —        | Not yet implemented |
| `window.openai.view`                        | —        | Not yet mapped      |

### Event Handling

| OpenAI                                        | MCP Apps                                    | Notes                                                              |
| --------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| `window.openai.toolInput` (read on load)      | `app.ontoolinput = (params) => {...}`       | OpenAI: sync property; MCP: callback (register before `connect()`) |
| `window.openai.toolOutput` (read on load)     | `app.ontoolresult = (params) => {...}`      | OpenAI: sync property; MCP: callback (register before `connect()`) |
| `addEventListener("openai:set_globals", ...)` | `app.onhostcontextchanged = (ctx) => {...}` | Both push updates; MCP uses callback, OpenAI uses DOM event        |
| —                                             | `app.onteardown = async () => {...}`        | MCP adds: cleanup before unmount                                   |

### Logging

| OpenAI             | MCP Apps                                      | Notes                           |
| ------------------ | --------------------------------------------- | ------------------------------- |
| `console.log(...)` | `app.sendLog({ level: "info", data: "..." })` | MCP provides structured logging |

### Host Info

| OpenAI | MCP Apps                    | Notes                                             |
| ------ | --------------------------- | ------------------------------------------------- |
| —      | `app.getHostVersion()`      | Returns `{ name, version }` of host               |
| —      | `app.getHostCapabilities()` | Check `serverTools`, `openLinks`, `logging`, etc. |

### Client-Side Migration Example

#### Before (OpenAI)

```typescript
// OpenAI Apps SDK
applyTheme(window.openai.theme);
console.log("Tool args:", window.openai.toolInput);
console.log("Tool result:", window.openai.toolOutput);

// Call a tool
const result = await window.openai.callTool("get_weather", { city: "Tokyo" });

// Send a message
await window.openai.sendFollowUpMessage({ prompt: "Weather updated!" });

// Report height
window.openai.notifyIntrinsicHeight(400);

// Open link
await window.openai.openExternal({ href: "https://example.com" });
```

#### After (MCP Apps)

```typescript
import { App } from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "MyApp", version: "1.0.0" });

// Register handlers BEFORE connect (events may occur immediately after connect)
app.ontoolinput = (params) => {
  console.log("Tool args:", params.arguments);
};

app.ontoolresult = (params) => {
  console.log("Tool result:", params.structuredContent);
};

app.onhostcontextchanged = (ctx) => {
  if (ctx.theme) applyTheme(ctx.theme);
};

// Connect (auto-detects OpenAI vs MCP)
await app.connect();

// Access context
applyTheme(app.getHostContext()?.theme);

// Call a tool
const result = await app.callServerTool({
  name: "get_weather",
  arguments: { city: "Tokyo" },
});

// Send a message
await app.sendMessage({
  role: "user",
  content: [{ type: "text", text: "Weather updated!" }],
});

// Open link (note: url not href)
await app.openLink({ url: "https://example.com" });
```

### Key Differences Summary

1. **Initialization**: OpenAI is implicit; MCP requires `new App()` + `await app.connect()`
2. **Data Flow**: OpenAI pre-populates; MCP uses async notifications (register handlers before `connect()`)
3. **Auto-resize**: MCP has built-in ResizeObserver support via `autoResize` option
4. **Structured Content**: MCP uses `{ type: "text", text: "..." }` arrays for messages
5. **Context Changes**: MCP pushes updates via `onhostcontextchanged`; no polling needed
6. **Capabilities**: MCP lets you check what the host supports before calling methods
