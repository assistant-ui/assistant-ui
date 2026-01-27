# MCP App Studio: Comprehensive Implementation Plan

## Overview

Transform `chatgpt-app-studio` into `mcp-app-studio` - a universal platform for building interactive apps that run inside AI assistants, supporting ChatGPT, Claude, and other MCP-compatible hosts.

### Design Principles

1. **Platform-specific SDKs for power users** - Full access to native features
2. **Unified SDK for broad reach** - Single codebase, multiple targets
3. **Progressive enhancement** - Core features everywhere, extras where supported
4. **Zero-config defaults** - Sensible defaults, escape hatches when needed

---

## Package Structure

```
packages/mcp-app-studio/
├── src/
│   ├── cli/
│   │   ├── index.ts                 # CLI entry point
│   │   ├── create.ts                # Project scaffolding
│   │   ├── dev.ts                   # Dev server launcher
│   │   └── export.ts                # Multi-platform export
│   │
│   ├── core/                        # Shared abstractions
│   │   ├── types.ts                 # Universal types
│   │   ├── capabilities.ts          # Capability definitions
│   │   └── bridge.ts                # Abstract bridge interface
│   │
│   ├── platforms/
│   │   ├── chatgpt/
│   │   │   ├── index.ts             # Public exports
│   │   │   ├── types.ts             # ChatGPT-specific types
│   │   │   ├── bridge.ts            # ChatGPT bridge implementation
│   │   │   ├── hooks.ts             # ChatGPT React hooks
│   │   │   └── manifest.ts          # Manifest generator
│   │   │
│   │   └── mcp/
│   │       ├── index.ts             # Public exports
│   │       ├── types.ts             # MCP-specific types
│   │       ├── bridge.ts            # MCP bridge (wraps @modelcontextprotocol/ext-apps)
│   │       ├── hooks.ts             # MCP React hooks
│   │       └── server-generator.ts  # MCP server code generator
│   │
│   ├── universal/                   # Unified SDK
│   │   ├── index.ts                 # Public exports
│   │   ├── hooks.ts                 # Capability-aware hooks
│   │   ├── provider.tsx             # Auto-detecting provider
│   │   └── detect.ts                # Platform detection
│   │
│   └── index.ts                     # Main entry (re-exports universal)
│
├── .preview/                        # Workbench (Next.js app)
│   ├── app/
│   │   ├── page.tsx
│   │   └── api/
│   │       ├── export/route.ts
│   │       └── mcp-proxy/route.ts
│   ├── components/
│   │   └── workbench/
│   │       ├── platform-selector.tsx    # NEW
│   │       ├── capability-inspector.tsx # NEW
│   │       └── ...existing components
│   └── lib/
│       ├── workbench/
│       │   ├── store.ts             # Add platform state
│       │   ├── bridges/             # NEW: Platform bridge instances
│       │   │   ├── workbench-chatgpt-bridge.ts
│       │   │   └── workbench-mcp-bridge.ts
│       │   └── ...existing
│       └── export/
│           ├── index.ts
│           ├── chatgpt/             # NEW
│           │   ├── bundler.ts
│           │   └── manifest.ts
│           └── mcp/                 # NEW
│               ├── bundler.ts
│               └── server-generator.ts
│
├── templates/
│   ├── starter-universal/           # Default template
│   ├── starter-chatgpt/             # ChatGPT-only template
│   └── starter-mcp/                 # MCP-only template
│
└── package.json
```

---

## Phase 1: Core Abstractions

**Goal**: Define the foundational types and interfaces that both platforms implement.

### 1.1 Universal Types (`src/core/types.ts`)

```typescript
// ============================================
// UNIVERSAL TYPES
// ============================================

export type Theme = "light" | "dark";
export type Platform = "chatgpt" | "mcp" | "unknown";
export type DisplayMode = "inline" | "fullscreen" | "pip";

/**
 * Content block annotations for audience targeting and metadata
 * Aligned with MCP SDK's annotation support
 */
export interface ContentBlockAnnotations {
  /** Target audience for this content block */
  audience?: Array<"user" | "assistant">;
  /** ISO 8601 timestamp of last modification */
  lastModified?: string;
  /** Priority hint for ordering (higher = more important) */
  priority?: number;
}

/**
 * Base properties shared by all content block types
 */
interface ContentBlockBase {
  /** Optional metadata for internal use */
  _meta?: Record<string, unknown>;
  /** Content block annotations */
  annotations?: ContentBlockAnnotations;
}

/**
 * Icon definition for resource links
 */
export interface ContentBlockIcon {
  src: string;
  mimeType?: string;
  sizes?: string[];
  theme?: "light" | "dark";
}

/**
 * Text content block
 */
export interface TextContentBlock extends ContentBlockBase {
  type: "text";
  text: string;
}

/**
 * Image content block (base64 encoded)
 */
export interface ImageContentBlock extends ContentBlockBase {
  type: "image";
  data: string;
  mimeType: string;
}

/**
 * Audio content block (base64 encoded)
 */
export interface AudioContentBlock extends ContentBlockBase {
  type: "audio";
  data: string;
  mimeType: string;
}

/**
 * Resource link content block (reference to external resource)
 */
export interface ResourceLinkContentBlock extends ContentBlockBase {
  type: "resource_link";
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  icons?: ContentBlockIcon[];
}

/**
 * Embedded resource content block
 */
export interface ResourceContentBlock extends ContentBlockBase {
  type: "resource";
  resource: {
    uri: string;
    mimeType?: string;
  } & (
    | { text: string; blob?: never }
    | { blob: string; text?: never }
  );
}

/**
 * Content block for messages and context updates.
 * Uses discriminated unions for type safety - each type has required fields.
 *
 * @example
 * // TypeScript will error if required fields are missing:
 * const block: ContentBlock = { type: "text" }; // Error: missing 'text'
 * const block: ContentBlock = { type: "text", text: "Hello" }; // OK
 */
export type ContentBlock =
  | TextContentBlock
  | ImageContentBlock
  | AudioContentBlock
  | ResourceLinkContentBlock
  | ResourceContentBlock;

/**
 * Helper to create a text content block
 */
export function textBlock(text: string, annotations?: ContentBlockAnnotations): TextContentBlock {
  return { type: "text", text, annotations };
}

/**
 * Helper to create an image content block
 */
export function imageBlock(data: string, mimeType: string, annotations?: ContentBlockAnnotations): ImageContentBlock {
  return { type: "image", data, mimeType, annotations };
}

/**
 * Tool call result - normalized across platforms
 */
export interface ToolResult {
  content?: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
}

/**
 * Host context - environment information provided by the host
 * Based on MCP's McpUiHostContext with ChatGPT compatibility
 */
export interface HostContext {
  /** Current color theme */
  theme?: Theme;
  /** User's locale (BCP 47, e.g., "en-US") */
  locale?: string;
  /** User's timezone (IANA, e.g., "America/New_York") */
  timeZone?: string;
  /** Current display mode */
  displayMode?: DisplayMode;
  /** Display modes the host supports */
  availableDisplayModes?: DisplayMode[];
  /** Container sizing information */
  containerDimensions?: ContainerDimensions;
  /** CSS styling variables and fonts */
  styles?: HostStyles;
  /** Platform type */
  platform?: "web" | "desktop" | "mobile";
  /** Device capabilities */
  deviceCapabilities?: {
    touch?: boolean;
    hover?: boolean;
  };
  /** Safe area insets in pixels */
  safeAreaInsets?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** Host application identifier */
  userAgent?: string;
  /** Tool metadata (MCP-specific) */
  toolInfo?: {
    id?: string | number;
    tool: {
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    };
  };
}

export interface ContainerDimensions {
  /** Fixed height (host controls) or maxHeight (view controls up to max) */
  height?: number;
  maxHeight?: number;
  /** Fixed width (host controls) or maxWidth (view controls up to max) */
  width?: number;
  maxWidth?: number;
}

export interface HostStyles {
  /** CSS custom properties for theming */
  variables?: Record<string, string>;
  /** CSS blocks for injection */
  css?: {
    /** Font loading CSS (@font-face or @import) */
    fonts?: string;
  };
}

/**
 * Message for sending to chat
 */
export interface ChatMessage {
  role: "user";
  content: ContentBlock[];
}
```

### 1.2 Capability System (`src/core/capabilities.ts`)

```typescript
// ============================================
// CAPABILITY DEFINITIONS
// ============================================
//
// DESIGN: Flat structure for simplicity.
// Instead of nested objects like `capabilities.advanced.partialToolInput`,
// use flat booleans like `capabilities.partialToolInput`.
// This reduces cognitive load and makes capability checks simpler.

import type { Platform, DisplayMode } from "./types";

/**
 * Flat capability manifest - all capabilities at top level.
 *
 * Benefits of flat structure:
 * - Simpler checks: `capabilities.logging` vs `capabilities.advanced.logging`
 * - Easier to spread/merge capabilities
 * - No need to remember nesting hierarchy
 * - Hooks can check single boolean without drilling
 *
 * Naming convention:
 * - Boolean capabilities are named as statements: `canCallTool`, `hasFileUpload`
 * - Or as features: `logging`, `widgetState`, `modelContext`
 */
export interface HostCapabilities {
  /** Platform identifier */
  platform: Platform;

  // ============================================
  // CORE (always available on supported platforms)
  // ============================================

  /** Can call tools on the MCP server */
  callTool: boolean;
  /** Can open external URLs in browser */
  openLink: boolean;

  // ============================================
  // DISPLAY
  // ============================================

  /** Supported display modes */
  displayModes: DisplayMode[];
  /** Can report intrinsic size to host */
  sizeReporting: boolean;
  /** Can request widget close (ChatGPT only) */
  closeWidget: boolean;

  // ============================================
  // MESSAGING
  // ============================================

  /** Can send messages to chat */
  sendMessage: boolean;
  /** Can request modal views (ChatGPT only) */
  modal: boolean;

  // ============================================
  // FILES (ChatGPT only)
  // ============================================

  /** Can upload files */
  fileUpload: boolean;
  /** Can download files */
  fileDownload: boolean;

  // ============================================
  // STATE
  // ============================================

  /** Persistent widget state across sessions (ChatGPT only) */
  widgetState: boolean;
  /** Model context updates for next turn (MCP only) */
  modelContext: boolean;

  // ============================================
  // ADVANCED (MCP features)
  // ============================================

  /** Structured logging to host */
  logging: boolean;
  /** Streaming partial tool arguments */
  partialToolInput: boolean;
  /** Tool cancellation notifications */
  toolCancellation: boolean;
  /** Graceful teardown notifications */
  teardown: boolean;
}

/**
 * ChatGPT capabilities
 */
export const CHATGPT_CAPABILITIES: HostCapabilities = {
  platform: "chatgpt",

  // Core
  callTool: true,
  openLink: true,

  // Display
  displayModes: ["pip", "inline", "fullscreen"],
  sizeReporting: true,
  closeWidget: true,

  // Messaging
  sendMessage: true,
  modal: true,

  // Files
  fileUpload: true,
  fileDownload: true,

  // State
  widgetState: true,
  modelContext: false,

  // Advanced
  logging: false,
  partialToolInput: false,
  toolCancellation: false,
  teardown: false,
};

/**
 * MCP capabilities (per official ext-apps spec)
 *
 * NOTE: The SDK's McpUiHostCapabilities has a different structure:
 * - serverTools?: { listChanged?: boolean } - host can proxy tool calls to MCP server
 * - serverResources?: { listChanged?: boolean } - host can proxy resource reads
 * - message?: McpUiSupportedContentBlockModalities - host supports ui/message
 * - updateModelContext?: McpUiSupportedContentBlockModalities - host supports context updates
 * - openLinks?: {} - host supports opening external URLs
 * - logging?: {} - host accepts log messages
 * - sandbox?: { csp?, permissions? } - sandbox configuration
 * - experimental?: {} - experimental features
 *
 * Our HostCapabilities is a normalized abstraction over both platforms.
 */
export const MCP_CAPABILITIES: HostCapabilities = {
  platform: "mcp",

  // Core
  callTool: true,
  openLink: true,

  // Display
  displayModes: ["inline", "fullscreen", "pip"],
  sizeReporting: true,
  closeWidget: false,

  // Messaging
  sendMessage: true,
  modal: false,

  // Files (not supported in MCP)
  fileUpload: false,
  fileDownload: false,

  // State
  widgetState: false,
  modelContext: true,

  // Advanced
  logging: true,
  partialToolInput: true,
  toolCancellation: true,
  teardown: true,
};
```

### 1.3 Abstract Bridge (`src/core/bridge.ts`)

```typescript
// ============================================
// ABSTRACT BRIDGE INTERFACE
// ============================================

import type {
  HostContext,
  ToolResult,
  ContentBlock,
  ChatMessage,
  DisplayMode,
} from "./types";
import type { HostCapabilities } from "./capabilities";

/**
 * Callback types for bridge events
 */
export type ToolInputCallback = (args: Record<string, unknown>) => void;
export type ToolInputPartialCallback = (args: Record<string, unknown>) => void;
export type ToolResultCallback = (result: ToolResult) => void;
export type ToolCancelledCallback = (reason: string) => void;
export type HostContextChangedCallback = (ctx: Partial<HostContext>) => void;
export type TeardownCallback = () => Promise<void> | void;

/**
 * Abstract bridge interface that all platform implementations must satisfy.
 * Uses a callback-based pattern to match MCP's event-driven architecture.
 */
export interface HostBridge {
  /** Platform identifier */
  readonly platform: "chatgpt" | "mcp";

  /** Capability manifest for this host */
  readonly capabilities: HostCapabilities;

  /**
   * Initialize connection to host.
   * Must be called before using the bridge.
   */
  connect(): Promise<void>;

  /**
   * Get current host context (theme, locale, display mode, etc.)
   */
  getHostContext(): HostContext | null;

  // ============================================
  // EVENT SUBSCRIPTIONS
  // ============================================

  /**
   * Subscribe to tool input (arguments passed to the tool)
   * Returns unsubscribe function
   */
  onToolInput(callback: ToolInputCallback): () => void;

  /**
   * Subscribe to tool results
   * Returns unsubscribe function
   */
  onToolResult(callback: ToolResultCallback): () => void;

  /**
   * Subscribe to host context changes (theme, display mode, etc.)
   * Returns unsubscribe function
   */
  onHostContextChanged(callback: HostContextChangedCallback): () => void;

  // ============================================
  // CORE ACTIONS (always available)
  // ============================================

  /**
   * Call a tool on the server
   */
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;

  /**
   * Open an external URL
   */
  openLink(url: string): Promise<void>;

  // ============================================
  // DISPLAY ACTIONS
  // ============================================

  /**
   * Request a display mode change
   * Returns the actual mode set (may differ from requested)
   */
  requestDisplayMode(mode: DisplayMode): Promise<DisplayMode>;

  /**
   * Report view size to host
   */
  sendSizeChanged(size: { width?: number; height?: number }): void;
}

/**
 * Extended bridge with optional platform-specific capabilities.
 * Methods return undefined if not supported.
 */
export interface ExtendedBridge extends HostBridge {
  // ============================================
  // PARTIAL TOOL INPUT (MCP-specific)
  // ============================================

  /**
   * Subscribe to partial/streaming tool input
   * Returns unsubscribe function, or undefined if not supported
   */
  onToolInputPartial?(callback: ToolInputPartialCallback): () => void;

  /**
   * Subscribe to tool cancellation
   * Returns unsubscribe function, or undefined if not supported
   */
  onToolCancelled?(callback: ToolCancelledCallback): () => void;

  /**
   * Subscribe to teardown notification
   * Returns unsubscribe function, or undefined if not supported
   */
  onTeardown?(callback: TeardownCallback): () => void;

  // ============================================
  // MESSAGING
  // ============================================

  /**
   * Send a message to the chat (both platforms, different APIs)
   * ChatGPT: sendFollowUpMessage({ prompt })
   * MCP: ui/message with { role, content }
   */
  sendMessage?(message: ChatMessage): Promise<void>;

  // ============================================
  // STATE/CONTEXT
  // ============================================

  /**
   * Update model context (MCP-specific)
   * Provides context to the model for future turns
   */
  updateModelContext?(ctx: {
    content?: ContentBlock[];
    structuredContent?: Record<string, unknown>;
  }): Promise<void>;

  /**
   * Set persistent widget state (ChatGPT-specific)
   */
  setWidgetState?(state: Record<string, unknown> | null): void;

  /**
   * Get current widget state (ChatGPT-specific)
   */
  getWidgetState?(): Record<string, unknown> | null;

  // ============================================
  // FILE OPERATIONS (ChatGPT-specific)
  // ============================================

  /**
   * Upload a file
   */
  uploadFile?(file: File): Promise<{ fileId: string }>;

  /**
   * Get download URL for a file
   */
  getFileDownloadUrl?(fileId: string): Promise<{ downloadUrl: string }>;

  // ============================================
  // DISPLAY (ChatGPT-specific)
  // ============================================

  /**
   * Request to close the widget
   */
  requestClose?(): void;

  /**
   * Request a modal view
   */
  requestModal?(options: {
    title?: string;
    params?: Record<string, unknown>;
    anchor?: { x: number; y: number; width: number; height: number };
  }): Promise<void>;

  // ============================================
  // LOGGING (MCP-specific)
  // ============================================

  /**
   * Send structured log to host
   */
  sendLog?(level: "debug" | "info" | "warning" | "error", data: string): void;
}
```

---

## Phase 2: Platform Implementations

### 2.1 ChatGPT Platform (`src/platforms/chatgpt/`)

#### Types (`types.ts`)

```typescript
// Re-export core types
export * from "../../core/types";

// ChatGPT-specific types
export interface ChatGPTGlobals {
  theme: "light" | "dark";
  locale: string;
  displayMode: "pip" | "inline" | "fullscreen";
  previousDisplayMode: "pip" | "inline" | "fullscreen" | null;
  maxHeight: number;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  toolResponseMetadata: Record<string, unknown> | null;
  widgetState: Record<string, unknown> | null;
  userAgent: {
    device: { type: "mobile" | "tablet" | "desktop" | "resizable" };
    capabilities: { hover: boolean; touch: boolean };
  };
  safeArea: {
    insets: { top: number; bottom: number; left: number; right: number };
  };
  view: {
    mode: "modal" | "inline";
    params: Record<string, unknown> | null;
  } | null;
  userLocation: {
    city?: string;
    region?: string;
    country?: string;
    timezone?: string;
    longitude?: number;
    latitude?: number;
  } | null;
}

declare global {
  interface Window {
    openai?: ChatGPTGlobals & {
      callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
      setWidgetState(state: Record<string, unknown> | null): void;
      requestDisplayMode(args: { mode: string }): Promise<{ mode: string }>;
      notifyIntrinsicHeight(height: number): void;
      requestClose(): void;
      sendFollowUpMessage(args: { prompt: string }): Promise<void>;
      openExternal(payload: { href: string }): void;
      uploadFile(file: File): Promise<{ fileId: string }>;
      getFileDownloadUrl(args: { fileId: string }): Promise<{ downloadUrl: string }>;
      requestModal(options: unknown): Promise<void>;
    };
  }
}
```

#### Bridge (`bridge.ts`)

```typescript
import type {
  ExtendedBridge,
  ToolInputCallback,
  ToolResultCallback,
  HostContextChangedCallback,
} from "../../core/bridge";
import type {
  HostContext,
  ToolResult,
  ChatMessage,
  DisplayMode,
  ContentBlock,
} from "../../core/types";
import { CHATGPT_CAPABILITIES, type HostCapabilities } from "../../core/capabilities";
import type { ChatGPTGlobals } from "./types";

export class ChatGPTBridge implements ExtendedBridge {
  readonly platform = "chatgpt" as const;
  readonly capabilities: HostCapabilities = CHATGPT_CAPABILITIES;

  private toolInputCallbacks = new Set<ToolInputCallback>();
  private toolResultCallbacks = new Set<ToolResultCallback>();
  private contextCallbacks = new Set<HostContextChangedCallback>();
  private lastContext: HostContext | null = null;
  private connected = false;

  private get openai() {
    if (!window.openai) {
      throw new Error("ChatGPT bridge not available");
    }
    return window.openai;
  }

  async connect(): Promise<void> {
    if (!window.openai) {
      throw new Error("ChatGPT bridge not available. Is this running inside ChatGPT?");
    }

    // Set up event listener for globals changes
    window.addEventListener("openai:set_globals", this.handleGlobalsChange);

    // Initialize context
    this.lastContext = this.buildHostContext();

    // Notify initial tool input if available
    if (this.openai.toolInput) {
      this.toolInputCallbacks.forEach(cb => cb(this.openai.toolInput));
    }

    // Notify initial tool output if available
    if (this.openai.toolOutput) {
      this.toolResultCallbacks.forEach(cb => cb({
        structuredContent: this.openai.toolOutput!,
      }));
    }

    this.connected = true;
  }

  private buildHostContext(): HostContext {
    const g = this.openai;
    return {
      theme: g.theme,
      locale: g.locale,
      displayMode: g.displayMode as DisplayMode,
      availableDisplayModes: ["pip", "inline", "fullscreen"],
      containerDimensions: { maxHeight: g.maxHeight },
      platform: this.mapDeviceType(g.userAgent?.device?.type),
      deviceCapabilities: g.userAgent?.capabilities,
      safeAreaInsets: g.safeArea?.insets,
      userAgent: "ChatGPT",
    };
  }

  private mapDeviceType(type?: string): "web" | "desktop" | "mobile" {
    if (type === "mobile" || type === "tablet") return "mobile";
    return "web";
  }

  private handleGlobalsChange = () => {
    const newContext = this.buildHostContext();

    // Check for context changes
    if (JSON.stringify(newContext) !== JSON.stringify(this.lastContext)) {
      this.lastContext = newContext;
      this.contextCallbacks.forEach(cb => cb(newContext));
    }

    // Check for new tool input
    if (this.openai.toolInput) {
      this.toolInputCallbacks.forEach(cb => cb(this.openai.toolInput));
    }

    // Check for new tool output
    if (this.openai.toolOutput) {
      this.toolResultCallbacks.forEach(cb => cb({
        structuredContent: this.openai.toolOutput!,
        _meta: this.openai.toolResponseMetadata ?? undefined,
      }));
    }
  };

  getHostContext(): HostContext | null {
    return this.lastContext;
  }

  onToolInput(callback: ToolInputCallback): () => void {
    this.toolInputCallbacks.add(callback);
    // Immediately call with current value if available
    if (this.connected && this.openai.toolInput) {
      callback(this.openai.toolInput);
    }
    return () => this.toolInputCallbacks.delete(callback);
  }

  onToolResult(callback: ToolResultCallback): () => void {
    this.toolResultCallbacks.add(callback);
    // Immediately call with current value if available
    if (this.connected && this.openai.toolOutput) {
      callback({ structuredContent: this.openai.toolOutput });
    }
    return () => this.toolResultCallbacks.delete(callback);
  }

  onHostContextChanged(callback: HostContextChangedCallback): () => void {
    this.contextCallbacks.add(callback);
    return () => this.contextCallbacks.delete(callback);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const result = await this.openai.callTool(name, args);
    return { structuredContent: result as Record<string, unknown> };
  }

  async openLink(url: string): Promise<void> {
    this.openai.openExternal({ href: url });
  }

  async requestDisplayMode(mode: DisplayMode): Promise<DisplayMode> {
    const result = await this.openai.requestDisplayMode({ mode });
    return result.mode as DisplayMode;
  }

  sendSizeChanged(size: { width?: number; height?: number }): void {
    if (size.height != null) {
      this.openai.notifyIntrinsicHeight(size.height);
    }
    // ChatGPT only supports height reporting
  }

  // ChatGPT-specific methods

  async sendMessage(message: ChatMessage): Promise<void> {
    // Extract text from content blocks
    const text = message.content
      .filter(c => c.type === "text" && c.text)
      .map(c => c.text)
      .join("\n");
    await this.openai.sendFollowUpMessage({ prompt: text });
  }

  setWidgetState(state: Record<string, unknown> | null): void {
    this.openai.setWidgetState(state);
  }

  getWidgetState(): Record<string, unknown> | null {
    return this.openai.widgetState;
  }

  async uploadFile(file: File): Promise<{ fileId: string }> {
    return this.openai.uploadFile(file);
  }

  async getFileDownloadUrl(fileId: string): Promise<{ downloadUrl: string }> {
    return this.openai.getFileDownloadUrl({ fileId });
  }

  requestClose(): void {
    this.openai.requestClose();
  }

  async requestModal(options: {
    title?: string;
    params?: Record<string, unknown>;
    anchor?: { x: number; y: number; width: number; height: number };
  }): Promise<void> {
    await this.openai.requestModal(options);
  }
}
```

#### Hooks (`hooks.ts`)

```typescript
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { ChatGPTBridge } from "./bridge";
import type { HostContext, ToolResult, DisplayMode } from "../../core/types";

// ============================================
// CONTEXT
// ============================================

const ChatGPTContext = createContext<ChatGPTBridge | null>(null);

export function ChatGPTProvider({ children }: { children: ReactNode }) {
  const [bridge] = useState(() => new ChatGPTBridge());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bridge.connect().then(() => setReady(true));
  }, [bridge]);

  if (!ready) return null;

  return (
    <ChatGPTContext.Provider value={bridge}>
      {children}
    </ChatGPTContext.Provider>
  );
}

function useChatGPTBridge(): ChatGPTBridge {
  const bridge = useContext(ChatGPTContext);
  if (!bridge) {
    throw new Error("useChatGPT* hooks must be used within ChatGPTProvider");
  }
  return bridge;
}

// ============================================
// HOOKS
// ============================================

/**
 * Get current host context
 */
export function useHostContext(): HostContext | null {
  const bridge = useChatGPTBridge();
  const [context, setContext] = useState<HostContext | null>(bridge.getHostContext());

  useEffect(() => {
    return bridge.onHostContextChanged((ctx) => {
      setContext(prev => ({ ...prev, ...ctx }));
    });
  }, [bridge]);

  return context;
}

/**
 * Get current theme
 */
export function useTheme(): "light" | "dark" {
  const context = useHostContext();
  return context?.theme ?? "light";
}

/**
 * Get tool input (arguments passed to this tool)
 */
export function useToolInput<T = Record<string, unknown>>(): T | null {
  const bridge = useChatGPTBridge();
  const [input, setInput] = useState<T | null>(null);

  useEffect(() => {
    return bridge.onToolInput((args) => setInput(args as T));
  }, [bridge]);

  return input;
}

/**
 * Get tool result
 */
export function useToolResult(): ToolResult | null {
  const bridge = useChatGPTBridge();
  const [result, setResult] = useState<ToolResult | null>(null);

  useEffect(() => {
    return bridge.onToolResult(setResult);
  }, [bridge]);

  return result;
}

/**
 * Manage display mode
 */
export function useDisplayMode(): [DisplayMode, (mode: DisplayMode) => Promise<void>] {
  const bridge = useChatGPTBridge();
  const context = useHostContext();
  const mode = context?.displayMode ?? "inline";

  const setMode = useCallback(
    async (newMode: DisplayMode) => {
      await bridge.requestDisplayMode(newMode);
    },
    [bridge]
  );

  return [mode, setMode];
}

/**
 * Manage widget state (persisted across sessions)
 */
export function useWidgetState<T = Record<string, unknown>>(): [T | null, (state: T | null) => void] {
  const bridge = useChatGPTBridge();
  const [state, setState] = useState<T | null>(bridge.getWidgetState() as T | null);

  const setWidgetState = useCallback(
    (newState: T | null) => {
      bridge.setWidgetState(newState as Record<string, unknown> | null);
      setState(newState);
    },
    [bridge]
  );

  return [state, setWidgetState];
}

/**
 * Call a tool
 */
export function useCallTool() {
  const bridge = useChatGPTBridge();
  return useCallback(
    (name: string, args: Record<string, unknown>) => bridge.callTool(name, args),
    [bridge]
  );
}

/**
 * Open external link
 */
export function useOpenLink() {
  const bridge = useChatGPTBridge();
  return useCallback((url: string) => bridge.openLink(url), [bridge]);
}

/**
 * Send follow-up message
 */
export function useSendMessage() {
  const bridge = useChatGPTBridge();
  return useCallback(
    (text: string) => bridge.sendMessage({
      role: "user",
      content: [{ type: "text", text }],
    }),
    [bridge]
  );
}
```

### 2.2 MCP Platform (`src/platforms/mcp/`)

> **Note on SDK Types**: Where possible, import types directly from `@modelcontextprotocol/ext-apps`
> rather than redefining them. Key types to import:
> - `McpUiHostContext` - Host context structure
> - `McpUiHostCapabilities` - Host capabilities
> - `McpUiAppCapabilities` - App capabilities declaration
> - `McpUiToolResultNotification` - Tool result structure
> - `McpUiTheme`, `McpUiDisplayMode` - Enum types

#### Bridge (`bridge.ts`)

```typescript
/**
 * MCP Bridge Implementation
 *
 * Wraps the official @modelcontextprotocol/ext-apps SDK to provide
 * a consistent interface with the ChatGPT bridge.
 */

import { App } from "@modelcontextprotocol/ext-apps";
import type {
  ExtendedBridge,
  ToolInputCallback,
  ToolInputPartialCallback,
  ToolResultCallback,
  ToolCancelledCallback,
  HostContextChangedCallback,
  TeardownCallback,
} from "../../core/bridge";
import type {
  HostContext,
  ToolResult,
  ChatMessage,
  DisplayMode,
  ContentBlock,
} from "../../core/types";
import { MCP_CAPABILITIES, type HostCapabilities } from "../../core/capabilities";
// Import SDK types for advanced use cases
import type {
  McpUiHostCapabilities,
  McpUiAppCapabilities,
  RequestHandlerExtra,
} from "@modelcontextprotocol/ext-apps";

/**
 * App capabilities that can be declared when creating the bridge.
 * Matches McpUiAppCapabilities from the SDK.
 *
 * Full SDK structure includes:
 * - tools?: { listChanged?: boolean }
 * - resources?: { listChanged?: boolean }
 * - prompts?: { listChanged?: boolean }
 * - logging?: {}
 */
export interface AppCapabilities {
  /** App provides tools that can be called by the host */
  tools?: { listChanged?: boolean };
  /** App provides resources */
  resources?: { listChanged?: boolean };
  /** App provides prompts */
  prompts?: { listChanged?: boolean };
  /** App supports display mode changes */
  displayMode?: {
    supported: DisplayMode[];
  };
}

export interface MCPBridgeOptions {
  /** Enable automatic size change notifications using ResizeObserver (default: true) */
  autoResize?: boolean;
}

export class MCPBridge implements ExtendedBridge {
  readonly platform = "mcp" as const;
  readonly capabilities: HostCapabilities = MCP_CAPABILITIES;

  private app: App;
  private options: MCPBridgeOptions;
  private sizeObserverCleanup?: () => void;
  private toolInputCallbacks = new Set<ToolInputCallback>();
  private toolInputPartialCallbacks = new Set<ToolInputPartialCallback>();
  private toolResultCallbacks = new Set<ToolResultCallback>();
  private toolCancelledCallbacks = new Set<ToolCancelledCallback>();
  private contextCallbacks = new Set<HostContextChangedCallback>();
  private teardownCallbacks = new Set<TeardownCallback>();
  private callToolHandler?: CallToolHandler;
  private listToolsHandler?: ListToolsHandler;

  constructor(
    appInfo?: { name: string; version: string },
    appCapabilities?: AppCapabilities,
    options?: MCPBridgeOptions
  ) {
    this.options = { autoResize: true, ...options };

    // SDK requires capabilities as second parameter (can be empty object)
    // Third parameter controls autoResize behavior
    this.app = new App(
      appInfo ?? { name: "MCP App", version: "1.0.0" },
      appCapabilities ?? {}, // McpUiAppCapabilities
      { autoResize: this.options.autoResize }
    );

    // Wire up SDK callbacks
    this.app.ontoolinput = (params) => {
      this.toolInputCallbacks.forEach(cb => cb(params.arguments as Record<string, unknown>));
    };

    this.app.ontoolinputpartial = (params) => {
      this.toolInputPartialCallbacks.forEach(cb => cb(params.arguments as Record<string, unknown>));
    };

    this.app.ontoolresult = (params) => {
      const result: ToolResult = {
        content: params.content as ContentBlock[],
        structuredContent: params.structuredContent as Record<string, unknown>,
        isError: params.isError,
        _meta: params._meta as Record<string, unknown>,
      };
      this.toolResultCallbacks.forEach(cb => cb(result));
    };

    this.app.ontoolcancelled = (params) => {
      this.toolCancelledCallbacks.forEach(cb => cb(params.reason));
    };

    this.app.onhostcontextchanged = (params) => {
      const ctx = this.mapHostContext(params);
      this.contextCallbacks.forEach(cb => cb(ctx));
    };

    // onteardown receives (params, extra) per SDK spec
    this.app.onteardown = async (_params, _extra) => {
      for (const cb of this.teardownCallbacks) {
        await cb();
      }
      return {}; // Must return McpUiResourceTeardownResult
    };
  }

  async connect(): Promise<void> {
    await this.app.connect();
  }

  getHostContext(): HostContext | null {
    const ctx = this.app.getHostContext();
    return ctx ? this.mapHostContext(ctx) : null;
  }

  private mapHostContext(ctx: Record<string, unknown>): HostContext {
    return {
      theme: ctx.theme as "light" | "dark" | undefined,
      locale: ctx.locale as string | undefined,
      timeZone: ctx.timeZone as string | undefined,
      displayMode: ctx.displayMode as DisplayMode | undefined,
      availableDisplayModes: ctx.availableDisplayModes as DisplayMode[] | undefined,
      containerDimensions: ctx.containerDimensions as HostContext["containerDimensions"],
      styles: ctx.styles as HostContext["styles"],
      platform: ctx.platform as "web" | "desktop" | "mobile" | undefined,
      deviceCapabilities: ctx.deviceCapabilities as HostContext["deviceCapabilities"],
      safeAreaInsets: ctx.safeAreaInsets as HostContext["safeAreaInsets"],
      userAgent: ctx.userAgent as string | undefined,
      toolInfo: ctx.toolInfo as HostContext["toolInfo"],
    };
  }

  // ============================================
  // EVENT SUBSCRIPTIONS
  // ============================================

  onToolInput(callback: ToolInputCallback): () => void {
    this.toolInputCallbacks.add(callback);
    return () => this.toolInputCallbacks.delete(callback);
  }

  onToolInputPartial(callback: ToolInputPartialCallback): () => void {
    this.toolInputPartialCallbacks.add(callback);
    return () => this.toolInputPartialCallbacks.delete(callback);
  }

  onToolResult(callback: ToolResultCallback): () => void {
    this.toolResultCallbacks.add(callback);
    return () => this.toolResultCallbacks.delete(callback);
  }

  onToolCancelled(callback: ToolCancelledCallback): () => void {
    this.toolCancelledCallbacks.add(callback);
    return () => this.toolCancelledCallbacks.delete(callback);
  }

  onHostContextChanged(callback: HostContextChangedCallback): () => void {
    this.contextCallbacks.add(callback);
    return () => this.contextCallbacks.delete(callback);
  }

  onTeardown(callback: TeardownCallback): () => void {
    this.teardownCallbacks.add(callback);
    return () => this.teardownCallbacks.delete(callback);
  }

  // ============================================
  // CORE ACTIONS
  // ============================================

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const result = await this.app.callServerTool({ name, arguments: args });
    return {
      content: result.content as ContentBlock[],
      structuredContent: result.structuredContent as Record<string, unknown>,
      isError: result.isError,
    };
  }

  async openLink(url: string): Promise<void> {
    await this.app.openLink({ url });
  }

  async requestDisplayMode(mode: DisplayMode): Promise<DisplayMode> {
    const result = await this.app.requestDisplayMode({ mode });
    return result.mode as DisplayMode;
  }

  sendSizeChanged(size: { width?: number; height?: number }): void {
    this.app.sendSizeChanged(size);
  }

  // ============================================
  // MCP-SPECIFIC METHODS
  // ============================================

  async sendMessage(message: ChatMessage): Promise<void> {
    await this.app.sendMessage({
      role: message.role,
      content: message.content.map(c => ({
        type: c.type,
        text: c.text,
        // Map other content types as needed
      })),
    });
  }

  async updateModelContext(ctx: {
    content?: ContentBlock[];
    structuredContent?: Record<string, unknown>;
  }): Promise<void> {
    await this.app.updateModelContext(ctx);
  }

  /**
   * Send log messages to the host for debugging and telemetry.
   * Supports full syslog-style log levels per MCP SDK spec.
   */
  sendLog(
    level: "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency",
    data: string,
    logger?: string
  ): void {
    this.app.sendLog({ level, data, logger });
  }

  // ============================================
  // APP-PROVIDED TOOLS (reverse flow: host calls app)
  // ============================================

  /**
   * Register a handler for tool calls FROM the host.
   * This enables apps to provide their own tools that can be called by the host or LLM.
   * The app must declare tools capability in the constructor.
   */
  setCallToolHandler(handler: CallToolHandler): void {
    this.callToolHandler = handler;
    this.app.oncalltool = async (params, extra) => {
      const result = await handler(params.name, params.arguments ?? {}, extra);
      return {
        content: result.content?.map(c => ({
          type: c.type,
          text: c.text,
          data: c.data,
          mimeType: c.mimeType,
        })) ?? [],
        structuredContent: result.structuredContent,
        isError: result.isError,
      };
    };
  }

  /**
   * Register a handler for listing tools this app provides.
   * This enables dynamic tool discovery by the host or LLM.
   */
  setListToolsHandler(handler: ListToolsHandler): void {
    this.listToolsHandler = handler;
    this.app.onlisttools = async (params, extra) => {
      const tools = await handler(params?.cursor);
      return { tools };
    };
  }

  // ============================================
  // SDK PASSTHROUGH METHODS
  // ============================================

  /**
   * Get the host's capabilities discovered during initialization.
   * Returns undefined if called before connection is established.
   */
  getHostCapabilities(): McpUiHostCapabilities | undefined {
    return this.app.getHostCapabilities();
  }

  /**
   * Set up automatic size change notifications using ResizeObserver.
   * Called automatically by connect() if autoResize is true.
   * Returns cleanup function to disconnect the observer.
   */
  setupSizeChangedNotifications(): () => void {
    return this.app.setupSizeChangedNotifications();
  }

  /**
   * Get the underlying App instance for advanced use cases.
   * Use with caution - prefer the bridge methods when possible.
   */
  getApp(): App {
    return this.app;
  }
}

// Type definitions for app-provided tool handlers
type CallToolHandler = (
  name: string,
  args: Record<string, unknown>,
  extra: RequestHandlerExtra
) => Promise<ToolResult>;

type ListToolsHandler = (cursor?: string) => Promise<string[]>;
```

#### Hooks (`hooks.ts`)

```typescript
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { MCPBridge, type AppCapabilities } from "./bridge";
import type { HostContext, ToolResult, DisplayMode, ContentBlock } from "../../core/types";

// ============================================
// CONTEXT
// ============================================

const MCPContext = createContext<MCPBridge | null>(null);

export interface MCPProviderProps {
  children: ReactNode;
  appInfo?: { name: string; version: string };
  /** App capabilities (e.g., tools the app provides) */
  appCapabilities?: AppCapabilities;
}

export function MCPProvider({ children, appInfo, appCapabilities }: MCPProviderProps) {
  const [bridge] = useState(() => new MCPBridge(appInfo, appCapabilities));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bridge.connect().then(() => setReady(true));
  }, [bridge]);

  if (!ready) return null;

  return (
    <MCPContext.Provider value={bridge}>
      {children}
    </MCPContext.Provider>
  );
}

function useMCPBridge(): MCPBridge {
  const bridge = useContext(MCPContext);
  if (!bridge) {
    throw new Error("useMCP* hooks must be used within MCPProvider");
  }
  return bridge;
}

// ============================================
// HOOKS
// ============================================

/**
 * Get current host context
 */
export function useHostContext(): HostContext | null {
  const bridge = useMCPBridge();
  const [context, setContext] = useState<HostContext | null>(bridge.getHostContext());

  useEffect(() => {
    return bridge.onHostContextChanged((ctx) => {
      setContext(prev => prev ? { ...prev, ...ctx } : ctx as HostContext);
    });
  }, [bridge]);

  return context;
}

/**
 * Get current theme
 */
export function useTheme(): "light" | "dark" {
  const context = useHostContext();
  return context?.theme ?? "light";
}

/**
 * Get tool input (arguments passed to this tool)
 */
export function useToolInput<T = Record<string, unknown>>(): T | null {
  const bridge = useMCPBridge();
  const [input, setInput] = useState<T | null>(null);

  useEffect(() => {
    return bridge.onToolInput((args) => setInput(args as T));
  }, [bridge]);

  return input;
}

/**
 * Get partial/streaming tool input (for progressive loading)
 */
export function useToolInputPartial<T = Record<string, unknown>>(): T | null {
  const bridge = useMCPBridge();
  const [input, setInput] = useState<T | null>(null);

  useEffect(() => {
    return bridge.onToolInputPartial((args) => setInput(args as T));
  }, [bridge]);

  return input;
}

/**
 * Get tool result
 */
export function useToolResult(): ToolResult | null {
  const bridge = useMCPBridge();
  const [result, setResult] = useState<ToolResult | null>(null);

  useEffect(() => {
    return bridge.onToolResult(setResult);
  }, [bridge]);

  return result;
}

/**
 * Handle tool cancellation
 */
export function useToolCancellation(callback: (reason: string) => void): void {
  const bridge = useMCPBridge();

  useEffect(() => {
    return bridge.onToolCancelled(callback);
  }, [bridge, callback]);
}

/**
 * Handle teardown
 */
export function useTeardown(callback: () => Promise<void> | void): void {
  const bridge = useMCPBridge();

  useEffect(() => {
    return bridge.onTeardown(callback);
  }, [bridge, callback]);
}

/**
 * Manage display mode
 */
export function useDisplayMode(): [DisplayMode, (mode: DisplayMode) => Promise<void>] {
  const bridge = useMCPBridge();
  const context = useHostContext();
  const mode = context?.displayMode ?? "inline";

  const setMode = useCallback(
    async (newMode: DisplayMode) => {
      // Check if mode is available
      const available = context?.availableDisplayModes ?? [];
      if (available.length > 0 && !available.includes(newMode)) {
        console.warn(`Display mode "${newMode}" not available. Available: ${available.join(", ")}`);
      }
      await bridge.requestDisplayMode(newMode);
    },
    [bridge, context?.availableDisplayModes]
  );

  return [mode, setMode];
}

/**
 * Call a tool
 */
export function useCallTool() {
  const bridge = useMCPBridge();
  return useCallback(
    (name: string, args: Record<string, unknown>) => bridge.callTool(name, args),
    [bridge]
  );
}

/**
 * Open external link
 */
export function useOpenLink() {
  const bridge = useMCPBridge();
  return useCallback((url: string) => bridge.openLink(url), [bridge]);
}

/**
 * Send message to chat
 */
export function useSendMessage() {
  const bridge = useMCPBridge();
  return useCallback(
    (text: string) => bridge.sendMessage({
      role: "user",
      content: [{ type: "text", text }],
    }),
    [bridge]
  );
}

/**
 * Update model context (MCP-specific)
 * Provides context to the model for future turns
 */
export function useUpdateModelContext() {
  const bridge = useMCPBridge();
  return useCallback(
    (ctx: { content?: ContentBlock[]; structuredContent?: Record<string, unknown> }) =>
      bridge.updateModelContext(ctx),
    [bridge]
  );
}

/**
 * Send structured log to host
 */
export function useLog() {
  const bridge = useMCPBridge();
  return useCallback(
    (level: "debug" | "info" | "warning" | "error", data: string) =>
      bridge.sendLog(level, data),
    [bridge]
  );
}
```

---

## Phase 3: Universal SDK

### 3.1 Platform Detection (`src/universal/detect.ts`)

```typescript
import type { Platform } from "../core/types";

/**
 * MCP detection markers that hosts can use to identify themselves.
 * Hosts should set one of these to enable positive identification.
 */
const MCP_MARKERS = {
  /** URL parameter: ?mcp-host=true or ?mcp-host=claude */
  URL_PARAM: "mcp-host",
  /** Window property set by host before loading iframe */
  WINDOW_PROP: "__MCP_HOST__",
  /** Data attribute on the iframe element */
  DATA_ATTR: "data-mcp-host",
} as const;

/**
 * Detect which platform we're running on.
 *
 * IMPORTANT: MCP detection requires POSITIVE identification.
 * Simply being in an iframe is NOT sufficient (could be a blog embed,
 * documentation preview, etc.). MCP hosts must signal their presence via:
 *
 * 1. URL parameter: `?mcp-host=true` or `?mcp-host=<host-name>`
 * 2. Window property: `window.__MCP_HOST__ = true` (set before iframe loads)
 * 3. Successful handshake probe (async detection)
 *
 * For synchronous detection, use URL params or window props.
 * For async detection with handshake, use `detectPlatformAsync()`.
 */
export function detectPlatform(): Platform {
  if (typeof window === "undefined") {
    return "unknown";
  }

  // ChatGPT injects window.openai
  if ("openai" in window && window.openai) {
    return "chatgpt";
  }

  // MCP requires POSITIVE identification - iframe alone is not sufficient
  if (isMCPHost()) {
    return "mcp";
  }

  return "unknown";
}

/**
 * Check for MCP host markers (synchronous checks only)
 */
function isMCPHost(): boolean {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has(MCP_MARKERS.URL_PARAM)) {
    return true;
  }

  // Check window property (host sets this before loading iframe)
  if ((window as Record<string, unknown>)[MCP_MARKERS.WINDOW_PROP]) {
    return true;
  }

  // Check parent window property (if accessible)
  try {
    if (window.parent !== window && (window.parent as Record<string, unknown>)[MCP_MARKERS.WINDOW_PROP]) {
      return true;
    }
  } catch {
    // Cross-origin access denied - cannot check parent
  }

  return false;
}

/**
 * Async platform detection with handshake probe.
 * Attempts to perform MCP initialization handshake to verify host.
 *
 * @param timeout - Maximum time to wait for handshake response (default: 1000ms)
 */
export async function detectPlatformAsync(timeout = 1000): Promise<Platform> {
  // Try sync detection first
  const syncResult = detectPlatform();
  if (syncResult !== "unknown") {
    return syncResult;
  }

  // If in an iframe, attempt MCP handshake probe
  if (typeof window !== "undefined" && window.parent !== window) {
    const isMCP = await probeMCPHost(timeout);
    if (isMCP) {
      return "mcp";
    }
  }

  return "unknown";
}

/**
 * Probe for MCP host by sending a ping and waiting for response
 */
async function probeMCPHost(timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const messageId = `mcp-probe-${Date.now()}`;

    const handler = (event: MessageEvent) => {
      // Check for valid MCP response
      if (
        event.data?.jsonrpc === "2.0" &&
        event.data?.id === messageId &&
        !event.data?.error
      ) {
        window.removeEventListener("message", handler);
        resolve(true);
      }
    };

    window.addEventListener("message", handler);

    // Send ping request
    window.parent.postMessage(
      {
        jsonrpc: "2.0",
        id: messageId,
        method: "ping",
      },
      "*"
    );

    // Timeout
    setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve(false);
    }, timeout);
  });
}

/**
 * Check if running in a supported host environment
 */
export function isHostEnvironment(): boolean {
  return detectPlatform() !== "unknown";
}

/**
 * Check if running in a supported host environment (async version)
 */
export async function isHostEnvironmentAsync(timeout?: number): Promise<boolean> {
  const platform = await detectPlatformAsync(timeout);
  return platform !== "unknown";
}
```

### 3.2 Universal Provider (`src/universal/provider.tsx`)

```typescript
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ExtendedBridge } from "../core/bridge";
import type { HostCapabilities } from "../core/capabilities";
import type { Platform } from "../core/types";
import { detectPlatform } from "./detect";
import { ChatGPTBridge } from "../platforms/chatgpt/bridge";
import { MCPBridge, type AppCapabilities } from "../platforms/mcp/bridge";

// ============================================
// CONTEXT
// ============================================

interface AppContextValue {
  bridge: ExtendedBridge;
  platform: Platform;
  capabilities: HostCapabilities;
}

const AppContext = createContext<AppContextValue | null>(null);

export interface AppProviderProps {
  children: ReactNode;
  /** App name and version for MCP */
  appInfo?: { name: string; version: string };
  /** App capabilities for MCP (e.g., tools the app provides) */
  appCapabilities?: AppCapabilities;
  /** Force a specific platform (for testing) */
  platform?: Platform;
  /** Custom bridge instance (for testing) */
  bridge?: ExtendedBridge;
}

export function AppProvider({
  children,
  appInfo,
  appCapabilities,
  platform: forcePlatform,
  bridge: customBridge,
}: AppProviderProps) {
  const [context, setContext] = useState<AppContextValue | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        const platform = forcePlatform ?? detectPlatform();

        let bridge: ExtendedBridge;
        if (customBridge) {
          bridge = customBridge;
        } else if (platform === "chatgpt") {
          bridge = new ChatGPTBridge();
        } else if (platform === "mcp") {
          bridge = new MCPBridge(appInfo, appCapabilities);
        } else {
          throw new Error("Unknown platform. Are you running inside a supported host?");
        }

        await bridge.connect();

        setContext({
          bridge,
          platform,
          capabilities: bridge.capabilities,
        });
      } catch (err) {
        setError(err as Error);
      }
    }

    initialize();
  }, [forcePlatform, customBridge, appInfo, appCapabilities]);

  if (error) {
    return (
      <div style={{ padding: 20, color: "red" }}>
        Failed to connect: {error.message}
      </div>
    );
  }

  if (!context) {
    return null; // Or loading indicator
  }

  return (
    <AppContext.Provider value={context}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp* hooks must be used within AppProvider");
  }
  return context;
}
```

### 3.3 Universal Hooks (`src/universal/hooks.ts`)

```typescript
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAppContext } from "./provider";
import type {
  ToolResult,
  HostContext,
  DisplayMode,
  Platform,
  ContentBlock,
} from "../core/types";
import type {
  HostCapabilities,
  DisplayCapabilities,
  FileCapabilities,
} from "../core/capabilities";

// ============================================
// CORE HOOKS (always available)
// ============================================

/**
 * Get the current platform
 */
export function usePlatform(): Platform {
  return useAppContext().platform;
}

/**
 * Get full capability manifest
 */
export function useCapabilities(): HostCapabilities {
  return useAppContext().capabilities;
}

/**
 * Get current host context
 */
export function useHostContext(): HostContext | null {
  const { bridge } = useAppContext();
  const [context, setContext] = useState<HostContext | null>(bridge.getHostContext());

  useEffect(() => {
    return bridge.onHostContextChanged((ctx) => {
      setContext(prev => prev ? { ...prev, ...ctx } : ctx as HostContext);
    });
  }, [bridge]);

  return context;
}

/**
 * Get current theme
 */
export function useTheme(): "light" | "dark" {
  const context = useHostContext();
  return context?.theme ?? "light";
}

/**
 * Get tool input (arguments passed to this tool)
 */
export function useToolInput<T = Record<string, unknown>>(): T | null {
  const { bridge } = useAppContext();
  const [input, setInput] = useState<T | null>(null);

  useEffect(() => {
    return bridge.onToolInput((args) => setInput(args as T));
  }, [bridge]);

  return input;
}

/**
 * Get tool result
 */
export function useToolResult(): ToolResult | null {
  const { bridge } = useAppContext();
  const [result, setResult] = useState<ToolResult | null>(null);

  useEffect(() => {
    return bridge.onToolResult(setResult);
  }, [bridge]);

  return result;
}

/**
 * Call a tool
 */
export function useCallTool() {
  const { bridge } = useAppContext();
  return useCallback(
    (name: string, args: Record<string, unknown>) => bridge.callTool(name, args),
    [bridge]
  );
}

/**
 * Open external URL
 */
export function useOpenLink() {
  const { bridge } = useAppContext();
  return useCallback((url: string) => bridge.openLink(url), [bridge]);
}

// ============================================
// CAPABILITY-GATED HOOKS
// ============================================
//
// These hooks use the { isSupported, fn } pattern for better DX:
// - Always returns an object, never null
// - `isSupported` for conditional UI rendering
// - Functions are always callable (no-op if unsupported)
// - No awkward null checks at every call site

/**
 * Display mode controls
 * Returns mode and setter, with capability info
 */
export function useDisplayMode(): {
  mode: DisplayMode;
  setMode: (mode: DisplayMode) => Promise<DisplayMode>;
  availableModes: DisplayMode[];
  supportsFullscreen: boolean;
  supportsPip: boolean;
} {
  const { bridge, capabilities } = useAppContext();
  const context = useHostContext();

  const mode = context?.displayMode ?? "inline";
  const availableModes = context?.availableDisplayModes ?? capabilities.displayModes;

  const setMode = useCallback(
    async (newMode: DisplayMode) => {
      if (!availableModes.includes(newMode)) {
        console.warn(`Display mode "${newMode}" not available`);
        return mode;
      }
      return bridge.requestDisplayMode(newMode);
    },
    [bridge, availableModes, mode]
  );

  return {
    mode,
    setMode,
    availableModes,
    supportsFullscreen: availableModes.includes("fullscreen"),
    supportsPip: availableModes.includes("pip"),
  };
}

/**
 * Send message to chat
 * Works on both platforms but with different underlying APIs
 *
 * @example
 * const { isSupported, sendMessage } = useSendMessage();
 * // Can always call sendMessage - no-ops if unsupported
 * await sendMessage("Hello!");
 * // Use isSupported for conditional UI
 * {isSupported && <button onClick={() => sendMessage("Hi")}>Send</button>}
 */
export function useSendMessage(): {
  isSupported: boolean;
  sendMessage: (text: string) => Promise<void>;
} {
  const { bridge, capabilities } = useAppContext();

  const isSupported = capabilities.sendMessage && !!bridge.sendMessage;

  const sendMessage = useCallback(
    async (text: string) => {
      if (!isSupported) {
        console.warn("sendMessage is not supported on this platform");
        return;
      }
      await bridge.sendMessage!({
        role: "user",
        content: [{ type: "text", text }],
      });
    },
    [bridge, isSupported]
  );

  return { isSupported, sendMessage };
}

/**
 * File upload/download (ChatGPT only)
 *
 * @example
 * const { isSupported, upload, getDownloadUrl } = useFiles();
 * if (isSupported) {
 *   const { fileId } = await upload(file);
 * }
 */
export function useFiles(): {
  isSupported: boolean;
  upload: (file: File) => Promise<{ fileId: string }>;
  getDownloadUrl: (fileId: string) => Promise<{ downloadUrl: string }>;
} {
  const { bridge, capabilities } = useAppContext();

  const isSupported = !!capabilities.fileUpload && !!bridge.uploadFile && !!bridge.getFileDownloadUrl;

  const upload = useCallback(
    async (file: File) => {
      if (!isSupported) {
        throw new Error("File upload is not supported on this platform");
      }
      return bridge.uploadFile!(file);
    },
    [bridge, isSupported]
  );

  const getDownloadUrl = useCallback(
    async (fileId: string) => {
      if (!isSupported) {
        throw new Error("File download is not supported on this platform");
      }
      return bridge.getFileDownloadUrl!(fileId);
    },
    [bridge, isSupported]
  );

  return { isSupported, upload, getDownloadUrl };
}

/**
 * Widget state persistence (ChatGPT only)
 *
 * @example
 * const { isSupported, state, setState } = useWidgetState<MyState>();
 * // state is null until loaded, or if unsupported
 * // setState no-ops if unsupported
 */
export function useWidgetState<T = Record<string, unknown>>(): {
  isSupported: boolean;
  state: T | null;
  setState: (state: T | null) => void;
} {
  const { bridge, capabilities } = useAppContext();

  const isSupported = capabilities.widgetState && !!bridge.setWidgetState;

  const [state, setStateInternal] = useState<T | null>(
    bridge.getWidgetState ? (bridge.getWidgetState() as T | null) : null
  );

  const setState = useCallback(
    (newState: T | null) => {
      if (!isSupported) {
        console.warn("Widget state is not supported on this platform");
        return;
      }
      bridge.setWidgetState!(newState as Record<string, unknown> | null);
      setStateInternal(newState);
    },
    [bridge, isSupported]
  );

  return { isSupported, state, setState };
}

/**
 * Model context updates (MCP only)
 *
 * @example
 * const { isSupported, updateContext } = useModelContext();
 * await updateContext({ content: [{ type: "text", text: "Context info" }] });
 */
export function useModelContext(): {
  isSupported: boolean;
  updateContext: (ctx: {
    content?: ContentBlock[];
    structuredContent?: Record<string, unknown>;
  }) => Promise<void>;
} {
  const { bridge, capabilities } = useAppContext();

  const isSupported = capabilities.modelContext && !!bridge.updateModelContext;

  const updateContext = useCallback(
    async (ctx: { content?: ContentBlock[]; structuredContent?: Record<string, unknown> }) => {
      if (!isSupported) {
        console.warn("Model context updates are not supported on this platform");
        return;
      }
      await bridge.updateModelContext!(ctx);
    },
    [bridge, isSupported]
  );

  return { isSupported, updateContext };
}

/**
 * Partial/streaming tool input (MCP only)
 *
 * @example
 * const { isSupported, partialInput } = useToolInputPartial<MyArgs>();
 * // partialInput updates as the model streams arguments
 */
export function useToolInputPartial<T = Record<string, unknown>>(): {
  isSupported: boolean;
  partialInput: T | null;
} {
  const { bridge, capabilities } = useAppContext();
  const [partialInput, setPartialInput] = useState<T | null>(null);

  const isSupported = capabilities.partialToolInput && !!bridge.onToolInputPartial;

  useEffect(() => {
    if (!isSupported) {
      return;
    }
    return bridge.onToolInputPartial!((args) => setPartialInput(args as T));
  }, [bridge, isSupported]);

  return { isSupported, partialInput };
}

/**
 * Tool cancellation handler (MCP only)
 * Register a callback for when tool execution is cancelled
 *
 * @example
 * useToolCancellation((reason) => {
 *   console.log("Tool cancelled:", reason);
 *   setStatus("cancelled");
 * });
 */
export function useToolCancellation(callback: (reason: string) => void): {
  isSupported: boolean;
} {
  const { bridge, capabilities } = useAppContext();

  const isSupported = capabilities.toolCancellation && !!bridge.onToolCancelled;

  useEffect(() => {
    if (!isSupported) {
      return;
    }
    return bridge.onToolCancelled!(callback);
  }, [bridge, isSupported, callback]);

  return { isSupported };
}

/**
 * Teardown handler (MCP only)
 * Register a cleanup callback for when the app is being unmounted
 *
 * @example
 * useTeardown(async () => {
 *   await saveState();
 *   closeConnections();
 * });
 */
export function useTeardown(callback: () => Promise<void> | void): {
  isSupported: boolean;
} {
  const { bridge, capabilities } = useAppContext();

  const isSupported = capabilities.teardown && !!bridge.onTeardown;

  useEffect(() => {
    if (!isSupported) {
      return;
    }
    return bridge.onTeardown!(callback);
  }, [bridge, isSupported, callback]);

  return { isSupported };
}

/**
 * Close the widget (ChatGPT only)
 *
 * @example
 * const { isSupported, close } = useClose();
 * <button onClick={close} disabled={!isSupported}>Close</button>
 */
export function useClose(): {
  isSupported: boolean;
  close: () => void;
} {
  const { bridge, capabilities } = useAppContext();

  const isSupported = capabilities.closeWidget && !!bridge.requestClose;

  const close = useCallback(() => {
    if (!isSupported) {
      console.warn("Close is not supported on this platform");
      return;
    }
    bridge.requestClose!();
  }, [bridge, isSupported]);

  return { isSupported, close };
}

/**
 * Structured logging (MCP only)
 *
 * @example
 * const { isSupported, log } = useLog();
 * log("info", "User clicked button");
 * log("error", "Something went wrong");
 */
export function useLog(): {
  isSupported: boolean;
  log: (level: "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency", data: string) => void;
} {
  const { bridge, capabilities } = useAppContext();

  const isSupported = capabilities.logging && !!bridge.sendLog;

  const log = useCallback(
    (level: "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency", data: string) => {
      if (!isSupported) {
        // Fall back to console
        console[level === "error" || level === "critical" || level === "alert" || level === "emergency" ? "error" : level === "warning" ? "warn" : "log"](data);
        return;
      }
      bridge.sendLog!(level, data);
    },
    [bridge, isSupported]
  );

  return { isSupported, log };
}
```

### 3.4 Package Exports (`src/index.ts`)

```typescript
// Universal SDK (default export)
export * from "./universal/provider";
export * from "./universal/hooks";
export * from "./universal/detect";

// Core types
export * from "./core/types";
export * from "./core/capabilities";

// MCP-specific types needed for app capabilities declaration
export type { AppCapabilities } from "./platforms/mcp/bridge";

// Re-export platform-specific for those who need direct access
export * as chatgpt from "./platforms/chatgpt";
export * as mcp from "./platforms/mcp";
```

---

## Phase 4: Export System

### 4.1 Multi-Platform Exporter (`lib/export/index.ts`)

```typescript
import { bundleChatGPTWidget, generateChatGPTManifest } from "./chatgpt";
import { bundleMCPApp, generateMCPServer } from "./mcp";

export type ExportPlatform = "chatgpt" | "mcp" | "universal";

export interface ExportOptions {
  platform: ExportPlatform;
  entryPoint: string;
  exportName?: string;
  outputDir: string;
  appName: string;
  appDescription?: string;
  tools: ToolDefinition[];
}

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  /** Tool visibility: model, app, or both (default: both) */
  visibility?: Array<"model" | "app">;
}

export interface ExportResult {
  files: Array<{ path: string; content: string }>;
  instructions: string;
}

export async function exportApp(options: ExportOptions): Promise<ExportResult> {
  const results: ExportResult = { files: [], instructions: "" };

  if (options.platform === "chatgpt" || options.platform === "universal") {
    const chatgptResult = await exportChatGPT(options);
    results.files.push(...chatgptResult.files.map(f => ({
      ...f,
      path: options.platform === "universal" ? `chatgpt/${f.path}` : f.path,
    })));
    results.instructions += chatgptResult.instructions + "\n\n";
  }

  if (options.platform === "mcp" || options.platform === "universal") {
    const mcpResult = await exportMCP(options);
    results.files.push(...mcpResult.files.map(f => ({
      ...f,
      path: options.platform === "universal" ? `mcp/${f.path}` : f.path,
    })));
    results.instructions += mcpResult.instructions;
  }

  return results;
}

async function exportChatGPT(options: ExportOptions): Promise<ExportResult> {
  const html = await bundleChatGPTWidget({
    entryPoint: options.entryPoint,
    exportName: options.exportName,
  });

  const manifest = generateChatGPTManifest({
    name: options.appName,
    description: options.appDescription,
    tools: options.tools,
    widgetUrl: "./widget.html",
  });

  return {
    files: [
      { path: "widget.html", content: html },
      { path: "manifest.json", content: JSON.stringify(manifest, null, 2) },
    ],
    instructions: `
## ChatGPT Deployment

1. Host the \`widget.html\` file on a public URL (e.g., Vercel, Netlify)
2. Update \`manifest.json\` with your hosted widget URL
3. Submit your app at https://platform.openai.com/apps
    `.trim(),
  };
}

async function exportMCP(options: ExportOptions): Promise<ExportResult> {
  const html = await bundleMCPApp({
    entryPoint: options.entryPoint,
    exportName: options.exportName,
  });

  const serverCode = generateMCPServer({
    name: options.appName,
    version: "1.0.0",
    tools: options.tools,
    resourceUri: `ui://${options.appName.toLowerCase().replace(/\s+/g, "-")}/app.html`,
  });

  const packageJson = {
    name: options.appName.toLowerCase().replace(/\s+/g, "-"),
    version: "1.0.0",
    type: "module",
    scripts: {
      build: "INPUT=app.html vite build",
      start: "npx tsx server.ts",
    },
    dependencies: {
      "@modelcontextprotocol/sdk": "^1.0.0",
      "@modelcontextprotocol/ext-apps": "^0.1.0",
      express: "^4.18.0",
      cors: "^2.8.0",
    },
    devDependencies: {
      tsx: "^4.0.0",
      typescript: "^5.0.0",
      vite: "^5.0.0",
      "vite-plugin-singlefile": "^0.13.0",
    },
  };

  return {
    files: [
      { path: "app.html", content: html },
      { path: "server.ts", content: serverCode },
      { path: "package.json", content: JSON.stringify(packageJson, null, 2) },
    ],
    instructions: `
## MCP/Claude Deployment

1. Install dependencies: \`npm install\`
2. Build the app: \`npm run build\`
3. Start the server: \`npm start\`
4. Add to Claude via custom connector or cloudflared tunnel

For local testing with Claude:
\`\`\`bash
npx cloudflared tunnel --url http://localhost:3001
\`\`\`
    `.trim(),
  };
}
```

---

## Phase 5: CLI Updates

### 5.1 Updated CLI (`src/cli/index.ts`)

```typescript
#!/usr/bin/env node

import * as p from "@clack/prompts";
import { create } from "./create";
import { dev } from "./dev";
import { exportApp } from "./export";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  p.intro("🚀 MCP App Studio");

  switch (command) {
    case "create":
      await create(args.slice(1));
      break;
    case "dev":
      await dev(args.slice(1));
      break;
    case "export":
      await exportApp(args.slice(1));
      break;
    default:
      await create(args); // Default to create
  }
}

main().catch(console.error);
```

### 5.2 Create Command (`src/cli/create.ts`)

```typescript
import * as p from "@clack/prompts";
import { downloadTemplate, customizeTemplate } from "./scaffold";
import { parseArgs } from "node:util";

/**
 * DESIGN: Zero prompts by default for the happy path.
 *
 * `npx mcp-app-studio create my-app` creates a universal minimal app immediately.
 *
 * Power users can customize with flags:
 *   --platform=chatgpt|mcp|universal
 *   --template=minimal|dashboard|form
 *   --interactive (enables prompts)
 */

const PLATFORMS = ["universal", "chatgpt", "mcp"] as const;
const TEMPLATES = ["minimal", "dashboard", "form"] as const;

type Platform = (typeof PLATFORMS)[number];
type Template = (typeof TEMPLATES)[number];

interface CreateOptions {
  projectName: string;
  platform: Platform;
  template: Template;
  description?: string;
}

export async function create(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      platform: { type: "string", short: "p", default: "universal" },
      template: { type: "string", short: "t", default: "minimal" },
      interactive: { type: "boolean", short: "i", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  // Show help
  if (values.help) {
    console.log(`
Usage: mcp-app-studio create [project-name] [options]

Options:
  -p, --platform <platform>   Target platform: universal, chatgpt, mcp (default: universal)
  -t, --template <template>   Template: minimal, dashboard, form (default: minimal)
  -i, --interactive           Enable interactive prompts
  -h, --help                  Show this help message

Examples:
  mcp-app-studio create my-app                    # Universal minimal app (zero prompts)
  mcp-app-studio create my-app --platform=chatgpt # ChatGPT-only app
  mcp-app-studio create my-app -i                 # Interactive mode with prompts
    `.trim());
    return;
  }

  // Validate flags
  const platform = values.platform as Platform;
  const template = values.template as Template;

  if (!PLATFORMS.includes(platform)) {
    p.log.error(`Invalid platform: ${platform}. Use: ${PLATFORMS.join(", ")}`);
    process.exit(1);
  }

  if (!TEMPLATES.includes(template)) {
    p.log.error(`Invalid template: ${template}. Use: ${TEMPLATES.join(", ")}`);
    process.exit(1);
  }

  let options: CreateOptions;

  if (values.interactive) {
    // Interactive mode - prompt for everything
    options = await promptForOptions(positionals[0], platform, template);
  } else {
    // Zero-prompt mode - require project name, use defaults for rest
    const projectName = positionals[0];
    if (!projectName) {
      p.log.error("Project name is required. Usage: mcp-app-studio create <project-name>");
      p.log.info("Use --interactive for prompts, or --help for more options.");
      process.exit(1);
    }

    if (!/^[a-z0-9-]+$/.test(projectName)) {
      p.log.error("Project name must use lowercase letters, numbers, and hyphens only.");
      process.exit(1);
    }

    options = { projectName, platform, template };
  }

  // Create the project
  await createProject(options);
}

async function promptForOptions(
  initialName?: string,
  defaultPlatform: Platform = "universal",
  defaultTemplate: Template = "minimal"
): Promise<CreateOptions> {
  const projectName = initialName || await p.text({
    message: "Project name:",
    placeholder: "my-mcp-app",
    validate: (value) => {
      if (!value) return "Project name is required";
      if (!/^[a-z0-9-]+$/.test(value)) return "Use lowercase letters, numbers, and hyphens only";
    },
  });

  if (p.isCancel(projectName)) process.exit(0);

  const platform = await p.select({
    message: "Target platform:",
    options: [
      { value: "universal", label: "Universal (ChatGPT + Claude)", hint: "recommended" },
      { value: "chatgpt", label: "ChatGPT only" },
      { value: "mcp", label: "MCP/Claude only" },
    ],
    initialValue: defaultPlatform,
  });

  if (p.isCancel(platform)) process.exit(0);

  const template = await p.select({
    message: "Template:",
    options: [
      { value: "minimal", label: "Minimal", hint: "Simple starting point" },
      { value: "dashboard", label: "Dashboard", hint: "Data visualization example" },
      { value: "form", label: "Form", hint: "Interactive form example" },
    ],
    initialValue: defaultTemplate,
  });

  if (p.isCancel(template)) process.exit(0);

  const description = await p.text({
    message: "Description (optional):",
    placeholder: "An interactive MCP app",
  });

  if (p.isCancel(description)) process.exit(0);

  return {
    projectName: projectName as string,
    platform: platform as Platform,
    template: template as Template,
    description: description as string || undefined,
  };
}

async function createProject(options: CreateOptions) {
  p.intro("🚀 MCP App Studio");

  const spinner = p.spinner();
  spinner.start(`Creating ${options.platform} app from ${options.template} template...`);

  try {
    await downloadTemplate(options.projectName, options.template);
    await customizeTemplate(options.projectName, {
      platform: options.platform,
      description: options.description,
    });

    spinner.stop("Project created!");

    p.note(`
cd ${options.projectName}
npm install
npm run dev
    `.trim(), "Next steps");

    p.outro("Happy building! 🎉");
  } catch (error) {
    spinner.stop("Failed to create project");
    p.log.error(String(error));
    process.exit(1);
  }
}
```

---

## Phase 6: Workbench Updates

### 6.1 Platform Selector Component

```typescript
// components/workbench/platform-selector.tsx

import { useWorkbenchStore } from "@/lib/workbench/store";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SiOpenai } from "@icons-pack/react-simple-icons";
import { Bot } from "lucide-react";

export function PlatformSelector() {
  const platform = useWorkbenchStore((s) => s.platform);
  const setPlatform = useWorkbenchStore((s) => s.setPlatform);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Platform:</span>
      <ToggleGroup
        type="single"
        value={platform}
        onValueChange={(value) => value && setPlatform(value as "chatgpt" | "mcp")}
        className="gap-1"
      >
        <ToggleGroupItem value="chatgpt" aria-label="ChatGPT" className="gap-1.5 px-2">
          <SiOpenai className="h-3.5 w-3.5" />
          <span className="text-xs">ChatGPT</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="mcp" aria-label="Claude/MCP" className="gap-1.5 px-2">
          <Bot className="h-3.5 w-3.5" />
          <span className="text-xs">Claude</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
```

### 6.2 Capability Inspector

```typescript
// components/workbench/capability-inspector.tsx

import { useWorkbenchStore } from "@/lib/workbench/store";
import { CHATGPT_CAPABILITIES, MCP_CAPABILITIES } from "mcp-app-studio/core/capabilities";
import { Check, X } from "lucide-react";

export function CapabilityInspector() {
  const platform = useWorkbenchStore((s) => s.platform);
  const capabilities = platform === "chatgpt" ? CHATGPT_CAPABILITIES : MCP_CAPABILITIES;

  const features = [
    { name: "Display Modes", available: capabilities.display.modes.length > 0 },
    { name: "File Upload", available: !!capabilities.files?.upload },
    { name: "Send Message", available: capabilities.messaging.sendMessage },
    { name: "Widget State", available: capabilities.state.widgetState },
    { name: "Model Context", available: capabilities.state.modelContext },
    { name: "Partial Tool Input", available: capabilities.advanced.partialToolInput },
    { name: "Teardown Handler", available: capabilities.advanced.teardown },
    { name: "Structured Logging", available: capabilities.advanced.logging },
  ];

  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
      <h4 className="text-xs font-medium">Platform Capabilities</h4>
      <div className="space-y-1">
        {features.map((feature) => (
          <div key={feature.name} className="flex items-center gap-2 text-xs">
            {feature.available ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={feature.available ? "" : "text-muted-foreground"}>
              {feature.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 6.3 Store Updates

```typescript
// lib/workbench/store.ts (additions)

interface WorkbenchState {
  // ... existing state

  // Platform selection
  platform: "chatgpt" | "mcp";
  setPlatform: (platform: "chatgpt" | "mcp") => void;
}

// In store creation:
platform: "chatgpt",
setPlatform: (platform) => set({ platform }),
```

---

## Phase 7: Workbench MCP Bridge

### 7.1 WorkbenchMCPBridge Implementation

The workbench simulates an MCP host by intercepting JSON-RPC messages from the real `@modelcontextprotocol/ext-apps` SDK.

```typescript
// lib/workbench/bridges/workbench-mcp-bridge.ts

import type { HostCapabilities } from "mcp-app-studio/core/capabilities";
import type { HostContext, ContentBlock } from "mcp-app-studio/core/types";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}

interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

export class WorkbenchMCPBridge {
  private iframe: HTMLIFrameElement | null = null;
  private hostContext: HostContext;

  private capabilities: HostCapabilities = {
    platform: "mcp",
    core: { callTool: true, openLink: true },
    display: { modes: ["inline", "fullscreen", "pip"], sizeReporting: true, close: false },
    messaging: { sendMessage: true, modal: false },
    state: { widgetState: false, modelContext: true },
    advanced: { logging: true, partialToolInput: true, toolCancellation: true, teardown: true },
  };

  constructor(
    private options: {
      onToolCall: (name: string, args: unknown) => Promise<unknown>;
      onModelContextUpdate: (ctx: { content?: ContentBlock[]; structuredContent?: unknown }) => void;
      onMessage: (message: { role: string; content: ContentBlock[] }) => void;
      onLog: (level: string, data: string) => void;
      onOpenLink: (url: string) => void;
      onSizeChanged: (size: { width?: number; height?: number }) => void;
      getTheme: () => "light" | "dark";
    }
  ) {
    this.hostContext = {
      theme: options.getTheme(),
      displayMode: "inline",
      availableDisplayModes: ["inline", "fullscreen", "pip"],
    };
  }

  attach(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
    window.addEventListener("message", this.handleMessage);
  }

  detach() {
    window.removeEventListener("message", this.handleMessage);
    this.iframe = null;
  }

  /** Send tool input to the view */
  sendToolInput(args: Record<string, unknown>) {
    this.sendNotification("ui/notifications/tool-input", { arguments: args });
  }

  /** Send partial tool input (streaming) */
  sendToolInputPartial(args: Record<string, unknown>) {
    this.sendNotification("ui/notifications/tool-input-partial", { arguments: args });
  }

  /** Send tool result to the view */
  sendToolResult(result: { content?: ContentBlock[]; structuredContent?: unknown; isError?: boolean }) {
    this.sendNotification("ui/notifications/tool-result", result);
  }

  /** Send tool cancelled notification */
  sendToolCancelled(reason: string) {
    this.sendNotification("ui/notifications/tool-cancelled", { reason });
  }

  /** Send host context change */
  sendHostContextChanged(changes: Partial<HostContext>) {
    this.hostContext = { ...this.hostContext, ...changes };
    this.sendNotification("ui/notifications/host-context-changed", changes);
  }

  /** Request teardown */
  async requestTeardown(reason: string): Promise<void> {
    await this.sendRequest("ui/resource-teardown", { reason });
  }

  private handleMessage = async (event: MessageEvent) => {
    if (event.source !== this.iframe?.contentWindow) return;

    const message = event.data as JsonRpcRequest;
    if (message.jsonrpc !== "2.0") return;

    // Handle notifications (no id)
    if (message.id === undefined) {
      this.handleNotification(message as JsonRpcNotification);
      return;
    }

    // Handle requests
    let response: JsonRpcResponse;
    try {
      const result = await this.handleRequest(message);
      response = { jsonrpc: "2.0", id: message.id, result };
    } catch (error) {
      response = {
        jsonrpc: "2.0",
        id: message.id,
        error: { code: -32000, message: String(error) },
      };
    }

    this.iframe?.contentWindow?.postMessage(response, "*");
  };

  private handleNotification(notification: JsonRpcNotification) {
    switch (notification.method) {
      case "ui/notifications/initialized":
        // View is ready
        break;

      case "ui/notifications/size-changed": {
        const params = notification.params as { width?: number; height?: number };
        this.options.onSizeChanged(params);
        break;
      }

      case "notifications/message": {
        const params = notification.params as { level: string; data: string };
        this.options.onLog(params.level, params.data);
        break;
      }
    }
  }

  private async handleRequest(request: JsonRpcRequest): Promise<unknown> {
    switch (request.method) {
      case "ui/initialize": {
        // Return host capabilities and context per McpUiInitializeResult
        return {
          protocolVersion: "2025-11-21",
          hostCapabilities: {
            openLinks: {},
            serverTools: { listChanged: false },
            serverResources: { listChanged: false },
            logging: {},
            message: { text: {} }, // Host supports receiving text messages
            updateModelContext: { text: {}, structuredContent: {} }, // Host supports context updates
            sandbox: {
              permissions: [], // No special permissions granted
            },
          },
          hostInfo: {
            name: "mcp-app-studio-workbench",
            version: "1.0.0",
            title: "MCP App Studio Workbench",
          },
          hostContext: this.hostContext,
        };
      }

      case "tools/call": {
        const params = request.params as { name: string; arguments: unknown };
        return this.options.onToolCall(params.name, params.arguments);
      }

      case "ui/update-model-context": {
        const params = request.params as { content?: ContentBlock[]; structuredContent?: unknown };
        this.options.onModelContextUpdate(params);
        return {};
      }

      case "ui/message": {
        const params = request.params as { role: string; content: ContentBlock[] };
        this.options.onMessage(params);
        return {};
      }

      case "ui/open-link": {
        const params = request.params as { url: string };
        this.options.onOpenLink(params.url);
        return {};
      }

      case "ui/request-display-mode": {
        const params = request.params as { mode: string };
        this.hostContext.displayMode = params.mode as "inline" | "fullscreen" | "pip";
        return { mode: params.mode };
      }

      default:
        throw new Error(`Unknown method: ${request.method}`);
    }
  }

  private sendNotification(method: string, params: unknown) {
    this.iframe?.contentWindow?.postMessage(
      { jsonrpc: "2.0", method, params },
      "*"
    );
  }

  private sendRequest(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);

      const handler = (event: MessageEvent) => {
        if (event.source !== this.iframe?.contentWindow) return;
        const response = event.data as JsonRpcResponse;
        if (response.id !== id) return;

        window.removeEventListener("message", handler);

        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      };

      window.addEventListener("message", handler);
      this.iframe?.contentWindow?.postMessage(
        { jsonrpc: "2.0", id, method, params },
        "*"
      );
    });
  }
}
```

### 7.2 Testing Modes (Phased Rollout)

| Mode | Phase | Description |
|------|-------|-------------|
| **Simulated** | v1.0 | WorkbenchMCPBridge simulates MCP host, uses mock responses |
| **basic-host** | v1.1 | "Launch basic-host" button, opens real MCP renderer |
| **Claude** | v1.2 | "Test in Claude" button, manages cloudflared tunnel |

---

## Phase 8: Testing Strategy

### 8.1 Unit Tests

```typescript
// src/core/__tests__/capabilities.test.ts

import { describe, it, expect } from "vitest";
import { CHATGPT_CAPABILITIES, MCP_CAPABILITIES } from "../capabilities";

describe("capabilities", () => {
  it("ChatGPT has file capabilities", () => {
    expect(CHATGPT_CAPABILITIES.files).toBeDefined();
    expect(CHATGPT_CAPABILITIES.files?.upload).toBe(true);
  });

  it("MCP does not have file capabilities", () => {
    expect(MCP_CAPABILITIES.files).toBeUndefined();
  });

  it("ChatGPT has widget state", () => {
    expect(CHATGPT_CAPABILITIES.state.widgetState).toBe(true);
    expect(CHATGPT_CAPABILITIES.state.modelContext).toBe(false);
  });

  it("MCP has model context", () => {
    expect(MCP_CAPABILITIES.state.widgetState).toBe(false);
    expect(MCP_CAPABILITIES.state.modelContext).toBe(true);
  });

  it("MCP has advanced features", () => {
    expect(MCP_CAPABILITIES.advanced.partialToolInput).toBe(true);
    expect(MCP_CAPABILITIES.advanced.teardown).toBe(true);
    expect(MCP_CAPABILITIES.advanced.logging).toBe(true);
  });

  it("both platforms can call tools and open links", () => {
    expect(CHATGPT_CAPABILITIES.core.callTool).toBe(true);
    expect(CHATGPT_CAPABILITIES.core.openLink).toBe(true);
    expect(MCP_CAPABILITIES.core.callTool).toBe(true);
    expect(MCP_CAPABILITIES.core.openLink).toBe(true);
  });
});
```

### 8.2 Integration Tests

```typescript
// src/universal/__tests__/hooks.test.tsx

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AppProvider, useToolInput, useWidgetState, useModelContext } from "../";
import { MockChatGPTBridge, MockMCPBridge } from "./__mocks__/bridges";

describe("universal hooks", () => {
  describe("useToolInput", () => {
    it("receives tool input on ChatGPT", async () => {
      const bridge = new MockChatGPTBridge();
      const { result } = renderHook(() => useToolInput(), {
        wrapper: ({ children }) => (
          <AppProvider bridge={bridge}>{children}</AppProvider>
        ),
      });

      expect(result.current).toBeNull();

      act(() => {
        bridge.simulateToolInput({ query: "test" });
      });

      expect(result.current).toEqual({ query: "test" });
    });

    it("receives tool input on MCP", async () => {
      const bridge = new MockMCPBridge();
      const { result } = renderHook(() => useToolInput(), {
        wrapper: ({ children }) => (
          <AppProvider bridge={bridge}>{children}</AppProvider>
        ),
      });

      act(() => {
        bridge.simulateToolInput({ query: "test" });
      });

      expect(result.current).toEqual({ query: "test" });
    });
  });

  describe("useWidgetState", () => {
    it("works on ChatGPT", () => {
      const bridge = new MockChatGPTBridge();
      const { result } = renderHook(() => useWidgetState(), {
        wrapper: ({ children }) => (
          <AppProvider bridge={bridge}>{children}</AppProvider>
        ),
      });

      expect(result.current).not.toBeNull();
      expect(result.current![0]).toBeNull();

      act(() => {
        result.current![1]({ count: 1 });
      });

      expect(result.current![0]).toEqual({ count: 1 });
    });

    it("returns null on MCP", () => {
      const bridge = new MockMCPBridge();
      const { result } = renderHook(() => useWidgetState(), {
        wrapper: ({ children }) => (
          <AppProvider bridge={bridge}>{children}</AppProvider>
        ),
      });

      expect(result.current).toBeNull();
    });
  });

  describe("useModelContext", () => {
    it("returns null on ChatGPT", () => {
      const bridge = new MockChatGPTBridge();
      const { result } = renderHook(() => useModelContext(), {
        wrapper: ({ children }) => (
          <AppProvider bridge={bridge}>{children}</AppProvider>
        ),
      });

      expect(result.current).toBeNull();
    });

    it("works on MCP", async () => {
      const bridge = new MockMCPBridge();
      const { result } = renderHook(() => useModelContext(), {
        wrapper: ({ children }) => (
          <AppProvider bridge={bridge}>{children}</AppProvider>
        ),
      });

      expect(result.current).not.toBeNull();

      await act(async () => {
        await result.current!({ content: [{ type: "text", text: "test" }] });
      });

      expect(bridge.updateModelContext).toHaveBeenCalledWith({
        content: [{ type: "text", text: "test" }],
      });
    });
  });
});
```

### 8.3 E2E Tests

- Test export to ChatGPT format
- Test export to MCP format
- Test universal export (both)
- Test workbench platform switching
- Test against Claude via cloudflared tunnel
- Test against MCP basic-host

---

## Phase 9: Documentation

### 9.1 README Structure

```markdown
# MCP App Studio

Build interactive apps for AI assistants. One codebase, multiple platforms.

## Quick Start

\`\`\`bash
npx mcp-app-studio create my-app
cd my-app
npm install
npm run dev
\`\`\`

## Platforms

| Platform | Status | Features |
|----------|--------|----------|
| ChatGPT | ✅ Full support | Display modes, file upload, widget state |
| Claude | ✅ Full support | Model context updates, streaming input, structured logging |
| VS Code | 🔄 Coming soon | - |
| Goose | 🔄 Coming soon | - |

## SDK

### Universal (recommended)

\`\`\`tsx
import {
  AppProvider,
  useToolInput,
  useCallTool,
  useDisplayMode,
  useWidgetState,
  useModelContext,
} from "mcp-app-studio";

function MyApp() {
  const input = useToolInput();
  const callTool = useCallTool();
  const { mode, setMode, availableModes } = useDisplayMode();

  // Platform-specific (returns null if not supported)
  const widgetState = useWidgetState();  // ChatGPT only
  const updateModelContext = useModelContext();  // MCP only

  return (
    <div>
      {availableModes.includes("fullscreen") && (
        <button onClick={() => setMode("fullscreen")}>Expand</button>
      )}
      {widgetState && <span>Saved: {JSON.stringify(widgetState[0])}</span>}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider
      appInfo={{ name: "My App", version: "1.0.0" }}
      // Optional: declare app capabilities if providing tools
      appCapabilities={{ tools: { listChanged: false } }}
    >
      <MyApp />
    </AppProvider>
  );
}
\`\`\`

### ChatGPT-specific

\`\`\`tsx
import { ChatGPTProvider, useWidgetState, useUploadFile } from "mcp-app-studio/chatgpt";
\`\`\`

### MCP-specific

\`\`\`tsx
import { MCPProvider, useModelContext, useTeardown, useLog } from "mcp-app-studio/mcp";
\`\`\`

## Export

\`\`\`bash
# Export for both platforms
npx mcp-app-studio export

# Export for specific platform
npx mcp-app-studio export --platform chatgpt
npx mcp-app-studio export --platform mcp
\`\`\`
```

---

## Implementation Timeline

| Phase | Description | Estimated Effort |
|-------|-------------|------------------|
| 1 | Core Abstractions | 2-3 days |
| 2 | Platform Implementations | 3-4 days |
| 3 | Universal SDK | 2-3 days |
| 4 | Export System | 2-3 days |
| 5 | CLI Updates | 1-2 days |
| 6 | Workbench Updates | 2-3 days |
| 7 | Workbench MCP Bridge | 2-3 days |
| 8 | Testing | 2-3 days |
| 9 | Documentation | 1-2 days |

**Total: ~2-3 weeks**

---

## Migration Guide for Existing Users

```markdown
# Migrating from chatgpt-app-studio to mcp-app-studio

## Package Changes

\`\`\`diff
- "chatgpt-app-studio": "^0.x"
+ "mcp-app-studio": "^1.0"
\`\`\`

## Import Changes

### If targeting ChatGPT only (minimal changes):

\`\`\`diff
- import { useOpenAI, useToolInput } from "chatgpt-app-studio";
+ import { useCallTool, useToolInput } from "mcp-app-studio/chatgpt";
\`\`\`

### If targeting both platforms:

\`\`\`diff
- import { OpenAIProvider, useOpenAI } from "chatgpt-app-studio";
+ import { AppProvider, useCallTool, useDisplayMode } from "mcp-app-studio";

- <OpenAIProvider>
+ <AppProvider appInfo={{ name: "My App", version: "1.0.0" }}>

- const openai = useOpenAI();
- openai.callTool("search", { q: "test" });
+ const callTool = useCallTool();
+ callTool("search", { q: "test" });

- const [mode, setMode] = useDisplayMode();
+ const { mode, setMode, availableModes } = useDisplayMode();
+ // Check availableModes before calling setMode
\`\`\`

## Export Changes

\`\`\`diff
- npx chatgpt-app-studio export
+ npx mcp-app-studio export --platform chatgpt

# Or for both platforms:
+ npx mcp-app-studio export
\`\`\`
```

---

## Confirmed Decisions

1. **Package name**: `mcp-app-studio`
2. **CLI platform selection**: Ask every time (no default)
3. **Workbench MCP testing**: Hybrid approach (simulated first, real hosts later)
4. **Bridge pattern**: Callback-based (matching MCP's event-driven SDK)
5. **MCP SDK**: Use official `@modelcontextprotocol/ext-apps` package

---

## SDK Compliance Notes

This plan has been reviewed against the official `@modelcontextprotocol/ext-apps` documentation.

### Key Alignment Points

| Aspect | SDK Requirement | Plan Implementation |
|--------|-----------------|---------------------|
| App constructor | `new App(appInfo, capabilities, options?)` | ✅ MCPBridge passes capabilities as 2nd param |
| Protocol version | `"2025-11-21"` | ✅ WorkbenchMCPBridge uses correct version |
| Content types | text, image, audio, resource, resource_link | ✅ ContentBlock supports all types |
| Host capabilities | openLinks, serverTools, serverResources, logging, message, updateModelContext | ✅ WorkbenchMCPBridge declares all |
| Notification handlers | ontoolinput, ontoolinputpartial, ontoolresult, ontoolcancelled, onhostcontextchanged, onteardown | ✅ All mapped in MCPBridge |

### SDK Types to Import Directly

When implementing, prefer importing these from `@modelcontextprotocol/ext-apps`:

```typescript
import type {
  McpUiHostContext,
  McpUiHostCapabilities,
  McpUiAppCapabilities,
  McpUiTheme,
  McpUiDisplayMode,
  McpUiToolResultNotification,
} from "@modelcontextprotocol/ext-apps";
```

### React Module Consideration

The SDK provides `@modelcontextprotocol/ext-apps/react` with:
- `useApp({ appInfo, capabilities })` - handles connection automatically
- `useHostStyleVariables()` - applies CSS variables
- `useHostFonts()` - applies host fonts
- `useDocumentTheme()` - reactive document theme

For users who only target MCP, consider offering a "thin wrapper" mode that exposes these directly.

---

## API Mapping Reference

| Feature | ChatGPT API | MCP API |
|---------|-------------|---------|
| Theme | `window.openai.theme` | `app.getHostContext()?.theme` |
| Locale | `window.openai.locale` | `app.getHostContext()?.locale` |
| Display mode | `window.openai.displayMode` | `app.getHostContext()?.displayMode` |
| Tool input | `window.openai.toolInput` | `app.ontoolinput` callback |
| Tool result | `window.openai.toolOutput` | `app.ontoolresult` callback |
| Partial input | N/A | `app.ontoolinputpartial` callback |
| Tool cancelled | N/A | `app.ontoolcancelled` callback |
| Call tool | `window.openai.callTool(name, args)` | `app.callServerTool({ name, arguments })` |
| Open link | `window.openai.openExternal({ href })` | `app.openLink({ url })` |
| Send message | `window.openai.sendFollowUpMessage({ prompt })` | `app.sendMessage({ role, content })` |
| Display mode | `window.openai.requestDisplayMode({ mode })` | `app.requestDisplayMode({ mode })` |
| Size report | `window.openai.notifyIntrinsicHeight(h)` | `app.sendSizeChanged({ width, height })` |
| Widget state | `window.openai.setWidgetState(state)` | N/A (use localStorage) |
| Model context | N/A | `app.updateModelContext({ content })` |
| Teardown | N/A | `app.onteardown` callback |
| Logging | `console.log()` | `app.sendLog({ level, data })` |
| File upload | `window.openai.uploadFile(file)` | N/A |
| Close widget | `window.openai.requestClose()` | N/A |
| Modal view | `window.openai.requestModal(opts)` | N/A |

---

## Next Steps

1. Create feature branch: `feat/mcp-app-studio`
2. Begin Phase 1: Core abstractions
3. Set up CI for multi-platform testing
4. Rename package and update all references
