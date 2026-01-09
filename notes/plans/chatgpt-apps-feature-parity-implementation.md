# ChatGPT Apps SDK Feature Parity Implementation Plan

## Overview

Implement the missing features from ChatGPT Apps SDK to achieve full feature parity in `@assistant-ui/tool-ui-server`. This positions AUI as the open-source alternative to ChatGPT Apps, using `window.aui` as our namespace.

## Current State Analysis

Our implementation has ~90% feature parity with ChatGPT Apps SDK. The core architecture is solid:
- Protocol types: `packages/tool-ui-server/src/types/protocol.ts`
- Bridge script: `packages/tool-ui-server/src/runtime/bridge-script.ts`
- React hooks: `packages/tool-ui-server/src/hooks/use-aui.tsx`
- Message bridge: `packages/tool-ui-server/src/remote/message-bridge.ts`
- Remote component: `packages/tool-ui-server/src/remote/remote-tool-ui.tsx`

### Key Discoveries:
- Bridge script generates vanilla JS injected into iframe (`bridge-script.ts:20-165`)
- AUIGlobals interface defines all widget-accessible state (`protocol.ts:32-42`)
- AUIAPI interface defines all callable methods (`protocol.ts:55-69`)
- MessageBridgeHandlers mirror AUIAPI for parent-side handling (`message-bridge.ts:12-26`)
- Tests exist but are minimal - only 3 test files for core functionality

## Desired End State

After this plan is complete:
1. All missing ChatGPT Apps SDK features are implemented
2. Full API parity with `window.openai` (under `window.aui` namespace)
3. Comprehensive test coverage for all new features
4. Documentation updated with new APIs

### Verification:
- All new APIs have corresponding tests
- Type exports are complete in `index.ts`
- Example app demonstrates new features
- `npm run test` passes with all new tests

## What We're NOT Doing

- OAuth/Security Schemes (separate plan)
- Monetization features (platform-specific)
- Changing namespace from `window.aui` to `window.openai`
- `text/html+skybridge` MIME type (our registry approach is equivalent)

## Implementation Approach

We'll implement features in 4 phases, ordered by dependency and priority:
1. **Phase 1**: Core Protocol Extensions (types, globals, bridge foundations)
2. **Phase 2**: File Handling APIs (upload/download)
3. **Phase 3**: Tool Metadata (annotations, visibility, invocation messages)
4. **Phase 4**: Context & Utility Features (user location, session ID, widget control)

Each phase builds on the previous, with tests written alongside implementation.

---

## Phase 1: Core Protocol Extensions

### Overview
Extend the protocol types and infrastructure to support new features. This phase establishes the foundation for all subsequent phases.

### Changes Required:

#### 1. Extend AUIGlobals Interface
**File**: `packages/tool-ui-server/src/types/protocol.ts`
**Changes**: Add new global properties for user location, widget session ID, tool response metadata

```typescript
// Add after SafeArea interface (line ~30)
export interface UserLocation {
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface ToolResponseMetadata {
  /** Stable ID for the currently mounted widget instance */
  widgetSessionId?: string;
  /** Server-requested widget close */
  closeWidget?: boolean;
  /** Widget border preference */
  prefersBorder?: boolean;
  /** Any additional metadata from server */
  [key: string]: unknown;
}

// Update AUIGlobals interface (around line 32-42)
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
  // NEW: Added for ChatGPT Apps parity
  userLocation: UserLocation | null;
  toolResponseMetadata: ToolResponseMetadata | null;
}
```

#### 2. Extend AUIAPI Interface
**File**: `packages/tool-ui-server/src/types/protocol.ts`
**Changes**: Add file upload/download methods

```typescript
// Add new response types before AUIAPI (around line 48)
export interface UploadFileResponse {
  fileId: string;
}

export interface GetFileDownloadUrlResponse {
  downloadUrl: string;
}

// Update AUIAPI interface (around line 55-69)
export interface AUIAPI {
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResponse>;
  setWidgetState: (state: WidgetState) => void;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  requestDisplayMode: (args: {
    mode: DisplayMode;
  }) => Promise<{ mode: DisplayMode }>;
  requestModal: (options: ModalOptions) => Promise<void>;
  requestClose: () => void;
  openExternal: (payload: { href: string }) => void;
  notifyIntrinsicHeight: (height: number) => void;
  // NEW: File handling APIs
  uploadFile: (file: File) => Promise<UploadFileResponse>;
  getFileDownloadUrl: (args: { fileId: string }) => Promise<GetFileDownloadUrlResponse>;
}
```

#### 3. Update Default Globals
**File**: `packages/tool-ui-server/src/runtime/bridge-script.ts`
**Changes**: Add defaults for new global properties

```typescript
// Update DEFAULT_GLOBALS (around line 3-18)
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
  // NEW
  userLocation: null,
  toolResponseMetadata: null,
};
```

#### 4. Update Bridge Script Getters
**File**: `packages/tool-ui-server/src/runtime/bridge-script.ts`
**Changes**: Add getters for new globals in the window.aui object

```typescript
// In generateBridgeScript(), update the Object.create block (around line 134-146)
// Add after safeArea getter:
userLocation: { get: function() { return globals.userLocation; }, enumerable: true },
toolResponseMetadata: { get: function() { return globals.toolResponseMetadata; }, enumerable: true },
```

#### 5. Add File API Methods to Bridge Script
**File**: `packages/tool-ui-server/src/runtime/bridge-script.ts`
**Changes**: Add uploadFile and getFileDownloadUrl methods

```typescript
// In the api object (around line 107-132), add:
uploadFile: function(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      var base64 = reader.result.toString().split(',')[1];
      callMethod("uploadFile", [{
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64
      }]).then(resolve).catch(reject);
    };
    reader.onerror = function() {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
},
getFileDownloadUrl: function(args) {
  return callMethod("getFileDownloadUrl", [args]);
},
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `npm run build -w @assistant-ui/tool-ui-server`
- [ ] Existing tests still pass: `npm run test -w @assistant-ui/tool-ui-server`
- [ ] Linting passes: `npm run lint -w @assistant-ui/tool-ui-server`

#### Manual Verification:
- [ ] New types are properly exported from index.ts
- [ ] Bridge script generates valid JavaScript with new properties

---

## Phase 2: File Handling APIs

### Overview
Implement file upload and download functionality, mirroring ChatGPT's `uploadFile` and `getFileDownloadUrl` APIs.

### Changes Required:

#### 1. Update MessageBridgeHandlers
**File**: `packages/tool-ui-server/src/remote/message-bridge.ts`
**Changes**: Add file handling methods to handlers interface

```typescript
// Update MessageBridgeHandlers interface (around line 12-26)
export interface MessageBridgeHandlers {
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResponse>;
  setWidgetState: (state: WidgetState) => void;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  requestDisplayMode: (args: {
    mode: DisplayMode;
  }) => Promise<{ mode: DisplayMode }>;
  requestModal: (options: ModalOptions) => Promise<void>;
  requestClose: () => void;
  openExternal: (payload: { href: string }) => void;
  notifyIntrinsicHeight: (height: number) => void;
  // NEW: File handling
  uploadFile: (file: { name: string; type: string; size: number; data: string }) => Promise<{ fileId: string }>;
  getFileDownloadUrl: (args: { fileId: string }) => Promise<{ downloadUrl: string }>;
}
```

#### 2. Add File Method Execution
**File**: `packages/tool-ui-server/src/remote/message-bridge.ts`
**Changes**: Handle file methods in executeMethod

```typescript
// In executeMethod switch statement (around line 142-180), add cases:
case "uploadFile": {
  const [fileData] = args as [{ name: string; type: string; size: number; data: string }];
  return this.handlers.uploadFile(fileData);
}
case "getFileDownloadUrl": {
  const [urlArgs] = args as [{ fileId: string }];
  return this.handlers.getFileDownloadUrl(urlArgs);
}
```

#### 3. Update RemoteToolUI Props
**File**: `packages/tool-ui-server/src/remote/remote-tool-ui.tsx`
**Changes**: Add file handling callbacks

```typescript
// Update RemoteToolUIProps interface (around line 17-46)
export interface RemoteToolUIProps {
  // ... existing props ...
  // NEW: File handling callbacks
  onUploadFile?: (file: { name: string; type: string; size: number; data: string }) => Promise<{ fileId: string }>;
  onGetFileDownloadUrl?: (args: { fileId: string }) => Promise<{ downloadUrl: string }>;
  // NEW: Context props
  userLocation?: UserLocation | null;
  toolResponseMetadata?: ToolResponseMetadata | null;
}
```

#### 4. Wire Up File Handlers in RemoteToolUI
**File**: `packages/tool-ui-server/src/remote/remote-tool-ui.tsx`
**Changes**: Add handlers to bridge and globals

```typescript
// In the handlers useMemo (around line 141-186), add:
uploadFile: async (fileData) => {
  if (!callbackRefs.current.onUploadFile) {
    throw new Error("uploadFile not supported");
  }
  return callbackRefs.current.onUploadFile(fileData);
},
getFileDownloadUrl: async (args) => {
  if (!callbackRefs.current.onGetFileDownloadUrl) {
    throw new Error("getFileDownloadUrl not supported");
  }
  return callbackRefs.current.onGetFileDownloadUrl(args);
},

// Update globals useMemo (around line 99-120) to include new props:
userLocation: userLocation ?? null,
toolResponseMetadata: toolResponseMetadata ?? null,
```

#### 5. Add React Hooks for File APIs
**File**: `packages/tool-ui-server/src/hooks/use-aui.tsx`
**Changes**: Add hooks for file operations and new globals

```typescript
// Add after useSafeArea (around line 196-198)
export function useUserLocation() {
  return useAUI().userLocation;
}

export function useToolResponseMetadata() {
  return useAUI().toolResponseMetadata;
}

export function useUploadFile() {
  return React.useCallback(async (file: File) => {
    if (!window.aui) throw new Error("AUI not available");
    return window.aui.uploadFile(file);
  }, []);
}

export function useGetFileDownloadUrl() {
  return React.useCallback(async (fileId: string) => {
    if (!window.aui) throw new Error("AUI not available");
    return window.aui.getFileDownloadUrl({ fileId });
  }, []);
}
```

#### 6. Add Vanilla JS Functions
**File**: `packages/tool-ui-server/src/create-tool-ui-runtime.ts`
**Changes**: Add non-React file functions

```typescript
// Add after notifyIntrinsicHeight function (around line 113-119)
export async function uploadFile(file: File): Promise<{ fileId: string }> {
  if (typeof window === "undefined" || !window.aui) {
    throw new Error("AUI bridge not available");
  }
  return window.aui.uploadFile(file);
}

export async function getFileDownloadUrl(fileId: string): Promise<{ downloadUrl: string }> {
  if (typeof window === "undefined" || !window.aui) {
    throw new Error("AUI bridge not available");
  }
  return window.aui.getFileDownloadUrl({ fileId });
}
```

#### 7. Update Exports
**File**: `packages/tool-ui-server/src/index.ts`
**Changes**: Export new functions and types

```typescript
// Update create-tool-ui-runtime exports (around line 3-19)
export {
  // ... existing exports ...
  uploadFile,
  getFileDownloadUrl,
} from "./create-tool-ui-runtime";

// Update hooks exports (around line 77-98)
export {
  // ... existing exports ...
  useUserLocation,
  useToolResponseMetadata,
  useUploadFile,
  useGetFileDownloadUrl,
} from "./hooks";

// Update protocol types (around line 119-132)
export type {
  // ... existing exports ...
  UserLocation,
  ToolResponseMetadata,
  UploadFileResponse,
  GetFileDownloadUrlResponse,
} from "./types/protocol";
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `npm run build -w @assistant-ui/tool-ui-server`
- [ ] All tests pass: `npm run test -w @assistant-ui/tool-ui-server`
- [ ] New exports are accessible: verify in build output

#### Manual Verification:
- [ ] File upload flow works end-to-end in example app
- [ ] File download URL retrieval works in example app

---

## Phase 3: Tool Metadata & Annotations

### Overview
Implement tool annotations (readOnlyHint, destructiveHint, etc.), tool visibility control, and invocation status messages.

### Changes Required:

#### 1. Add Tool Annotation Types
**File**: `packages/tool-ui-server/src/types/protocol.ts`
**Changes**: Add annotation interfaces

```typescript
// Add after ToolResponseMetadata interface
export interface ToolAnnotations {
  /** Signal that the tool is read-only - can skip confirmation prompts */
  readOnlyHint?: boolean;
  /** Declare that the tool may delete or overwrite user data */
  destructiveHint?: boolean;
  /** Declare that the tool publishes content outside current user's account */
  openWorldHint?: boolean;
  /** Declare that calling repeatedly with same args has no additional effect */
  idempotentHint?: boolean;
}

export interface ToolInvocationMessages {
  /** Message shown while tool is being called */
  invoking?: string;
  /** Message shown after tool call completes */
  invoked?: string;
}

export interface ToolMetadata {
  /** Tool annotations for confirmation flow behavior */
  annotations?: ToolAnnotations;
  /** Status messages during tool invocation */
  invocationMessages?: ToolInvocationMessages;
  /** Tool visibility: public (default) or private (hidden from model) */
  visibility?: "public" | "private";
  /** Allow widget to call this tool */
  widgetAccessible?: boolean;
  /** File parameter field names */
  fileParams?: string[];
}
```

#### 2. Add Schemas for Tool Metadata
**File**: `packages/tool-ui-server/src/schemas/shared.ts`
**Changes**: Add Zod schemas for tool metadata

```typescript
// Add after existing schemas
export const ToolAnnotationsSchema = z.object({
  readOnlyHint: z.boolean().optional(),
  destructiveHint: z.boolean().optional(),
  openWorldHint: z.boolean().optional(),
  idempotentHint: z.boolean().optional(),
});

export type ToolAnnotations = z.infer<typeof ToolAnnotationsSchema>;

export const ToolInvocationMessagesSchema = z.object({
  invoking: z.string().max(64).optional(),
  invoked: z.string().max(64).optional(),
});

export type ToolInvocationMessages = z.infer<typeof ToolInvocationMessagesSchema>;

export const ToolMetadataSchema = z.object({
  annotations: ToolAnnotationsSchema.optional(),
  invocationMessages: ToolInvocationMessagesSchema.optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  widgetAccessible: z.boolean().default(false),
  fileParams: z.array(z.string()).optional(),
});

export type ToolMetadata = z.infer<typeof ToolMetadataSchema>;
```

#### 3. Update ToolWithUIConfig
**File**: `packages/tool-ui-server/src/types.ts`
**Changes**: Add metadata to tool config

```typescript
// Update ToolWithUIConfig interface (around line 6-21)
export interface ToolWithUIConfig<TArgs extends z.ZodType, TResult> {
  /** Tool name (must be unique within server) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Zod schema for tool arguments */
  parameters: TArgs;
  /** UI component name to render results */
  component: string;
  /** Execute the tool */
  execute: (args: z.infer<TArgs>) => Promise<TResult>;
  /** Transform result into component props (optional) */
  transformResult?:
    | ((result: TResult, args: z.infer<TArgs>) => Record<string, unknown>)
    | undefined;
  // NEW: Tool metadata for ChatGPT Apps parity
  /** Tool annotations for confirmation behavior */
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    openWorldHint?: boolean;
    idempotentHint?: boolean;
  };
  /** Status messages during invocation */
  invocationMessages?: {
    invoking?: string;
    invoked?: string;
  };
  /** Tool visibility: public (default) or private */
  visibility?: "public" | "private";
  /** Allow widget to call this tool */
  widgetAccessible?: boolean;
  /** File parameter field names */
  fileParams?: string[];
}
```

#### 4. Update Component Definition Schema
**File**: `packages/tool-ui-server/src/schemas/manifest.ts`
**Changes**: Add widget border preference

```typescript
// Update ComponentDefinitionSchema (around line 3-10)
export const ComponentDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  toolNames: z.array(z.string()).min(1),
  propsSchema: z.record(z.unknown()).optional(),
  visibility: z.enum(["visible", "hidden"]).default("visible"),
  defaultDisplayMode: z.enum(["inline", "fullscreen", "pip"]).default("inline"),
  // NEW
  prefersBorder: z.boolean().default(false),
});
```

#### 5. Export New Types and Schemas
**File**: `packages/tool-ui-server/src/index.ts`
**Changes**: Export tool metadata types

```typescript
// Update schemas exports (around line 44-58)
export {
  // ... existing exports ...
  ToolAnnotationsSchema,
  type ToolAnnotations,
  ToolInvocationMessagesSchema,
  type ToolInvocationMessages,
  ToolMetadataSchema,
  type ToolMetadata,
} from "./schemas";
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `npm run build -w @assistant-ui/tool-ui-server`
- [ ] Schema validation tests pass
- [ ] Type exports are complete

#### Manual Verification:
- [ ] Tool metadata can be specified in example server
- [ ] Annotations affect tool behavior appropriately

---

## Phase 4: Context & Utility Features

### Overview
Implement remaining context features: user location, widget session ID generation, server-side widget close, and widget border preference.

### Changes Required:

#### 1. Add Widget Session ID Generation
**File**: `packages/tool-ui-server/src/remote/remote-tool-ui.tsx`
**Changes**: Generate and track widget session ID

```typescript
// Add at component level (after iframeName useMemo, around line 82)
const widgetSessionId = React.useMemo(
  () => `ws_${crypto.randomUUID()}`,
  []
);

// Update globals useMemo to include widgetSessionId in toolResponseMetadata
const globals = React.useMemo<AUIGlobals>(
  () => ({
    // ... existing globals ...
    toolResponseMetadata: {
      ...(toolResponseMetadata ?? {}),
      widgetSessionId,
    },
  }),
  [/* ... existing deps ..., widgetSessionId */],
);
```

#### 2. Handle Server-Side Widget Close
**File**: `packages/tool-ui-server/src/remote/remote-tool-ui.tsx`
**Changes**: React to closeWidget in metadata

```typescript
// Add effect to handle server-side close (after existing effects)
React.useEffect(() => {
  if (toolResponseMetadata?.closeWidget) {
    onRequestClose?.();
  }
}, [toolResponseMetadata?.closeWidget, onRequestClose]);
```

#### 3. Add Widget Border Support
**File**: `packages/tool-ui-server/src/remote/remote-tool-ui.tsx`
**Changes**: Add border styling based on metadata

```typescript
// Update RemoteToolUIProps to include prefersBorder
export interface RemoteToolUIProps {
  // ... existing props ...
  prefersBorder?: boolean;
}

// In the component, apply border styling
const shouldShowBorder = prefersBorder || toolResponseMetadata?.prefersBorder;

// In the return JSX, update the container div className
<div
  className={cn(
    "tool-ui-remote-container",
    isFullscreen
      ? "fixed inset-0 z-40 flex flex-col bg-background pt-12"
      : "",
    shouldShowBorder && !isFullscreen && "rounded-lg border",
    className,
  )}
>
```

#### 4. Update AUIProvider for New Globals
**File**: `packages/tool-ui-server/src/hooks/use-aui.tsx`
**Changes**: Include new globals in context

```typescript
// Update AUIContextValue interface (around line 12-27)
interface AUIContextValue extends AUIGlobals {
  // ... existing methods ...
  uploadFile: (file: File) => Promise<{ fileId: string }>;
  getFileDownloadUrl: (fileId: string) => Promise<{ downloadUrl: string }>;
}

// Update DEFAULT_GLOBALS (around line 35-48)
const DEFAULT_GLOBALS: AUIGlobals = {
  // ... existing defaults ...
  userLocation: null,
  toolResponseMetadata: null,
};

// Update the useState initializer (around line 51-66)
const [globals, setGlobals] = React.useState<AUIGlobals>(() => {
  if (typeof window === "undefined" || !window.aui) {
    return DEFAULT_GLOBALS;
  }
  return {
    // ... existing reads ...
    userLocation: window.aui.userLocation,
    toolResponseMetadata: window.aui.toolResponseMetadata,
  };
});

// Update value useMemo (around line 82-123)
const value = React.useMemo<AUIContextValue>(
  () => ({
    ...globals,
    // ... existing methods ...
    uploadFile: async (file) => {
      if (!window.aui) throw new Error("AUI not available");
      return window.aui.uploadFile(file);
    },
    getFileDownloadUrl: async (fileId) => {
      if (!window.aui) throw new Error("AUI not available");
      return window.aui.getFileDownloadUrl({ fileId });
    },
  }),
  [globals],
);
```

#### 5. Update Window Type Declaration
**File**: `packages/tool-ui-server/src/create-tool-ui-runtime.ts`
**Changes**: Ensure WindowAUI includes new methods

```typescript
// The WindowAUI type in protocol.ts should already include new methods
// via the AUIAPI extension. Verify this is exported correctly.
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `npm run build -w @assistant-ui/tool-ui-server`
- [ ] All tests pass: `npm run test -w @assistant-ui/tool-ui-server`
- [ ] No type errors in downstream packages

#### Manual Verification:
- [ ] Widget session ID is generated and accessible
- [ ] Server-side close triggers widget close
- [ ] Widget border renders when prefersBorder is true
- [ ] User location is accessible when provided

---

## Phase 5: Testing & Documentation

### Overview
Add comprehensive tests for all new features and ensure existing test coverage meets standards.

### Changes Required:

#### 1. Protocol Types Tests
**File**: `packages/tool-ui-server/src/types/__tests__/protocol.test.ts` (NEW)
**Changes**: Add type validation tests

```typescript
import { describe, it, expect } from "vitest";
import type {
  AUIGlobals,
  UserLocation,
  ToolResponseMetadata,
  ToolAnnotations,
  AUIAPI,
} from "../protocol";

describe("Protocol Types", () => {
  it("AUIGlobals includes all required properties", () => {
    const globals: AUIGlobals = {
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
      userLocation: null,
      toolResponseMetadata: null,
    };
    expect(globals).toBeDefined();
  });

  it("UserLocation accepts partial data", () => {
    const location: UserLocation = {
      city: "San Francisco",
      timezone: "America/Los_Angeles",
    };
    expect(location.city).toBe("San Francisco");
  });

  it("ToolResponseMetadata includes widgetSessionId", () => {
    const metadata: ToolResponseMetadata = {
      widgetSessionId: "ws_123",
      closeWidget: false,
    };
    expect(metadata.widgetSessionId).toBe("ws_123");
  });
});
```

#### 2. Bridge Script Tests for New Features
**File**: `packages/tool-ui-server/src/runtime/bridge-script.test.ts`
**Changes**: Add tests for new APIs

```typescript
// Add to existing test file
it("includes new global getters", () => {
  const script = generateBridgeScript();
  expect(script).toContain("userLocation");
  expect(script).toContain("toolResponseMetadata");
});

it("includes file API methods", () => {
  const script = generateBridgeScript();
  expect(script).toContain("uploadFile");
  expect(script).toContain("getFileDownloadUrl");
});

it("uploadFile reads file as base64", () => {
  const script = generateBridgeScript();
  expect(script).toContain("FileReader");
  expect(script).toContain("readAsDataURL");
});
```

#### 3. Message Bridge Tests for File APIs
**File**: `packages/tool-ui-server/src/remote/message-bridge.test.ts`
**Changes**: Add tests for file handling

```typescript
// Add to existing test file
it("handles uploadFile method call", async () => {
  handlers.uploadFile = vi.fn().mockResolvedValue({ fileId: "file_123" });

  const messageEvent = new MessageEvent("message", {
    data: {
      type: "AUI_METHOD_CALL",
      id: "upload-123",
      method: "uploadFile",
      args: [{ name: "test.png", type: "image/png", size: 1024, data: "base64..." }],
    },
    source: mockContentWindow,
  });

  window.dispatchEvent(messageEvent);
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(handlers.uploadFile).toHaveBeenCalledWith({
    name: "test.png",
    type: "image/png",
    size: 1024,
    data: "base64...",
  });
  expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
    {
      type: "AUI_METHOD_RESPONSE",
      id: "upload-123",
      result: { fileId: "file_123" },
    },
    "*",
  );
});

it("handles getFileDownloadUrl method call", async () => {
  handlers.getFileDownloadUrl = vi.fn().mockResolvedValue({
    downloadUrl: "https://example.com/file.png",
  });

  const messageEvent = new MessageEvent("message", {
    data: {
      type: "AUI_METHOD_CALL",
      id: "download-123",
      method: "getFileDownloadUrl",
      args: [{ fileId: "file_123" }],
    },
    source: mockContentWindow,
  });

  window.dispatchEvent(messageEvent);
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(handlers.getFileDownloadUrl).toHaveBeenCalledWith({ fileId: "file_123" });
  expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
    {
      type: "AUI_METHOD_RESPONSE",
      id: "download-123",
      result: { downloadUrl: "https://example.com/file.png" },
    },
    "*",
  );
});
```

#### 4. Integration Tests for New Features
**File**: `packages/tool-ui-server/src/__tests__/integration.test.ts`
**Changes**: Add integration tests

```typescript
// Add to existing test file
it("globals update includes new properties", async () => {
  const handlers = {
    callTool: vi.fn(),
    setWidgetState: vi.fn(),
    sendFollowUpMessage: vi.fn(),
    requestDisplayMode: vi.fn(),
    requestModal: vi.fn(),
    requestClose: vi.fn(),
    openExternal: vi.fn(),
    notifyIntrinsicHeight: vi.fn(),
    uploadFile: vi.fn(),
    getFileDownloadUrl: vi.fn(),
  };

  const mockIframe = {
    contentWindow: mockIframeWindow,
  } as unknown as HTMLIFrameElement;

  const bridge = new MessageBridge(handlers);
  bridge.attach(mockIframe);

  const newGlobals = {
    ...DEFAULT_GLOBALS,
    userLocation: { city: "Tokyo", country: "Japan" },
    toolResponseMetadata: { widgetSessionId: "ws_test" },
  };

  bridge.sendGlobals(newGlobals);

  expect(mockIframeWindow.postMessage).toHaveBeenCalledWith(
    {
      type: "AUI_SET_GLOBALS",
      globals: expect.objectContaining({
        userLocation: { city: "Tokyo", country: "Japan" },
        toolResponseMetadata: { widgetSessionId: "ws_test" },
      }),
    },
    "*",
  );

  bridge.detach();
});
```

#### 5. Schema Validation Tests
**File**: `packages/tool-ui-server/src/schemas/__tests__/shared.test.ts` (NEW)
**Changes**: Add schema tests

```typescript
import { describe, it, expect } from "vitest";
import {
  ToolAnnotationsSchema,
  ToolInvocationMessagesSchema,
  ToolMetadataSchema,
} from "../shared";

describe("Tool Metadata Schemas", () => {
  describe("ToolAnnotationsSchema", () => {
    it("accepts valid annotations", () => {
      const result = ToolAnnotationsSchema.safeParse({
        readOnlyHint: true,
        destructiveHint: false,
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = ToolAnnotationsSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("ToolInvocationMessagesSchema", () => {
    it("accepts valid messages", () => {
      const result = ToolInvocationMessagesSchema.safeParse({
        invoking: "Loading...",
        invoked: "Done!",
      });
      expect(result.success).toBe(true);
    });

    it("rejects messages over 64 chars", () => {
      const result = ToolInvocationMessagesSchema.safeParse({
        invoking: "A".repeat(65),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ToolMetadataSchema", () => {
    it("accepts full metadata", () => {
      const result = ToolMetadataSchema.safeParse({
        annotations: { readOnlyHint: true },
        invocationMessages: { invoking: "Working..." },
        visibility: "public",
        widgetAccessible: true,
        fileParams: ["image"],
      });
      expect(result.success).toBe(true);
    });

    it("applies defaults", () => {
      const result = ToolMetadataSchema.parse({});
      expect(result.visibility).toBe("public");
      expect(result.widgetAccessible).toBe(false);
    });
  });
});
```

#### 6. Hook Tests
**File**: `packages/tool-ui-server/src/hooks/__tests__/use-aui.test.tsx` (NEW)
**Changes**: Add React hook tests

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  AUIProvider,
  useUserLocation,
  useToolResponseMetadata,
  useUploadFile,
  useGetFileDownloadUrl,
} from "../use-aui";

describe("AUI Hooks", () => {
  beforeEach(() => {
    // Mock window.aui
    (window as any).aui = {
      theme: "light",
      locale: "en-US",
      displayMode: "inline",
      maxHeight: 800,
      toolInput: {},
      toolOutput: null,
      widgetState: null,
      userAgent: { device: { type: "desktop" }, capabilities: { hover: true, touch: false } },
      safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
      userLocation: { city: "San Francisco" },
      toolResponseMetadata: { widgetSessionId: "ws_123" },
      uploadFile: vi.fn().mockResolvedValue({ fileId: "file_123" }),
      getFileDownloadUrl: vi.fn().mockResolvedValue({ downloadUrl: "https://example.com" }),
    };
  });

  it("useUserLocation returns location", () => {
    const { result } = renderHook(() => useUserLocation(), {
      wrapper: AUIProvider,
    });
    expect(result.current).toEqual({ city: "San Francisco" });
  });

  it("useToolResponseMetadata returns metadata", () => {
    const { result } = renderHook(() => useToolResponseMetadata(), {
      wrapper: AUIProvider,
    });
    expect(result.current).toEqual({ widgetSessionId: "ws_123" });
  });

  it("useUploadFile calls window.aui.uploadFile", async () => {
    const { result } = renderHook(() => useUploadFile(), {
      wrapper: AUIProvider,
    });
    
    const mockFile = new File(["test"], "test.txt", { type: "text/plain" });
    await result.current(mockFile);
    
    expect((window as any).aui.uploadFile).toHaveBeenCalledWith(mockFile);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] All new tests pass: `npm run test -w @assistant-ui/tool-ui-server`
- [ ] Test coverage improved for new features
- [ ] No regressions in existing tests

#### Manual Verification:
- [ ] Test output shows all new test suites
- [ ] Coverage report shows new files are tested

---

## Testing Strategy

### Unit Tests:
- Protocol type exports and interfaces
- Schema validation for tool metadata
- Bridge script generation with new APIs
- React hooks for new globals and methods

### Integration Tests:
- Full round-trip for file upload/download
- Widget session ID propagation
- Server-side close handling
- Globals update with new properties

### Manual Testing Steps:
1. Run example MCP server with new metadata fields
2. Test file upload via widget UI
3. Verify widget session ID in metadata
4. Test server-side close by returning closeWidget: true
5. Verify border rendering with prefersBorder

## Performance Considerations

- File upload converts to base64 in iframe before sending to parent (synchronous but necessary for sandbox)
- Widget session ID generated once per component mount (stable reference)
- New globals are part of existing update flow (no additional messages)

## Migration Notes

- Existing code continues to work unchanged
- New features are opt-in via new props/callbacks
- Default values maintain backward compatibility
- No breaking changes to existing APIs

## References

- Original research: `notes/research/chatgpt-apps-feature-parity.md`
- ChatGPT Apps SDK docs: https://developers.openai.com/apps-sdk/
- Current protocol: `packages/tool-ui-server/src/types/protocol.ts`
- Bridge script: `packages/tool-ui-server/src/runtime/bridge-script.ts`
