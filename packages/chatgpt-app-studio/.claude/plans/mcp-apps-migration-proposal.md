# Migration Proposal: ChatGPT App Studio → MCP App Studio

## Executive Summary

This proposal outlines the changes required to migrate `chatgpt-app-studio` to support MCP Apps broadly, with both ChatGPT and Claude as primary targets. The MCP Apps specification provides a standardized way to build interactive UI applications that render inside MCP hosts, with bidirectional communication via JSON-RPC over `postMessage`.

**Key insight:** The existing architecture is already well-suited for multi-platform support. The core abstractions (iframe communication, state management, mock system) are platform-agnostic. The changes primarily involve:
1. Abstracting host-specific APIs into a unified interface
2. Adding MCP Apps protocol support
3. Creating platform-specific manifest generators
4. Supporting both export targets

---

## Platform Comparison

### ChatGPT Apps (Current)
| Feature | Implementation |
|---------|---------------|
| **API object** | `window.openai` |
| **Protocol** | Custom postMessage (proprietary) |
| **Display modes** | `pip`, `inline`, `fullscreen` |
| **Resource scheme** | HTTP URL |
| **Manifest format** | `ChatGPTAppManifest` (schema_version: "1.0") |
| **Tool metadata** | `openai/*` prefixed fields |
| **Session management** | Widget state via `setWidgetState` |

### MCP Apps (Target)
| Feature | Implementation |
|---------|---------------|
| **API object** | `App` class from `@modelcontextprotocol/ext-apps` |
| **Protocol** | JSON-RPC 2.0 over postMessage |
| **Display modes** | Host-dependent (no standardized modes yet) |
| **Resource scheme** | `ui://` URIs |
| **Manifest format** | MCP resource + tool metadata |
| **Tool metadata** | `_meta.ui` with `resourceUri`, `visibility`, `csp` |
| **Session management** | Context updates via notifications |

---

## Architecture Changes

### 1. Package Renaming & Structure

```
packages/chatgpt-app-studio/          →  packages/mcp-app-studio/
├── src/
│   ├── index.ts                      →  CLI entry (renamed to `mcp-app-studio`)
│   └── cli/
│       ├── scaffold.ts                   (new) Project scaffolding
│       └── export.ts                     (new) Multi-platform export
├── .preview/
│   ├── lib/
│   │   ├── core/                         (new) Platform-agnostic core
│   │   │   ├── types.ts                  Unified API types
│   │   │   ├── bridge.ts                 Abstract bridge interface
│   │   │   └── store.ts                  Platform-agnostic state
│   │   ├── platforms/                    (new) Platform implementations
│   │   │   ├── chatgpt/
│   │   │   │   ├── types.ts              ChatGPT-specific types
│   │   │   │   ├── bridge.ts             OpenAI bridge implementation
│   │   │   │   └── manifest.ts           ChatGPT manifest generator
│   │   │   └── mcp/
│   │   │       ├── types.ts              MCP Apps types
│   │   │       ├── bridge.ts             MCP App class wrapper
│   │   │       └── manifest.ts           MCP resource/tool generator
│   │   ├── workbench/                    (existing, refactored)
│   │   └── export/                       (existing, extended)
```

### 2. Unified Host API Interface

Create a platform-agnostic abstraction that both ChatGPT and MCP implementations conform to:

```typescript
// lib/core/types.ts

export type DisplayMode = "pip" | "inline" | "fullscreen" | "embedded";
export type Theme = "light" | "dark" | "system";

export interface HostGlobals {
  theme: Theme;
  locale: string;
  displayMode: DisplayMode;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  appState: Record<string, unknown> | null;  // Renamed from widgetState
}

export interface ToolCallResult {
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface HostAPI {
  // Core functionality (both platforms)
  callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult>;
  setAppState(state: Record<string, unknown> | null): void;
  openExternal(href: string): void;
  log(level: "debug" | "info" | "warn" | "error", message: string): void;

  // Display control (ChatGPT-specific, optional for MCP)
  requestDisplayMode?(mode: DisplayMode): Promise<{ mode: DisplayMode }>;
  notifyIntrinsicHeight?(height: number): void;
  requestClose?(): void;

  // Messaging (ChatGPT-specific)
  sendFollowUpMessage?(prompt: string): Promise<void>;

  // File handling (ChatGPT-specific)
  uploadFile?(file: File): Promise<{ fileId: string }>;
  getFileDownloadUrl?(fileId: string): Promise<{ downloadUrl: string }>;

  // Context updates (MCP-specific)
  updateContext?(context: Record<string, unknown>): void;
}

export interface HostBridge {
  readonly platform: "chatgpt" | "mcp" | "workbench";
  readonly globals: HostGlobals;
  readonly api: HostAPI;

  connect(): Promise<void>;
  onGlobalsChange(callback: (globals: HostGlobals) => void): () => void;
  onToolResult(callback: (result: ToolCallResult) => void): () => void;
}
```

### 3. Platform Bridge Implementations

#### ChatGPT Bridge (wraps existing `window.openai`)

```typescript
// lib/platforms/chatgpt/bridge.ts

import type { HostBridge, HostGlobals, HostAPI } from "../../core/types";

export class ChatGPTBridge implements HostBridge {
  readonly platform = "chatgpt" as const;

  get globals(): HostGlobals {
    const openai = (window as any).openai;
    return {
      theme: openai.theme,
      locale: openai.locale,
      displayMode: openai.displayMode,
      toolInput: openai.toolInput,
      toolOutput: openai.toolOutput,
      appState: openai.widgetState,
    };
  }

  get api(): HostAPI {
    const openai = (window as any).openai;
    return {
      callTool: (name, args) => openai.callTool(name, args),
      setAppState: (state) => openai.setWidgetState(state),
      openExternal: (href) => openai.openExternal({ href }),
      log: (level, message) => console[level](message),
      requestDisplayMode: (mode) => openai.requestDisplayMode({ mode }),
      notifyIntrinsicHeight: (h) => openai.notifyIntrinsicHeight(h),
      requestClose: () => openai.requestClose(),
      sendFollowUpMessage: (prompt) => openai.sendFollowUpMessage({ prompt }),
      uploadFile: (file) => openai.uploadFile(file),
      getFileDownloadUrl: (id) => openai.getFileDownloadUrl({ fileId: id }),
    };
  }

  async connect(): Promise<void> {
    // OpenAI bridge is already initialized by parent
  }

  onGlobalsChange(callback: (globals: HostGlobals) => void): () => void {
    const handler = (event: CustomEvent) => {
      callback(this.globals);
    };
    window.addEventListener("openai:set_globals", handler as EventListener);
    return () => window.removeEventListener("openai:set_globals", handler as EventListener);
  }

  onToolResult(callback: (result: ToolCallResult) => void): () => void {
    // ChatGPT passes tool result via globals.toolOutput
    return this.onGlobalsChange((globals) => {
      if (globals.toolOutput) {
        callback({ structuredContent: globals.toolOutput });
      }
    });
  }
}
```

#### MCP Bridge (wraps `@modelcontextprotocol/ext-apps`)

```typescript
// lib/platforms/mcp/bridge.ts

import { App } from "@modelcontextprotocol/ext-apps";
import type { HostBridge, HostGlobals, HostAPI, ToolCallResult } from "../../core/types";

export class MCPBridge implements HostBridge {
  readonly platform = "mcp" as const;
  private app: App;
  private _globals: HostGlobals;
  private globalsListeners: Set<(globals: HostGlobals) => void> = new Set();
  private toolResultListeners: Set<(result: ToolCallResult) => void> = new Set();

  constructor() {
    this.app = new App({ name: "MCP App", version: "1.0.0" });
    this._globals = {
      theme: "light",
      locale: "en-US",
      displayMode: "embedded",
      toolInput: {},
      toolOutput: null,
      appState: null,
    };

    // Handle tool results from host
    this.app.ontoolresult = (result) => {
      const normalized: ToolCallResult = {
        content: result.content,
        isError: result.isError,
      };
      this._globals.toolOutput = result;
      this.toolResultListeners.forEach(cb => cb(normalized));
    };
  }

  get globals(): HostGlobals {
    return this._globals;
  }

  get api(): HostAPI {
    return {
      callTool: async (name, args) => {
        const result = await this.app.callServerTool({ name, arguments: args });
        return {
          content: result.content,
          isError: result.isError,
        };
      },
      setAppState: (state) => {
        this._globals.appState = state;
        // MCP uses context updates instead of widget state
        this.app.updateContext?.(state ?? {});
      },
      openExternal: (href) => {
        this.app.sendOpenLink?.({ href });
      },
      log: (level, message) => {
        this.app.sendLog?.({ level, message });
      },
      updateContext: (context) => {
        this.app.updateContext?.(context);
      },
    };
  }

  async connect(): Promise<void> {
    await this.app.connect();
  }

  onGlobalsChange(callback: (globals: HostGlobals) => void): () => void {
    this.globalsListeners.add(callback);
    return () => this.globalsListeners.delete(callback);
  }

  onToolResult(callback: (result: ToolCallResult) => void): () => void {
    this.toolResultListeners.add(callback);
    return () => this.toolResultListeners.delete(callback);
  }
}
```

### 4. React Hooks (Unified SDK)

Create a unified React SDK that works with both platforms:

```typescript
// lib/sdk/hooks.ts

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import type { HostBridge, HostGlobals, ToolCallResult } from "../core/types";

const BridgeContext = createContext<HostBridge | null>(null);

export function AppProvider({
  bridge,
  children
}: {
  bridge: HostBridge;
  children: React.ReactNode
}) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    bridge.connect().then(() => setConnected(true));
  }, [bridge]);

  if (!connected) return null;

  return (
    <BridgeContext.Provider value={bridge}>
      {children}
    </BridgeContext.Provider>
  );
}

export function useBridge(): HostBridge {
  const bridge = useContext(BridgeContext);
  if (!bridge) throw new Error("useBridge must be used within AppProvider");
  return bridge;
}

export function useTheme(): "light" | "dark" {
  const bridge = useBridge();
  return useSyncExternalStore(
    (cb) => bridge.onGlobalsChange(cb),
    () => bridge.globals.theme === "dark" ? "dark" : "light"
  );
}

export function useToolInput<T = Record<string, unknown>>(): T {
  const bridge = useBridge();
  return useSyncExternalStore(
    (cb) => bridge.onGlobalsChange(cb),
    () => bridge.globals.toolInput as T
  );
}

export function useToolResult(): ToolCallResult | null {
  const bridge = useBridge();
  const [result, setResult] = useState<ToolCallResult | null>(null);

  useEffect(() => {
    return bridge.onToolResult(setResult);
  }, [bridge]);

  return result;
}

export function useCallTool() {
  const bridge = useBridge();
  return bridge.api.callTool;
}

export function useAppState<T = Record<string, unknown>>(): [T | null, (state: T | null) => void] {
  const bridge = useBridge();
  const state = useSyncExternalStore(
    (cb) => bridge.onGlobalsChange(cb),
    () => bridge.globals.appState as T | null
  );

  return [state, bridge.api.setAppState as (state: T | null) => void];
}
```

### 5. Export System Changes

#### Multi-Platform Manifest Generation

```typescript
// lib/export/manifest.ts

export interface ExportTarget {
  platform: "chatgpt" | "mcp" | "both";
  outputDir: string;
}

export interface AppConfig {
  name: string;
  description?: string;
  version?: string;
  tools: ToolConfig[];
  entryPoint: string;
  exportName?: string;
}

export interface ToolConfig {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: {
    readOnly?: boolean;
    destructive?: boolean;
    idempotent?: boolean;
  };
}

// ChatGPT Manifest
export function generateChatGPTManifest(config: AppConfig, widgetUrl: string): ChatGPTAppManifest {
  return {
    schema_version: "1.0",
    name: config.name,
    widget: {
      url: widgetUrl,
    },
    tools: config.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
      output_schema: t.outputSchema,
    })),
  };
}

// MCP Server Generation
export function generateMCPServer(config: AppConfig, resourceUri: string): string {
  return `
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import fs from "node:fs/promises";
import path from "node:path";

const server = new McpServer({
  name: "${config.name}",
  version: "${config.version || "1.0.0"}",
});

const resourceUri = "${resourceUri}";

${config.tools.map(tool => `
registerAppTool(
  server,
  "${tool.name}",
  {
    title: "${tool.name}",
    description: "${tool.description || ""}",
    inputSchema: ${JSON.stringify(tool.inputSchema || {}, null, 2)},
    _meta: { ui: { resourceUri } },
  },
  async (args) => {
    // TODO: Implement tool logic
    return {
      content: [{ type: "text", text: JSON.stringify(args) }],
    };
  },
);
`).join("\n")}

registerAppResource(
  server,
  resourceUri,
  resourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    const html = await fs.readFile(
      path.join(import.meta.dirname, "dist", "app.html"),
      "utf-8",
    );
    return {
      contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }],
    };
  },
);

export { server };
`;
}
```

#### Bridge Script Selection

```typescript
// lib/export/bundler.ts

export interface BundleOptions {
  entryPoint: string;
  exportName?: string;
  platform: "chatgpt" | "mcp" | "auto";
  inline?: boolean;
}

export function generateBridgeScript(platform: "chatgpt" | "mcp" | "auto"): string {
  if (platform === "chatgpt") {
    return generateOpenAIBridgeScript();
  }

  if (platform === "mcp") {
    return generateMCPBridgeScript();
  }

  // Auto-detect: check for window.openai, fallback to MCP
  return `
    (function() {
      if (window.openai) {
        ${generateOpenAIBridgeScript()}
      } else {
        ${generateMCPBridgeScript()}
      }
    })();
  `;
}

function generateMCPBridgeScript(): string {
  // Import MCP App class and set up bridge
  return `
    import { App } from "@modelcontextprotocol/ext-apps";

    const app = new App({ name: "MCP App", version: "1.0.0" });

    window.__mcpApp = app;
    window.__mcpBridge = {
      platform: "mcp",
      app,
      globals: {
        theme: "light",
        locale: "en-US",
        displayMode: "embedded",
        toolInput: {},
        toolOutput: null,
        appState: null,
      },
    };

    app.connect();

    app.ontoolresult = (result) => {
      window.__mcpBridge.globals.toolOutput = result;
      window.dispatchEvent(new CustomEvent("mcp:tool_result", { detail: result }));
    };
  `;
}
```

### 6. Workbench Updates

#### Platform Selector in UI

Add a platform toggle to the workbench to test both export targets:

```typescript
// components/workbench/platform-selector.tsx

export function PlatformSelector() {
  const platform = useWorkbenchStore(s => s.platform);
  const setPlatform = useWorkbenchStore(s => s.setPlatform);

  return (
    <SegmentedControl
      value={platform}
      onValueChange={setPlatform}
      options={[
        { value: "chatgpt", label: "ChatGPT" },
        { value: "mcp", label: "MCP (Claude)" },
      ]}
    />
  );
}
```

#### Store Updates

```typescript
// lib/workbench/store.ts

interface WorkbenchState {
  // ... existing state
  platform: "chatgpt" | "mcp";
  setPlatform: (platform: "chatgpt" | "mcp") => void;
}
```

### 7. CLI Updates

```typescript
// src/index.ts

const TEMPLATES = [
  { value: "minimal", label: "Minimal - Simple starting point" },
  { value: "poi-map", label: "POI Map - Interactive map example" },
];

const PLATFORMS = [
  { value: "both", label: "Both ChatGPT and Claude (recommended)" },
  { value: "chatgpt", label: "ChatGPT only" },
  { value: "mcp", label: "Claude/MCP only" },
];

async function scaffold() {
  const projectName = await text({ message: "Project name:" });
  const description = await text({ message: "Description:" });
  const template = await select({ message: "Template:", options: TEMPLATES });
  const platform = await select({ message: "Target platforms:", options: PLATFORMS });
  const includeMcpServer = await confirm({ message: "Include MCP server?" });

  // ... scaffolding logic
}
```

---

## Migration Checklist

### Phase 1: Core Abstractions (Week 1-2)
- [ ] Create `lib/core/types.ts` with unified interfaces
- [ ] Create `lib/core/bridge.ts` abstract bridge interface
- [ ] Refactor existing code to use abstracted types
- [ ] Add `platform` field to workbench store

### Phase 2: Platform Implementations (Week 2-3)
- [ ] Move ChatGPT-specific code to `lib/platforms/chatgpt/`
- [ ] Create `lib/platforms/mcp/bridge.ts` using `@modelcontextprotocol/ext-apps`
- [ ] Create platform-specific manifest generators
- [ ] Add MCP server generation to export system

### Phase 3: SDK Updates (Week 3-4)
- [ ] Create unified React hooks in `lib/sdk/`
- [ ] Update example components to use new hooks
- [ ] Add auto-detection bridge script
- [ ] Document migration path for existing users

### Phase 4: Workbench & CLI (Week 4-5)
- [ ] Add platform selector to workbench UI
- [ ] Update preview to switch between platform bridges
- [ ] Update CLI with platform selection
- [ ] Update templates with dual-platform support

### Phase 5: Testing & Documentation (Week 5-6)
- [ ] Test with Claude desktop app
- [ ] Test with ChatGPT
- [ ] Test with MCP basic-host
- [ ] Update README and documentation
- [ ] Create migration guide for existing projects

---

## API Mapping Reference

| ChatGPT API | MCP Apps Equivalent | Notes |
|-------------|---------------------|-------|
| `window.openai.callTool()` | `app.callServerTool()` | Same concept, different naming |
| `window.openai.setWidgetState()` | `app.updateContext()` | MCP uses context updates |
| `window.openai.theme` | Host context via `ui/initialize` | Passed during init |
| `window.openai.toolInput` | `app.ontoolresult` callback | Tool result contains input |
| `window.openai.toolOutput` | `app.ontoolresult` callback | Pushed via notification |
| `window.openai.displayMode` | N/A (host-dependent) | Not standardized in MCP |
| `window.openai.requestDisplayMode()` | N/A | ChatGPT-specific |
| `window.openai.sendFollowUpMessage()` | N/A | ChatGPT-specific |
| `window.openai.uploadFile()` | N/A | ChatGPT-specific |
| `window.openai.openExternal()` | `app.sendOpenLink()` | Similar functionality |
| `window.openai.notifyIntrinsicHeight()` | N/A (iframe auto-sizing) | Not needed in MCP |

---

## New Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/ext-apps": "^0.1.0",
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

---

## Breaking Changes for Existing Users

1. **Import paths change**: `chatgpt-app-studio` → `mcp-app-studio`
2. **Hook names**: `useWidgetState` → `useAppState`
3. **Type names**: `OpenAIGlobals` → `HostGlobals`, `OpenAIAPI` → `HostAPI`
4. **Export config**: New `platform` field required

**Migration path**: Provide a codemod and detailed migration guide.

---

## Open Questions

1. **Package naming**: Should we rename to `mcp-app-studio` or keep a more generic name like `assistant-app-studio`?

2. **Display modes**: MCP Apps don't standardize display modes. Should we:
   - Drop display mode support for MCP?
   - Add it as a proposed extension to the spec?
   - Keep it ChatGPT-only?

3. **File handling**: ChatGPT has `uploadFile`/`getFileDownloadUrl`. MCP doesn't have equivalent. Should we:
   - Keep as ChatGPT-only?
   - Propose as MCP extension?
   - Abstract via a capability check?

4. **Workbench testing**: Should the workbench support testing against:
   - A real Claude connector (via cloudflared tunnel)?
   - A local MCP basic-host?
   - Both?

---

## Recommended Next Steps

1. Review this proposal and provide feedback on architectural decisions
2. Decide on package naming
3. Prioritize which features are MVP vs. nice-to-have
4. Set up a test environment with Claude desktop/web
5. Begin Phase 1 implementation
