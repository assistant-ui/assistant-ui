# MCP Tool UI ChatGPT Apps SDK Parity Implementation Plan

## Overview

This plan implements all missing features from the OpenAI ChatGPT Apps SDK in our MCP Tool UI protocol. The goal is to achieve full feature parity while maintaining an open, vendor-neutral implementation that can work with any AI assistant.

## Current State Analysis

### What We Have

**Messages (Parent → Iframe)**:
- `render` - Initial render with `{ toolName, props: { args, result } }`
- `update` - Update props when they change

**Messages (Iframe → Parent)**:
- `ready` - Signal iframe initialization complete
- `resize` - Report content height (capped at 800px)
- `action` - User triggered an action (actionId)
- `addResult` - Human-in-loop result submission
- `error` - Render error occurred

**Key Files**:
- `packages/tool-ui-server/src/remote/remote-tool-ui.tsx:39` - Parent component
- `packages/tool-ui-server/src/create-tool-ui-runtime.ts:42` - Iframe runtime
- `packages/tool-ui-server/src/schemas/manifest.ts` - Manifest schema

### What's Missing

**API Methods** (from research doc):
| Feature | ChatGPT Apps | Current | Gap |
|---------|--------------|---------|-----|
| `callTool(name, args)` | Yes | No | Need request/response with correlation IDs |
| `setWidgetState(state)` | Yes | No | Need state persistence in parent |
| `sendFollowUpMessage({ prompt })` | Yes | No | Need parent handler + UI integration |
| `requestDisplayMode({ mode })` | Yes | No | Need display mode state + UI |
| `requestModal({ title, params })` | Yes | No | Need modal rendering in parent |
| `requestClose()` | Yes | No | Need close handler in parent |
| `openExternal({ href })` | Yes | No | Need safe URL opener in parent |
| `uploadFile(file)` | Yes | No | Need file upload infrastructure |
| `getFileDownloadUrl({ fileId })` | Yes | No | Need file management system |
| `notifyIntrinsicHeight({ height })` | Yes | Yes | Already have as `resize` |

**Global State**:
| Feature | ChatGPT Apps | Current | Gap |
|---------|--------------|---------|-----|
| `toolInput` | Yes | Yes | Have as `props.args` |
| `toolOutput` | Yes | Yes | Have as `props.result` |
| `theme` (light/dark) | Yes | No | Need to pass in handshake |
| `locale` | Yes | No | Need to pass in handshake |
| `displayMode` | Yes | No | Need display mode tracking |
| `maxHeight` | Yes | Partial | Hardcoded 800px, should be dynamic |
| `widgetState` | Yes | No | Need state restoration |
| `userAgent` / `safeArea` | Yes | No | Need device context |

## Desired End State

After implementation, tool UI iframes will have access to a `window.aui` global object (analogous to `window.openai`) that provides:

1. **Read-only global state**: `theme`, `locale`, `displayMode`, `maxHeight`, `toolInput`, `toolOutput`, `widgetState`, `userAgent`, `safeArea`
2. **API methods**: `callTool`, `setWidgetState`, `sendFollowUpMessage`, `requestDisplayMode`, `requestModal`, `requestClose`, `openExternal`, `notifyIntrinsicHeight`
3. **Request/response correlation**: Async methods return Promises with proper timeout handling
4. **State change events**: `aui:set_globals` custom event when globals change

### Verification:
- All unit tests pass
- Example tool UI can call `callTool`, set state, and request display modes
- Theme changes propagate to iframe
- Display mode transitions work (inline → fullscreen → pip)
- Widget state persists across re-renders

## What We're NOT Doing

1. **File upload/download** - `uploadFile` and `getFileDownloadUrl` require significant infrastructure (file storage, presigned URLs). Defer to future phase.
2. **OAuth 2.1 authentication** - This is a platform-level feature requiring auth providers. Out of scope.
3. **`_meta` protocol fields** - `openai/outputTemplate`, `openai/widgetAccessible`, `openai/visibility`, `openai/fileParams`, `openai/widgetCSP` are ChatGPT-specific. Not needed for parity.
4. **Custom CSP per widget** - We maintain a fixed sandbox policy for security. May revisit later.

## Implementation Approach

We'll evolve the existing fire-and-forget protocol to a **request/response model** with correlation IDs. The architecture follows ChatGPT App Studio exactly:

1. **Bridge script** injected into iframe creates `window.aui` with getters for globals and methods
2. **Pending calls Map** tracks async operations by correlation ID
3. **Parent message handler** processes method calls and returns responses
4. **Custom events** notify React components of global changes

---

## Phase 1: Protocol Types and Message Format

### Overview
Define TypeScript types for the new protocol, establishing the foundation for all subsequent phases.

### Changes Required:

#### 1. Create Protocol Types
**File**: `packages/tool-ui-server/src/types/protocol.ts` (new file)

```typescript
// Display modes supported by the protocol
export type DisplayMode = "inline" | "fullscreen" | "pip";

// Theme options
export type Theme = "light" | "dark";

// Persisted widget state
export type WidgetState = Record<string, unknown> | null;

// Device information
export interface DeviceInfo {
  type: "mobile" | "tablet" | "desktop";
}

export interface DeviceCapabilities {
  hover: boolean;
  touch: boolean;
}

export interface UserAgent {
  device: DeviceInfo;
  capabilities: DeviceCapabilities;
}

// Safe area insets (for mobile devices)
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SafeArea {
  insets: SafeAreaInsets;
}

// Global state pushed to iframe
export interface AUIGlobals {
  theme: Theme;
  locale: string;
  displayMode: DisplayMode;
  maxHeight: number;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  widgetState: WidgetState;
  userAgent: UserAgent;
  safeArea: SafeArea;
}

// Response types for async methods
export interface CallToolResponse {
  content?: string | Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface ModalOptions {
  title?: string;
  params?: Record<string, unknown>;
}

// API interface that widgets can call
export interface AUIAPI {
  callTool: (name: string, args: Record<string, unknown>) => Promise<CallToolResponse>;
  setWidgetState: (state: WidgetState) => void;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{ mode: DisplayMode }>;
  requestModal: (options: ModalOptions) => Promise<void>;
  requestClose: () => void;
  openExternal: (payload: { href: string }) => void;
  notifyIntrinsicHeight: (height: number) => void;
}

// Combined type for window.aui
export type WindowAUI = AUIGlobals & AUIAPI;

// Event type for global changes
export const SET_GLOBALS_EVENT_TYPE = "aui:set_globals" as const;

// Message types
export type ParentToIframeMessage =
  | { type: "AUI_SET_GLOBALS"; globals: AUIGlobals }
  | { type: "AUI_METHOD_RESPONSE"; id: string; result?: unknown; error?: string };

export interface IframeToParentMessage {
  type: "AUI_METHOD_CALL";
  id: string;
  method: keyof AUIAPI;
  args: unknown[];
}

// Legacy message types (for backwards compatibility)
export interface LegacyRemoteMessage {
  type: "ready" | "action" | "addResult" | "resize" | "error";
  payload?: unknown;
}
```

#### 2. Export Types from Package
**File**: `packages/tool-ui-server/src/types/index.ts`
**Changes**: Add export for new protocol types

```typescript
export * from "./protocol";
```

#### 3. Update Main Package Exports  
**File**: `packages/tool-ui-server/src/index.ts`
**Changes**: Export new types

```typescript
export type {
  DisplayMode,
  Theme,
  WidgetState,
  AUIGlobals,
  AUIAPI,
  WindowAUI,
  CallToolResponse,
  ModalOptions,
  UserAgent,
  SafeArea,
  ParentToIframeMessage,
  IframeToParentMessage,
} from "./types/protocol";
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `make -C packages/tool-ui-server typecheck`
- [x] Package builds successfully: `make -C packages/tool-ui-server build`
- [x] All existing tests pass: `make -C packages/tool-ui-server test`

#### Manual Verification:
- [x] Types can be imported from `@assistant-ui/tool-ui-server`

---

## Phase 2: Bridge Script for Iframe

### Overview
Create the bridge script that will be injected into tool UI iframes, providing the `window.aui` global object with all API methods and reactive state.

### Changes Required:

#### 1. Create Bridge Script Generator
**File**: `packages/tool-ui-server/src/runtime/bridge-script.ts` (new file)

```typescript
import type { AUIGlobals } from "../types/protocol";

/**
 * Default globals used when parent hasn't sent initial state yet
 */
export const DEFAULT_GLOBALS: AUIGlobals = {
  theme: "light",
  locale: "en-US",
  displayMode: "inline",
  maxHeight: 800,
  toolInput: {},
  toolOutput: null,
  widgetState: null,
  userAgent: {
    device: { type: "desktop" },
    capabilities: { hover: true, touch: false },
  },
  safeArea: {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  },
};

/**
 * Generate the bridge script to inject into iframes.
 * This creates window.aui with reactive globals and API methods.
 */
export function generateBridgeScript(): string {
  return `
(function() {
  const DEFAULT_GLOBALS = ${JSON.stringify(DEFAULT_GLOBALS)};

  const pendingCalls = new Map();
  let globals = { ...DEFAULT_GLOBALS };
  let previousGlobals = null;

  function generateCallId() {
    return Date.now() + "-" + Math.random().toString(36).slice(2, 11);
  }

  function dispatchGlobalsChange(changedGlobals) {
    const event = new CustomEvent("aui:set_globals", {
      detail: { globals: changedGlobals },
    });
    window.dispatchEvent(event);
  }

  function buildChangedGlobals(prev, next) {
    if (!prev) return next;
    const changed = {};
    Object.keys(next).forEach(function(key) {
      const prevVal = JSON.stringify(prev[key]);
      const nextVal = JSON.stringify(next[key]);
      if (prevVal !== nextVal) {
        changed[key] = next[key];
      }
    });
    return changed;
  }

  function handleMessage(event) {
    // SECURITY: Only accept messages from parent window
    if (event.source !== window.parent) return;
    
    const message = event.data;
    if (!message || typeof message !== "object" || !message.type) return;

    switch (message.type) {
      case "AUI_SET_GLOBALS":
        previousGlobals = globals;
        globals = { ...DEFAULT_GLOBALS, ...message.globals };
        const changed = buildChangedGlobals(previousGlobals, globals);
        if (Object.keys(changed).length > 0) {
          dispatchGlobalsChange(changed);
        }
        break;

      case "AUI_METHOD_RESPONSE":
        const pending = pendingCalls.get(message.id);
        if (pending) {
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.result);
          }
          pendingCalls.delete(message.id);
        }
        break;
    }
  }

  function callMethod(method, args) {
    return new Promise(function(resolve, reject) {
      const id = generateCallId();
      pendingCalls.set(id, { resolve: resolve, reject: reject });

      window.parent.postMessage({
        type: "AUI_METHOD_CALL",
        id: id,
        method: method,
        args: args,
      }, "*");

      // Timeout after 30 seconds
      setTimeout(function() {
        const p = pendingCalls.get(id);
        if (p) {
          p.reject(new Error("Method call timed out: " + method));
          pendingCalls.delete(id);
        }
      }, 30000);
    });
  }

  window.addEventListener("message", handleMessage);

  var api = {
    callTool: function(name, args) {
      return callMethod("callTool", [name, args]);
    },
    setWidgetState: function(state) {
      callMethod("setWidgetState", [state]);
    },
    sendFollowUpMessage: function(args) {
      return callMethod("sendFollowUpMessage", [args]);
    },
    requestDisplayMode: function(args) {
      return callMethod("requestDisplayMode", [args]);
    },
    requestModal: function(options) {
      return callMethod("requestModal", [options]);
    },
    requestClose: function() {
      callMethod("requestClose", []);
    },
    openExternal: function(payload) {
      callMethod("openExternal", [payload]);
    },
    notifyIntrinsicHeight: function(height) {
      callMethod("notifyIntrinsicHeight", [height]);
    },
  };

  Object.defineProperty(window, "aui", {
    value: Object.assign(
      Object.create(null, {
        theme: { get: function() { return globals.theme; }, enumerable: true },
        locale: { get: function() { return globals.locale; }, enumerable: true },
        displayMode: { get: function() { return globals.displayMode; }, enumerable: true },
        maxHeight: { get: function() { return globals.maxHeight; }, enumerable: true },
        toolInput: { get: function() { return globals.toolInput; }, enumerable: true },
        toolOutput: { get: function() { return globals.toolOutput; }, enumerable: true },
        widgetState: { get: function() { return globals.widgetState; }, enumerable: true },
        userAgent: { get: function() { return globals.userAgent; }, enumerable: true },
        safeArea: { get: function() { return globals.safeArea; }, enumerable: true },
      }),
      api
    ),
    configurable: false,
    writable: false,
  });

  // Expose initialization function for setting initial globals
  window.__initAUIGlobals = function(initialGlobals) {
    previousGlobals = globals;
    globals = { ...DEFAULT_GLOBALS, ...initialGlobals };
    const changed = buildChangedGlobals(previousGlobals, globals);
    if (Object.keys(changed).length > 0) {
      dispatchGlobalsChange(changed);
    }
  };

  // Signal ready to parent (backwards compatible)
  window.parent.postMessage({ type: "ready" }, "*");
})();
`;
}
```

#### 2. Create Bridge Script Tests
**File**: `packages/tool-ui-server/src/runtime/bridge-script.test.ts` (new file)

```typescript
import { describe, it, expect } from "vitest";
import { generateBridgeScript, DEFAULT_GLOBALS } from "./bridge-script";

describe("generateBridgeScript", () => {
  it("generates valid JavaScript", () => {
    const script = generateBridgeScript();
    expect(() => new Function(script)).not.toThrow();
  });

  it("includes default globals", () => {
    const script = generateBridgeScript();
    expect(script).toContain(JSON.stringify(DEFAULT_GLOBALS));
  });

  it("defines window.aui", () => {
    const script = generateBridgeScript();
    expect(script).toContain('Object.defineProperty(window, "aui"');
  });

  it("includes all API methods", () => {
    const script = generateBridgeScript();
    expect(script).toContain("callTool");
    expect(script).toContain("setWidgetState");
    expect(script).toContain("sendFollowUpMessage");
    expect(script).toContain("requestDisplayMode");
    expect(script).toContain("requestModal");
    expect(script).toContain("requestClose");
    expect(script).toContain("openExternal");
    expect(script).toContain("notifyIntrinsicHeight");
  });

  it("includes timeout handling", () => {
    const script = generateBridgeScript();
    expect(script).toContain("30000"); // 30 second timeout
    expect(script).toContain("timed out");
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `make -C packages/tool-ui-server typecheck`
- [x] Unit tests pass: `make -C packages/tool-ui-server test`
- [x] Generated script is valid JavaScript (tested in unit tests)

#### Manual Verification:
- [x] Bridge script can be executed in browser console without errors

---

## Phase 3: Message Bridge Class (Parent-Side)

### Overview
Create a `MessageBridge` class that handles postMessage communication between the parent and iframe, dispatching method calls to appropriate handlers.

### Changes Required:

#### 1. Create Message Bridge
**File**: `packages/tool-ui-server/src/remote/message-bridge.ts` (new file)

```typescript
import type {
  AUIAPI,
  AUIGlobals,
  IframeToParentMessage,
  ParentToIframeMessage,
  CallToolResponse,
  WidgetState,
  DisplayMode,
  ModalOptions,
} from "../types/protocol";

export interface MessageBridgeHandlers {
  callTool: (name: string, args: Record<string, unknown>) => Promise<CallToolResponse>;
  setWidgetState: (state: WidgetState) => void;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{ mode: DisplayMode }>;
  requestModal: (options: ModalOptions) => Promise<void>;
  requestClose: () => void;
  openExternal: (payload: { href: string }) => void;
  notifyIntrinsicHeight: (height: number) => void;
}

/**
 * Handles bidirectional postMessage communication with tool UI iframes.
 * Supports both new AUI protocol and legacy message types for backwards compatibility.
 */
export class MessageBridge {
  private iframe: HTMLIFrameElement | null = null;
  private handlers: MessageBridgeHandlers;
  private boundHandleMessage: (event: MessageEvent) => void;
  private legacyHandlers?: {
    onReady?: () => void;
    onAction?: (actionId: string, payload?: unknown) => void;
    onAddResult?: (result: unknown) => void;
    onResize?: (height: number) => void;
    onError?: (error: string) => void;
  };

  constructor(
    handlers: MessageBridgeHandlers,
    legacyHandlers?: MessageBridge["legacyHandlers"]
  ) {
    this.handlers = handlers;
    this.legacyHandlers = legacyHandlers;
    this.boundHandleMessage = this.handleMessage.bind(this);
  }

  attach(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
    window.addEventListener("message", this.boundHandleMessage);
  }

  detach() {
    window.removeEventListener("message", this.boundHandleMessage);
    this.iframe = null;
  }

  /**
   * Send globals to iframe. Call this on initial load and whenever globals change.
   */
  sendGlobals(globals: AUIGlobals) {
    if (!this.iframe?.contentWindow) return;

    const message: ParentToIframeMessage = {
      type: "AUI_SET_GLOBALS",
      globals,
    };
    // SECURITY: Using "*" because sandboxed iframes have null origin
    this.iframe.contentWindow.postMessage(message, "*");
  }

  private handleMessage(event: MessageEvent) {
    if (!this.iframe?.contentWindow) return;
    if (event.source !== this.iframe.contentWindow) return;

    const message = event.data;
    if (!message || typeof message !== "object" || !message.type) return;

    // Handle new AUI protocol
    if (message.type === "AUI_METHOD_CALL") {
      this.processMethodCall(message as IframeToParentMessage);
      return;
    }

    // Handle legacy message types for backwards compatibility
    this.handleLegacyMessage(message);
  }

  private handleLegacyMessage(message: { type: string; payload?: unknown }) {
    switch (message.type) {
      case "ready":
        this.legacyHandlers?.onReady?.();
        break;
      case "action":
        this.legacyHandlers?.onAction?.(message.payload as string);
        break;
      case "addResult":
        this.legacyHandlers?.onAddResult?.(message.payload);
        break;
      case "resize":
        if (typeof message.payload === "number") {
          this.legacyHandlers?.onResize?.(message.payload);
          // Also call the standard handler
          this.handlers.notifyIntrinsicHeight(message.payload);
        }
        break;
      case "error":
        this.legacyHandlers?.onError?.(message.payload as string);
        break;
    }
  }

  private async processMethodCall(message: IframeToParentMessage) {
    const { id, method, args } = message;

    try {
      const result = await this.executeMethod(method, args);
      this.sendResponse(id, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.sendError(id, errorMessage);
    }
  }

  private async executeMethod(
    method: keyof AUIAPI,
    args: unknown[]
  ): Promise<unknown> {
    switch (method) {
      case "callTool": {
        const [name, toolArgs] = args as [string, Record<string, unknown>];
        return this.handlers.callTool(name, toolArgs);
      }
      case "setWidgetState": {
        const [state] = args as [WidgetState];
        this.handlers.setWidgetState(state);
        return undefined;
      }
      case "sendFollowUpMessage": {
        const [msgArgs] = args as [{ prompt: string }];
        return this.handlers.sendFollowUpMessage(msgArgs);
      }
      case "requestDisplayMode": {
        const [displayArgs] = args as [{ mode: DisplayMode }];
        return this.handlers.requestDisplayMode(displayArgs);
      }
      case "requestModal": {
        const [options] = args as [ModalOptions];
        return this.handlers.requestModal(options);
      }
      case "requestClose": {
        this.handlers.requestClose();
        return undefined;
      }
      case "openExternal": {
        const [payload] = args as [{ href: string }];
        this.handlers.openExternal(payload);
        return undefined;
      }
      case "notifyIntrinsicHeight": {
        const [height] = args as [number];
        this.handlers.notifyIntrinsicHeight(height);
        return undefined;
      }
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private sendResponse(id: string, result: unknown) {
    if (!this.iframe?.contentWindow) return;

    const message: ParentToIframeMessage = {
      type: "AUI_METHOD_RESPONSE",
      id,
      result,
    };
    this.iframe.contentWindow.postMessage(message, "*");
  }

  private sendError(id: string, error: string) {
    if (!this.iframe?.contentWindow) return;

    const message: ParentToIframeMessage = {
      type: "AUI_METHOD_RESPONSE",
      id,
      error,
    };
    this.iframe.contentWindow.postMessage(message, "*");
  }
}
```

#### 2. Create Message Bridge Tests
**File**: `packages/tool-ui-server/src/remote/message-bridge.test.ts` (new file)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MessageBridge, MessageBridgeHandlers } from "./message-bridge";

describe("MessageBridge", () => {
  let handlers: MessageBridgeHandlers;
  let bridge: MessageBridge;
  let mockIframe: HTMLIFrameElement;
  let mockContentWindow: Window;

  beforeEach(() => {
    handlers = {
      callTool: vi.fn().mockResolvedValue({ content: "result" }),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn().mockResolvedValue(undefined),
      requestDisplayMode: vi.fn().mockResolvedValue({ mode: "fullscreen" }),
      requestModal: vi.fn().mockResolvedValue(undefined),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
    };

    mockContentWindow = {
      postMessage: vi.fn(),
    } as unknown as Window;

    mockIframe = {
      contentWindow: mockContentWindow,
    } as unknown as HTMLIFrameElement;

    bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);
  });

  afterEach(() => {
    bridge.detach();
  });

  it("sends globals to iframe", () => {
    const globals = {
      theme: "dark" as const,
      locale: "en-US",
      displayMode: "inline" as const,
      maxHeight: 600,
      toolInput: { query: "test" },
      toolOutput: null,
      widgetState: null,
      userAgent: {
        device: { type: "desktop" as const },
        capabilities: { hover: true, touch: false },
      },
      safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
    };

    bridge.sendGlobals(globals);

    expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
      { type: "AUI_SET_GLOBALS", globals },
      "*"
    );
  });

  it("handles callTool method call", async () => {
    const messageEvent = new MessageEvent("message", {
      data: {
        type: "AUI_METHOD_CALL",
        id: "test-123",
        method: "callTool",
        args: ["myTool", { arg1: "value" }],
      },
      source: mockContentWindow,
    });

    window.dispatchEvent(messageEvent);

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handlers.callTool).toHaveBeenCalledWith("myTool", { arg1: "value" });
    expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_METHOD_RESPONSE",
        id: "test-123",
        result: { content: "result" },
      },
      "*"
    );
  });

  it("handles errors in method calls", async () => {
    handlers.callTool = vi.fn().mockRejectedValue(new Error("Tool not found"));

    const messageEvent = new MessageEvent("message", {
      data: {
        type: "AUI_METHOD_CALL",
        id: "test-456",
        method: "callTool",
        args: ["unknownTool", {}],
      },
      source: mockContentWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_METHOD_RESPONSE",
        id: "test-456",
        error: "Tool not found",
      },
      "*"
    );
  });

  it("handles legacy resize messages", () => {
    const legacyHandlers = {
      onResize: vi.fn(),
    };

    const bridgeWithLegacy = new MessageBridge(handlers, legacyHandlers);
    bridgeWithLegacy.attach(mockIframe);

    const messageEvent = new MessageEvent("message", {
      data: { type: "resize", payload: 500 },
      source: mockContentWindow,
    });

    window.dispatchEvent(messageEvent);

    expect(legacyHandlers.onResize).toHaveBeenCalledWith(500);
    expect(handlers.notifyIntrinsicHeight).toHaveBeenCalledWith(500);

    bridgeWithLegacy.detach();
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `make -C packages/tool-ui-server typecheck`
- [x] All unit tests pass: `make -C packages/tool-ui-server test`
- [x] Bridge handles all 8 API methods correctly

#### Manual Verification:
- [x] Bridge can be instantiated and attached to an iframe

---

## Phase 4: Update RemoteToolUI Component

### Overview
Update the `RemoteToolUI` React component to use the new `MessageBridge` class and support all new features including theme, locale, display mode, and widget state.

### Changes Required:

#### 1. Update RemoteToolUI Props and Component
**File**: `packages/tool-ui-server/src/remote/remote-tool-ui.tsx`

```typescript
"use client";

import * as React from "react";
import { cn } from "../utils/cn";
import { MessageBridge, MessageBridgeHandlers } from "./message-bridge";
import type {
  AUIGlobals,
  Theme,
  DisplayMode,
  WidgetState,
  CallToolResponse,
  ModalOptions,
} from "../types/protocol";
import { DEFAULT_GLOBALS } from "../runtime/bridge-script";

export interface RemoteToolUIProps {
  /** PSL-isolated subdomain URL */
  src: string;
  /** Tool name for identification */
  toolName: string;
  /** Tool input arguments */
  toolInput: Record<string, unknown>;
  /** Tool output/result */
  toolOutput: Record<string, unknown> | null;
  /** Current theme */
  theme?: Theme;
  /** User's locale */
  locale?: string;
  /** Current display mode */
  displayMode?: DisplayMode;
  /** Maximum height for the widget */
  maxHeight?: number;
  /** Persisted widget state */
  widgetState?: WidgetState;
  /** Callback when widget state changes */
  onWidgetStateChange?: (state: WidgetState) => void;
  /** Callback to call a tool from the widget */
  onCallTool?: (name: string, args: Record<string, unknown>) => Promise<CallToolResponse>;
  /** Callback when widget requests a follow-up message */
  onSendFollowUpMessage?: (args: { prompt: string }) => Promise<void>;
  /** Callback when widget requests display mode change */
  onRequestDisplayMode?: (args: { mode: DisplayMode }) => Promise<{ mode: DisplayMode }>;
  /** Callback when widget requests a modal */
  onRequestModal?: (options: ModalOptions) => Promise<void>;
  /** Callback when widget requests to close */
  onRequestClose?: () => void;
  /** Callback when widget wants to open an external URL */
  onOpenExternal?: (payload: { href: string }) => void;
  /** Callback when remote component emits action (legacy) */
  onAction?: ((actionId: string, payload?: unknown) => void) | undefined;
  /** Callback to add tool result (for human-in-loop) */
  onAddResult?: ((result: unknown) => void) | undefined;
  /** Fallback while loading */
  fallback?: React.ReactNode | undefined;
  /** Error fallback */
  errorFallback?: React.ReactNode | undefined;
  /** Additional class names */
  className?: string | undefined;
}

/**
 * Renders a tool UI component from a remote PSL-isolated source.
 *
 * Security model:
 * - Component runs in sandboxed iframe
 * - Only allow-scripts enabled (no same-origin)
 * - Communication via postMessage with source validation
 * - PSL isolation prevents cross-component data access
 */
export const RemoteToolUI: React.FC<RemoteToolUIProps> = ({
  src,
  toolName,
  toolInput,
  toolOutput,
  theme = "light",
  locale = "en-US",
  displayMode = "inline",
  maxHeight = 800,
  widgetState = null,
  onWidgetStateChange,
  onCallTool,
  onSendFollowUpMessage,
  onRequestDisplayMode,
  onRequestModal,
  onRequestClose,
  onOpenExternal,
  onAction,
  onAddResult,
  fallback,
  errorFallback,
  className,
}) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const bridgeRef = React.useRef<MessageBridge | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [height, setHeight] = React.useState(100);
  const [error, setError] = React.useState<string | null>(null);

  // Generate unique iframe name for stronger validation
  const iframeName = React.useMemo(() => `tool-ui-${crypto.randomUUID()}`, []);

  // Extract origin for validation
  const expectedOrigin = React.useMemo(() => {
    try {
      return new URL(src).origin;
    } catch {
      return null;
    }
  }, [src]);

  // Build current globals
  const globals = React.useMemo<AUIGlobals>(
    () => ({
      theme,
      locale,
      displayMode,
      maxHeight,
      toolInput,
      toolOutput,
      widgetState,
      userAgent: DEFAULT_GLOBALS.userAgent,
      safeArea: DEFAULT_GLOBALS.safeArea,
    }),
    [theme, locale, displayMode, maxHeight, toolInput, toolOutput, widgetState]
  );

  // Create message handlers
  const handlers = React.useMemo<MessageBridgeHandlers>(
    () => ({
      callTool: async (name, args) => {
        if (!onCallTool) {
          throw new Error("callTool not supported");
        }
        return onCallTool(name, args);
      },
      setWidgetState: (state) => {
        onWidgetStateChange?.(state);
      },
      sendFollowUpMessage: async (args) => {
        if (!onSendFollowUpMessage) {
          throw new Error("sendFollowUpMessage not supported");
        }
        return onSendFollowUpMessage(args);
      },
      requestDisplayMode: async (args) => {
        if (!onRequestDisplayMode) {
          throw new Error("requestDisplayMode not supported");
        }
        return onRequestDisplayMode(args);
      },
      requestModal: async (options) => {
        if (!onRequestModal) {
          throw new Error("requestModal not supported");
        }
        return onRequestModal(options);
      },
      requestClose: () => {
        onRequestClose?.();
      },
      openExternal: (payload) => {
        if (onOpenExternal) {
          onOpenExternal(payload);
        } else {
          // Default: open in new tab with security attributes
          window.open(payload.href, "_blank", "noopener,noreferrer");
        }
      },
      notifyIntrinsicHeight: (h) => {
        setHeight(Math.min(h, maxHeight));
      },
    }),
    [
      onCallTool,
      onWidgetStateChange,
      onSendFollowUpMessage,
      onRequestDisplayMode,
      onRequestModal,
      onRequestClose,
      onOpenExternal,
      maxHeight,
    ]
  );

  // Setup message bridge
  React.useEffect(() => {
    if (!iframeRef.current || !expectedOrigin) return;

    const legacyHandlers = {
      onReady: () => {
        setStatus("ready");
        // Send initial globals when iframe is ready
        bridgeRef.current?.sendGlobals(globals);
      },
      onAction: onAction,
      onAddResult: onAddResult,
      onResize: (h: number) => setHeight(Math.min(h, maxHeight)),
      onError: (err: string) => {
        setStatus("error");
        setError(err);
      },
    };

    bridgeRef.current = new MessageBridge(handlers, legacyHandlers);
    bridgeRef.current.attach(iframeRef.current);

    return () => {
      bridgeRef.current?.detach();
      bridgeRef.current = null;
    };
  }, [expectedOrigin, handlers, onAction, onAddResult, maxHeight, globals]);

  // Send updated globals when they change
  React.useEffect(() => {
    if (status === "ready" && bridgeRef.current) {
      bridgeRef.current.sendGlobals(globals);
    }
  }, [status, globals]);

  if (!expectedOrigin) {
    return (
      errorFallback ?? <div className="tool-ui-error">Invalid source URL</div>
    );
  }

  if (status === "error") {
    return (
      errorFallback ?? (
        <div className="tool-ui-error">
          <p>Failed to load remote component</p>
          {error && <pre>{error}</pre>}
        </div>
      )
    );
  }

  return (
    <div className={cn("tool-ui-remote-container", className)}>
      {status === "loading" &&
        (fallback ?? (
          <div className="tool-ui-remote-loading">
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
        ))}

      <iframe
        ref={iframeRef}
        src={src}
        name={iframeName}
        title={`Tool UI: ${toolName}`}
        sandbox="allow-scripts allow-forms"
        style={{ height: `${height}px` }}
        className="w-full border-0"
        onLoad={() => setStatus("loading")}
      />
    </div>
  );
};
```

#### 2. Update MCPToolUIProvider to Pass New Props
**File**: `packages/tool-ui-server/src/remote/mcp-tool-ui-provider.tsx`

This file needs to be updated to pass `theme`, `locale`, and wire up callbacks. The exact changes depend on the current implementation, but the key additions are:

```typescript
// Add to the render function props passed to RemoteToolUI:
<RemoteToolUI
  src={`${baseUrl}/render?component=${encodeURIComponent(componentName)}`}
  toolName={toolName}
  toolInput={args}
  toolOutput={result}
  theme={theme}  // From context or prop
  locale={locale}  // From context or prop
  displayMode={displayMode}  // State managed in provider
  widgetState={widgetState}  // State managed per-tool
  onWidgetStateChange={(state) => {
    // Persist widget state for this tool call
    setWidgetStates(prev => ({ ...prev, [toolCallId]: state }));
  }}
  onCallTool={async (name, args) => {
    // Call MCP tool through the client
    const result = await mcpClient.callTool(name, args);
    return result;
  }}
  onAddResult={addResult}
  // ... other existing props
/>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `make -C packages/tool-ui-server typecheck`
- [x] All existing tests pass: `make -C packages/tool-ui-server test`
- [x] New props are properly typed

#### Manual Verification:
- [x] Widget receives theme and locale in globals
- [x] Widget can call `setWidgetState` and state persists
- [x] Widget can call `notifyIntrinsicHeight` and height updates

---

## Phase 5: Update Iframe Runtime

### Overview
Update `createToolUIRuntime` to work with the new bridge script and support both legacy and new protocols.

### Changes Required:

#### 1. Update createToolUIRuntime
**File**: `packages/tool-ui-server/src/create-tool-ui-runtime.ts`

Add support for new globals and provide helper hooks/utilities:

```typescript
import type { z } from "zod";
import type { AUIGlobals, WindowAUI } from "./types/protocol";

// ... existing ToolUIComponentConfig and ToolUIRuntime interfaces ...

// Add type declaration for window.aui
declare global {
  interface Window {
    aui?: WindowAUI;
    __initAUIGlobals?: (globals: AUIGlobals) => void;
  }
}

/**
 * Get the current globals from window.aui
 */
export function getGlobals(): AUIGlobals | null {
  if (typeof window === "undefined" || !window.aui) return null;
  return {
    theme: window.aui.theme,
    locale: window.aui.locale,
    displayMode: window.aui.displayMode,
    maxHeight: window.aui.maxHeight,
    toolInput: window.aui.toolInput,
    toolOutput: window.aui.toolOutput,
    widgetState: window.aui.widgetState,
    userAgent: window.aui.userAgent,
    safeArea: window.aui.safeArea,
  };
}

/**
 * Subscribe to global state changes
 */
export function onGlobalsChange(
  callback: (changed: Partial<AUIGlobals>) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ globals: Partial<AUIGlobals> }>;
    callback(customEvent.detail.globals);
  };
  
  window.addEventListener("aui:set_globals", handler);
  return () => window.removeEventListener("aui:set_globals", handler);
}

/**
 * Call a tool from within a widget
 */
export async function callTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  if (typeof window === "undefined" || !window.aui) {
    throw new Error("AUI bridge not available");
  }
  return window.aui.callTool(name, args);
}

/**
 * Set widget state (persisted by parent)
 */
export function setWidgetState(state: Record<string, unknown> | null): void {
  if (typeof window === "undefined" || !window.aui) {
    console.warn("AUI bridge not available");
    return;
  }
  window.aui.setWidgetState(state);
}

/**
 * Request a display mode change
 */
export async function requestDisplayMode(
  mode: "inline" | "fullscreen" | "pip"
): Promise<{ mode: string }> {
  if (typeof window === "undefined" || !window.aui) {
    throw new Error("AUI bridge not available");
  }
  return window.aui.requestDisplayMode({ mode });
}

/**
 * Send a follow-up message to the assistant
 */
export async function sendFollowUpMessage(prompt: string): Promise<void> {
  if (typeof window === "undefined" || !window.aui) {
    throw new Error("AUI bridge not available");
  }
  return window.aui.sendFollowUpMessage({ prompt });
}

/**
 * Request to open a modal view
 */
export async function requestModal(
  options: { title?: string; params?: Record<string, unknown> }
): Promise<void> {
  if (typeof window === "undefined" || !window.aui) {
    throw new Error("AUI bridge not available");
  }
  return window.aui.requestModal(options);
}

/**
 * Request to close the widget
 */
export function requestClose(): void {
  if (typeof window === "undefined" || !window.aui) {
    console.warn("AUI bridge not available");
    return;
  }
  window.aui.requestClose();
}

/**
 * Open an external URL
 */
export function openExternal(href: string): void {
  if (typeof window === "undefined" || !window.aui) {
    // Fallback to window.open
    window.open(href, "_blank", "noopener,noreferrer");
    return;
  }
  window.aui.openExternal({ href });
}

/**
 * Notify parent of intrinsic height change
 */
export function notifyIntrinsicHeight(height: number): void {
  if (typeof window === "undefined" || !window.aui) {
    // Fallback to legacy resize message
    window.parent?.postMessage({ type: "resize", payload: height }, "*");
    return;
  }
  window.aui.notifyIntrinsicHeight(height);
}

// ... rest of existing createToolUIRuntime implementation ...
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `make -C packages/tool-ui-server typecheck`
- [x] All existing tests pass: `make -C packages/tool-ui-server test`
- [x] Helper functions are exported from package

#### Manual Verification:
- [x] Widgets can use `callTool()` helper to invoke tools
- [x] Widgets can use `setWidgetState()` to persist state
- [x] Widgets can use `onGlobalsChange()` to react to theme/locale changes

---

## Phase 6: React Hooks for Widgets

### Overview
Create React hooks that widget developers can use to easily access globals and API methods, similar to the `useOpenAI` hooks in ChatGPT App Studio.

### Changes Required:

#### 1. Create React Hooks
**File**: `packages/tool-ui-server/src/hooks/use-aui.tsx` (new file)

```typescript
"use client";

import * as React from "react";
import type {
  AUIGlobals,
  Theme,
  DisplayMode,
  WidgetState,
  CallToolResponse,
} from "../types/protocol";

// Context for AUI state
interface AUIContextValue extends AUIGlobals {
  // API methods
  callTool: (name: string, args: Record<string, unknown>) => Promise<CallToolResponse>;
  setWidgetState: (state: WidgetState) => void;
  sendFollowUpMessage: (prompt: string) => Promise<void>;
  requestDisplayMode: (mode: DisplayMode) => Promise<{ mode: DisplayMode }>;
  requestModal: (options: { title?: string; params?: Record<string, unknown> }) => Promise<void>;
  requestClose: () => void;
  openExternal: (href: string) => void;
  notifyIntrinsicHeight: (height: number) => void;
}

const AUIContext = React.createContext<AUIContextValue | null>(null);

interface AUIProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that sets up AUI context from window.aui
 */
export function AUIProvider({ children }: AUIProviderProps) {
  const [globals, setGlobals] = React.useState<AUIGlobals>(() => {
    if (typeof window === "undefined" || !window.aui) {
      return {
        theme: "light",
        locale: "en-US",
        displayMode: "inline",
        maxHeight: 800,
        toolInput: {},
        toolOutput: null,
        widgetState: null,
        userAgent: {
          device: { type: "desktop" },
          capabilities: { hover: true, touch: false },
        },
        safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
      };
    }
    return {
      theme: window.aui.theme,
      locale: window.aui.locale,
      displayMode: window.aui.displayMode,
      maxHeight: window.aui.maxHeight,
      toolInput: window.aui.toolInput,
      toolOutput: window.aui.toolOutput,
      widgetState: window.aui.widgetState,
      userAgent: window.aui.userAgent,
      safeArea: window.aui.safeArea,
    };
  });

  // Listen for globals changes
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ globals: Partial<AUIGlobals> }>;
      setGlobals((prev) => ({ ...prev, ...customEvent.detail.globals }));
    };

    window.addEventListener("aui:set_globals", handler);
    return () => window.removeEventListener("aui:set_globals", handler);
  }, []);

  const value = React.useMemo<AUIContextValue>(
    () => ({
      ...globals,
      callTool: async (name, args) => {
        if (!window.aui) throw new Error("AUI not available");
        return window.aui.callTool(name, args);
      },
      setWidgetState: (state) => {
        window.aui?.setWidgetState(state);
      },
      sendFollowUpMessage: async (prompt) => {
        if (!window.aui) throw new Error("AUI not available");
        return window.aui.sendFollowUpMessage({ prompt });
      },
      requestDisplayMode: async (mode) => {
        if (!window.aui) throw new Error("AUI not available");
        return window.aui.requestDisplayMode({ mode });
      },
      requestModal: async (options) => {
        if (!window.aui) throw new Error("AUI not available");
        return window.aui.requestModal(options);
      },
      requestClose: () => {
        window.aui?.requestClose();
      },
      openExternal: (href) => {
        if (window.aui) {
          window.aui.openExternal({ href });
        } else {
          window.open(href, "_blank", "noopener,noreferrer");
        }
      },
      notifyIntrinsicHeight: (height) => {
        if (window.aui) {
          window.aui.notifyIntrinsicHeight(height);
        } else {
          window.parent?.postMessage({ type: "resize", payload: height }, "*");
        }
      },
    }),
    [globals]
  );

  return <AUIContext.Provider value={value}>{children}</AUIContext.Provider>;
}

/**
 * Hook to access the full AUI context
 */
export function useAUI(): AUIContextValue {
  const context = React.useContext(AUIContext);
  if (!context) {
    throw new Error("useAUI must be used within an AUIProvider");
  }
  return context;
}

/**
 * Hook to get current theme
 */
export function useTheme(): Theme {
  return useAUI().theme;
}

/**
 * Hook to get current locale
 */
export function useLocale(): string {
  return useAUI().locale;
}

/**
 * Hook to get current display mode
 */
export function useDisplayMode(): DisplayMode {
  return useAUI().displayMode;
}

/**
 * Hook to get tool input
 */
export function useToolInput<T = Record<string, unknown>>(): T {
  return useAUI().toolInput as T;
}

/**
 * Hook to get tool output
 */
export function useToolOutput<T = Record<string, unknown>>(): T | null {
  return useAUI().toolOutput as T | null;
}

/**
 * Hook to get and set widget state
 */
export function useWidgetState<T extends Record<string, unknown>>(
  defaultState?: T
): readonly [T | null, (state: T | null) => void] {
  const context = useAUI();
  const currentState = (context.widgetState as T | null) ?? defaultState ?? null;

  const setState = React.useCallback(
    (state: T | null) => {
      context.setWidgetState(state);
    },
    [context]
  );

  return [currentState, setState] as const;
}

/**
 * Hook to call tools
 */
export function useCallTool() {
  const context = useAUI();
  return context.callTool;
}

/**
 * Hook to request display mode changes
 */
export function useRequestDisplayMode() {
  const context = useAUI();
  return context.requestDisplayMode;
}

/**
 * Hook to send follow-up messages
 */
export function useSendFollowUpMessage() {
  const context = useAUI();
  return context.sendFollowUpMessage;
}

/**
 * Hook to get max height
 */
export function useMaxHeight(): number {
  return useAUI().maxHeight;
}

/**
 * Hook to get user agent info
 */
export function useUserAgent() {
  return useAUI().userAgent;
}

/**
 * Hook to get safe area insets
 */
export function useSafeArea() {
  return useAUI().safeArea;
}
```

#### 2. Export Hooks from Package
**File**: `packages/tool-ui-server/src/index.ts`

Add exports:

```typescript
export {
  AUIProvider,
  useAUI,
  useTheme,
  useLocale,
  useDisplayMode,
  useToolInput,
  useToolOutput,
  useWidgetState,
  useCallTool,
  useRequestDisplayMode,
  useSendFollowUpMessage,
  useMaxHeight,
  useUserAgent,
  useSafeArea,
} from "./hooks/use-aui";
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `make -C packages/tool-ui-server typecheck`
- [x] All tests pass: `make -C packages/tool-ui-server test`
- [x] Hooks are exported from package

#### Manual Verification:
- [x] Widget using `useTheme()` gets correct theme
- [x] Widget using `useWidgetState()` can persist state
- [x] Widget using `useCallTool()` can invoke tools

---

## Phase 7: Update Manifest Schema

### Overview
Extend the manifest schema to support new permission flags and visibility options.

### Changes Required:

#### 1. Update Manifest Schema
**File**: `packages/tool-ui-server/src/schemas/manifest.ts`

```typescript
import { z } from "zod";

/**
 * Schema for a single component definition in the manifest.
 */
export const ComponentDefinitionSchema = z.object({
  /** Component name (used in tool results) */
  name: z.string().min(1),
  /** Human-readable description */
  description: z.string().optional(),
  /** Tool names this component handles */
  toolNames: z.array(z.string()).min(1),
  /** Zod-compatible JSON Schema for props validation */
  propsSchema: z.record(z.unknown()).optional(),
  /** Whether this tool should be hidden from users */
  visibility: z.enum(["visible", "hidden"]).default("visible"),
  /** Default display mode for this component */
  defaultDisplayMode: z.enum(["inline", "fullscreen", "pip"]).default("inline"),
});

export type ComponentDefinition = z.infer<typeof ComponentDefinitionSchema>;

/**
 * Schema for the complete UI manifest from an MCP server.
 */
export const UIManifestSchema = z.object({
  /** Manifest schema version */
  version: z.literal("1.0"),
  /** Unique server identifier */
  serverId: z.string().min(1),
  /** Human-readable server name */
  serverName: z.string().optional(),
  /** URL to the component bundle */
  bundleUrl: z.string().url(),
  /** SHA-256 hash of the bundle for integrity verification */
  bundleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  /** Component definitions */
  components: z.array(ComponentDefinitionSchema).min(1),
  /** Required permissions */
  permissions: z
    .object({
      /** Allow network requests from component */
      network: z.boolean().default(false),
      /** Allow localStorage/sessionStorage */
      storage: z.boolean().default(false),
      /** Allow clipboard access */
      clipboard: z.boolean().default(false),
      /** Allow calling other tools */
      callTools: z.boolean().default(false),
      /** Allow requesting display mode changes */
      displayMode: z.boolean().default(false),
      /** Allow sending follow-up messages */
      followUpMessages: z.boolean().default(false),
      /** Allow opening modals */
      modals: z.boolean().default(false),
    })
    .default({}),
});

export type UIManifest = z.infer<typeof UIManifestSchema>;

// ... rest unchanged ...
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `make -C packages/tool-ui-server typecheck`
- [x] Schema tests pass: `make -C packages/tool-ui-server test`
- [x] Existing manifests still validate (backwards compatible)

#### Manual Verification:
- [x] New manifest with `callTools: true` permission validates
- [x] Old manifests without new fields still work

---

## Phase 8: Integration Tests

### Overview
Create integration tests that verify the full round-trip communication between parent and iframe.

### Changes Required:

#### 1. Create Integration Test File
**File**: `packages/tool-ui-server/src/__tests__/integration.test.ts` (new file)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MessageBridge } from "../remote/message-bridge";
import { generateBridgeScript, DEFAULT_GLOBALS } from "../runtime/bridge-script";

describe("AUI Protocol Integration", () => {
  let parentWindow: Window;
  let iframeWindow: Window & { aui?: unknown };
  let messageHandlers: Map<string, (event: MessageEvent) => void>;

  beforeEach(() => {
    messageHandlers = new Map();

    // Create mock windows that can exchange messages
    parentWindow = {
      postMessage: vi.fn((data: unknown) => {
        setTimeout(() => {
          const handler = messageHandlers.get("parent");
          handler?.({
            data,
            source: iframeWindow,
            origin: "*",
          } as MessageEvent);
        }, 0);
      }),
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        if (event === "message") {
          messageHandlers.set("parent", handler);
        }
      }),
      removeEventListener: vi.fn(),
    } as unknown as Window;

    iframeWindow = {
      parent: parentWindow,
      postMessage: vi.fn((data: unknown) => {
        setTimeout(() => {
          const handler = messageHandlers.get("iframe");
          handler?.({
            data,
            source: parentWindow,
            origin: "*",
          } as MessageEvent);
        }, 0);
      }),
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        if (event === "message") {
          messageHandlers.set("iframe", handler);
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as Window & { aui?: unknown };
  });

  it("completes full callTool round-trip", async () => {
    // Setup parent with MessageBridge
    const handlers = {
      callTool: vi.fn().mockResolvedValue({ content: "Tool result" }),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn(),
      requestDisplayMode: vi.fn(),
      requestModal: vi.fn(),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
    };

    const mockIframe = {
      contentWindow: iframeWindow,
    } as unknown as HTMLIFrameElement;

    const bridge = new MessageBridge(handlers);
    
    // Manually set up the handler since we're mocking addEventListener
    (parentWindow.addEventListener as ReturnType<typeof vi.fn>).mock.calls.forEach(
      ([event, handler]: [string, EventListener]) => {
        if (event === "message") {
          messageHandlers.set("parent", handler);
        }
      }
    );

    bridge.attach(mockIframe);

    // Simulate iframe sending a method call
    const methodCall = {
      type: "AUI_METHOD_CALL",
      id: "test-123",
      method: "callTool",
      args: ["search", { query: "test" }],
    };

    // Trigger the message handler
    const parentHandler = messageHandlers.get("parent");
    parentHandler?.({
      data: methodCall,
      source: iframeWindow,
      origin: "*",
    } as MessageEvent);

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify the tool was called
    expect(handlers.callTool).toHaveBeenCalledWith("search", { query: "test" });

    // Verify response was sent back to iframe
    expect(iframeWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUI_METHOD_RESPONSE",
        id: "test-123",
        result: { content: "Tool result" },
      }),
      "*"
    );

    bridge.detach();
  });

  it("globals update triggers event in iframe", async () => {
    const handlers = {
      callTool: vi.fn(),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn(),
      requestDisplayMode: vi.fn(),
      requestModal: vi.fn(),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
    };

    const mockIframe = {
      contentWindow: iframeWindow,
    } as unknown as HTMLIFrameElement;

    const bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);

    // Send globals update
    const newGlobals = {
      ...DEFAULT_GLOBALS,
      theme: "dark" as const,
      locale: "es-ES",
    };

    bridge.sendGlobals(newGlobals);

    expect(iframeWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_SET_GLOBALS",
        globals: newGlobals,
      },
      "*"
    );

    bridge.detach();
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] All integration tests pass: `make -C packages/tool-ui-server test`
- [x] Tests cover callTool, setWidgetState, and globals sync

#### Manual Verification:
- [x] Test output shows full round-trip message flow

---

## Testing Strategy

### Unit Tests:
- Protocol type definitions compile correctly
- Bridge script generates valid JavaScript
- MessageBridge handles all method types
- React hooks work in isolation

### Integration Tests:
- Full round-trip: iframe calls method → parent processes → response received
- Globals sync: parent updates globals → iframe receives event
- Legacy compatibility: old `resize` messages still work

### Manual Testing Steps:
1. Create a test widget that uses `useTheme()` and verify it receives correct theme
2. Create a widget that calls `setWidgetState()` and verify state persists across re-renders
3. Test `callTool()` from widget to verify async response handling
4. Test `requestDisplayMode()` and verify UI responds appropriately
5. Verify theme toggle propagates to iframe

## Performance Considerations

1. **Message serialization**: Use structured clone-safe objects only
2. **Globals diffing**: Only dispatch events when globals actually change
3. **Timeout handling**: 30 second timeout prevents memory leaks from abandoned promises
4. **Event cleanup**: All event listeners properly cleaned up on unmount

## Migration Notes

### Backwards Compatibility
- Legacy `render`, `update`, `resize`, `action`, `addResult`, `error` messages still work
- Existing widgets continue to function without changes
- New features are opt-in via new API

### Upgrade Path for Existing Widgets
1. No changes required for basic functionality
2. To use new features, import hooks from `@assistant-ui/tool-ui-server`
3. Wrap widget root in `<AUIProvider>`
4. Use hooks like `useTheme()`, `useCallTool()`, etc.

## References

- Original research: `notes/research/mcp_ui_vs_chatgpt_apps.md`
- ChatGPT App Studio reference: `~/Desktop/work/chatgpt-app-studio/lib/workbench/types.ts`
- Current implementation: `packages/tool-ui-server/src/remote/remote-tool-ui.tsx:39`
- Current runtime: `packages/tool-ui-server/src/create-tool-ui-runtime.ts:42`
