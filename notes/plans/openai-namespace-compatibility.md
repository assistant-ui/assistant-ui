# OpenAI Namespace Compatibility Implementation Plan

## Overview

Add ChatGPT Apps SDK compatibility to MCP AUI Standard so that apps built with `chatgpt-app-studio` can run on our platform with zero code modifications. This involves exposing `window.openai` as an alias, handling `OPENAI_*` message types, and adding the missing `previousDisplayMode` and `view` properties.

## Current State Analysis

### What Exists Now

**Bridge Script** (`packages/tool-ui-server/src/runtime/bridge-script.ts`):
- Creates `window.aui` with all API methods (lines 157-176)
- Handles `AUI_SET_GLOBALS` and `AUI_METHOD_RESPONSE` messages (lines 61-82)
- Dispatches `aui:set_globals` custom events (lines 35-40)
- Sends `AUI_METHOD_CALL` messages to parent (lines 90-95)

**Protocol Types** (`packages/tool-ui-server/src/types/protocol.ts`):
- `AUIGlobals` interface with 11 properties (lines 68-80)
- Message types: `AUI_SET_GLOBALS`, `AUI_METHOD_RESPONSE`, `AUI_METHOD_CALL` (lines 125-139)
- Event type: `aui:set_globals` (line 123)

**Message Bridge** (`packages/tool-ui-server/src/remote/message-bridge.ts`):
- Sends `AUI_SET_GLOBALS` to iframe (lines 83-109)
- Receives `AUI_METHOD_CALL` from iframe (lines 118-121)
- Sends `AUI_METHOD_RESPONSE` back (lines 217-236)

### What's Missing

1. **`window.openai` alias** - ChatGPT Apps use `window.openai`, we only have `window.aui`
2. **`OPENAI_*` message handling** - We only handle `AUI_*` prefixed messages
3. **`openai:set_globals` event** - We only dispatch `aui:set_globals`
4. **`previousDisplayMode` property** - Tracks previous display mode for animations
5. **`view` property** - Modal view state (`{ mode: "modal" | "inline", params: {...} }`)

### Key Discoveries

- The two systems are architecturally identical (sandboxed iframes + postMessage)
- ChatGPT Apps SDK types are in `packages/chatgpt-app-studio/templates/starter/lib/workbench/types.ts`
- `previousDisplayMode` updates when `displayMode` changes (see `tool-ui/app/workbench/lib/store.ts:219`)
- `view` is set by `requestModal()` and cleared when modal closes

## Desired End State

After this plan is complete:

1. Apps built with `chatgpt-app-studio` work on MCP AUI with **zero code changes**
2. Both `window.aui` and `window.openai` are available and point to the same implementation
3. Both `AUI_*` and `OPENAI_*` message types are handled identically
4. Both `aui:set_globals` and `openai:set_globals` events are dispatched
5. `previousDisplayMode` and `view` properties are available on the global object
6. Full test coverage for the compatibility layer

### Verification

```bash
# All tests pass
make -C packages/tool-ui-server test

# Type checking passes
make -C packages/tool-ui-server typecheck

# Linting passes  
make -C packages/tool-ui-server lint
```

Manual verification:
- Export a widget from `chatgpt-app-studio` and load it in MCP AUI host
- Widget's `window.openai.*` calls work correctly
- Display mode changes update `previousDisplayMode`
- `requestModal()` sets `view` property correctly

## What We're NOT Doing

- Modifying `chatgpt-app-studio` code
- Adding build flags or transformation tools
- Deprecation warnings on `window.openai` (this is permanent dual-namespace support)
- Registry/manifest format changes
- Changes to the parent-side `MessageBridge` class (only bridge-script.ts changes needed)

## Implementation Approach

The strategy is to make changes **only in the iframe-side bridge script**. The parent side already sends `AUI_*` messages, and we'll handle both namespaces in the iframe. This minimizes the blast radius and keeps the parent implementation clean.

---

## Phase 1: Add Missing Protocol Types

### Overview
Add `previousDisplayMode` and `view` to the `AUIGlobals` interface and update default values.

### Changes Required

#### 1. Protocol Types
**File**: `packages/tool-ui-server/src/types/protocol.ts`

Add `View` interface and extend `AUIGlobals`:

```typescript
// Add after line 46 (after ToolResponseMetadata interface)
export interface View {
  mode: "modal" | "inline";
  params: Record<string, unknown> | null;
}
```

```typescript
// Update AUIGlobals interface (lines 68-80) to add:
export interface AUIGlobals {
  theme: Theme;
  locale: string;
  displayMode: DisplayMode;
  previousDisplayMode: DisplayMode | null;  // ADD
  maxHeight: number;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  widgetState: WidgetState;
  userAgent: UserAgent;
  safeArea: SafeArea;
  userLocation: UserLocation | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  view: View | null;  // ADD
}
```

#### 2. Default Globals
**File**: `packages/tool-ui-server/src/runtime/bridge-script.ts`

Update `DEFAULT_GLOBALS` (lines 3-20):

```typescript
export const DEFAULT_GLOBALS: AUIGlobals = {
  theme: "light",
  locale: "en-US",
  displayMode: "inline",
  previousDisplayMode: null,  // ADD
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
  userLocation: null,
  toolResponseMetadata: null,
  view: null,  // ADD
};
```

#### 3. Bridge Script Global Properties
**File**: `packages/tool-ui-server/src/runtime/bridge-script.ts`

Add getters for new properties in the `window.aui` object definition (around line 160-170):

```typescript
// Add inside Object.create(null, { ... })
previousDisplayMode: { get: function() { return globals.previousDisplayMode; }, enumerable: true },
view: { get: function() { return globals.view; }, enumerable: true },
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compilation passes: `npm run typecheck`
- [ ] Existing tests still pass: `npm run test`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] `window.aui.previousDisplayMode` returns `null` by default
- [ ] `window.aui.view` returns `null` by default

---

## Phase 2: Add OpenAI Namespace Compatibility

### Overview
Add `window.openai` as an alias, handle `OPENAI_*` messages, and dispatch both event types.

### Changes Required

#### 1. Bridge Script - OpenAI Namespace Alias
**File**: `packages/tool-ui-server/src/runtime/bridge-script.ts`

Add after the `window.aui` definition (after line 176):

```javascript
// OpenAI namespace compatibility - alias to window.aui
Object.defineProperty(window, "openai", {
  value: window.aui,
  configurable: false,
  writable: false,
});
```

#### 2. Bridge Script - Handle OPENAI_* Messages
**File**: `packages/tool-ui-server/src/runtime/bridge-script.ts`

Update `handleMessage` function (lines 55-83) to accept both prefixes:

```javascript
function handleMessage(event) {
  if (event.source !== window.parent) return;
  
  var message = event.data;
  if (!message || typeof message !== "object" || !message.type) return;

  // Normalize OPENAI_ prefix to AUI_ for consistent handling
  var type = message.type;
  if (type === "OPENAI_SET_GLOBALS") {
    type = "AUI_SET_GLOBALS";
  } else if (type === "OPENAI_METHOD_RESPONSE") {
    type = "AUI_METHOD_RESPONSE";
  }

  switch (type) {
    case "AUI_SET_GLOBALS":
      previousGlobals = globals;
      globals = Object.assign({}, DEFAULT_GLOBALS, message.globals);
      var changed = buildChangedGlobals(previousGlobals, globals);
      if (Object.keys(changed).length > 0) {
        dispatchGlobalsChange(changed);
      }
      break;

    case "AUI_METHOD_RESPONSE":
      var pending = pendingCalls.get(message.id);
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
```

#### 3. Bridge Script - Dispatch Both Event Types
**File**: `packages/tool-ui-server/src/runtime/bridge-script.ts`

Update `dispatchGlobalsChange` function (lines 35-40):

```javascript
function dispatchGlobalsChange(changedGlobals) {
  // Dispatch AUI event (our standard)
  var auiEvent = new CustomEvent("aui:set_globals", {
    detail: { globals: changedGlobals },
  });
  window.dispatchEvent(auiEvent);
  
  // Dispatch OpenAI event (ChatGPT Apps compatibility)
  var openaiEvent = new CustomEvent("openai:set_globals", {
    detail: { globals: changedGlobals },
  });
  window.dispatchEvent(openaiEvent);
}
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compilation passes: `npm run typecheck`
- [ ] All tests pass: `npm run test`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] `window.openai` exists and equals `window.aui`
- [ ] `window.openai.theme` returns current theme
- [ ] `window.openai.callTool()` works correctly
- [ ] `openai:set_globals` events fire when globals change

---

## Phase 3: Track previousDisplayMode

### Overview
Automatically update `previousDisplayMode` when `displayMode` changes via the globals update mechanism.

### Changes Required

#### 1. Bridge Script - Track Previous Display Mode
**File**: `packages/tool-ui-server/src/runtime/bridge-script.ts`

Update the `AUI_SET_GLOBALS` handler to track display mode changes:

```javascript
case "AUI_SET_GLOBALS":
  previousGlobals = globals;
  
  // Track previousDisplayMode when displayMode changes
  var newGlobals = Object.assign({}, DEFAULT_GLOBALS, message.globals);
  if (previousGlobals && newGlobals.displayMode !== previousGlobals.displayMode) {
    newGlobals.previousDisplayMode = previousGlobals.displayMode;
  }
  
  globals = newGlobals;
  var changed = buildChangedGlobals(previousGlobals, globals);
  if (Object.keys(changed).length > 0) {
    dispatchGlobalsChange(changed);
  }
  break;
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compilation passes: `npm run typecheck`
- [ ] All tests pass: `npm run test`

#### Manual Verification:
- [ ] When display mode changes from "inline" to "fullscreen", `previousDisplayMode` becomes "inline"
- [ ] When display mode changes back, `previousDisplayMode` updates accordingly

---

## Phase 4: Add Comprehensive Tests

### Overview
Add tests for OpenAI namespace compatibility covering all scenarios.

### Changes Required

#### 1. Bridge Script Tests
**File**: `packages/tool-ui-server/src/runtime/bridge-script.test.ts`

Add new test cases:

```typescript
describe("OpenAI namespace compatibility", () => {
  it("defines window.openai as alias to window.aui", () => {
    const script = generateBridgeScript();
    expect(script).toContain('Object.defineProperty(window, "openai"');
    expect(script).toContain("value: window.aui");
  });

  it("includes previousDisplayMode property", () => {
    const script = generateBridgeScript();
    expect(script).toContain("previousDisplayMode");
  });

  it("includes view property", () => {
    const script = generateBridgeScript();
    expect(script).toContain("view");
  });

  it("dispatches both aui and openai events", () => {
    const script = generateBridgeScript();
    expect(script).toContain('CustomEvent("aui:set_globals"');
    expect(script).toContain('CustomEvent("openai:set_globals"');
  });

  it("handles OPENAI_SET_GLOBALS message type", () => {
    const script = generateBridgeScript();
    expect(script).toContain("OPENAI_SET_GLOBALS");
  });

  it("handles OPENAI_METHOD_RESPONSE message type", () => {
    const script = generateBridgeScript();
    expect(script).toContain("OPENAI_METHOD_RESPONSE");
  });
});
```

#### 2. Integration Tests
**File**: `packages/tool-ui-server/src/__tests__/openai-compatibility.test.ts` (NEW FILE)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageBridge } from "../remote/message-bridge";
import { DEFAULT_GLOBALS } from "../runtime/bridge-script";

describe("OpenAI Namespace Compatibility Integration", () => {
  let mockIframeWindow: Window;
  let receivedMessages: unknown[];

  beforeEach(() => {
    receivedMessages = [];
    mockIframeWindow = {
      postMessage: vi.fn((data: unknown) => {
        receivedMessages.push(data);
      }),
    } as unknown as Window;
  });

  it("globals include previousDisplayMode and view", () => {
    expect(DEFAULT_GLOBALS).toHaveProperty("previousDisplayMode", null);
    expect(DEFAULT_GLOBALS).toHaveProperty("view", null);
  });

  it("sends globals with new properties", () => {
    const handlers = {
      callTool: vi.fn(),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn(),
      requestDisplayMode: vi.fn(),
      requestModal: vi.fn(),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
      uploadFile: vi.fn().mockResolvedValue({ fileId: "test" }),
      getFileDownloadUrl: vi.fn().mockResolvedValue({ downloadUrl: "test" }),
    };

    const mockIframe = {
      contentWindow: mockIframeWindow,
    } as unknown as HTMLIFrameElement;

    const bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);

    const globalsWithView = {
      ...DEFAULT_GLOBALS,
      previousDisplayMode: "inline" as const,
      view: { mode: "modal" as const, params: { title: "Test" } },
    };

    bridge.sendGlobals(globalsWithView);

    expect(mockIframeWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUI_SET_GLOBALS",
        globals: expect.objectContaining({
          previousDisplayMode: "inline",
          view: { mode: "modal", params: { title: "Test" } },
        }),
      }),
      "*"
    );

    bridge.detach();
  });
});
```

#### 3. Protocol Type Tests
**File**: `packages/tool-ui-server/src/__tests__/protocol-types.test.ts`

Add tests for new types:

```typescript
describe("View type", () => {
  it("accepts modal mode with params", () => {
    const view: View = {
      mode: "modal",
      params: { title: "Test Modal" },
    };
    expect(view.mode).toBe("modal");
    expect(view.params).toEqual({ title: "Test Modal" });
  });

  it("accepts inline mode with null params", () => {
    const view: View = {
      mode: "inline",
      params: null,
    };
    expect(view.mode).toBe("inline");
    expect(view.params).toBeNull();
  });
});

describe("AUIGlobals with new properties", () => {
  it("includes previousDisplayMode", () => {
    const globals: AUIGlobals = {
      ...DEFAULT_GLOBALS,
      previousDisplayMode: "inline",
    };
    expect(globals.previousDisplayMode).toBe("inline");
  });

  it("includes view", () => {
    const globals: AUIGlobals = {
      ...DEFAULT_GLOBALS,
      view: { mode: "modal", params: null },
    };
    expect(globals.view?.mode).toBe("modal");
  });
});
```

### Success Criteria

#### Automated Verification:
- [ ] All new tests pass: `npm run test`
- [ ] Test coverage maintained or improved
- [ ] No regressions in existing tests

---

## Phase 5: Documentation

### Overview
Document the OpenAI namespace compatibility feature.

### Changes Required

#### 1. Update Parity Document
**File**: `packages/tool-ui-server/CHAGPT_APPS_SDK_PARITY.md`

Add section:

```markdown
## OpenAI Namespace Compatibility

ChatGPT Apps built with `chatgpt-app-studio` can run on MCP AUI with zero code changes.

### How It Works

The bridge script provides dual-namespace support:

- **`window.aui`** - MCP AUI standard namespace
- **`window.openai`** - ChatGPT Apps SDK compatibility alias (same object)

Both message prefixes are supported:
- `AUI_SET_GLOBALS` / `OPENAI_SET_GLOBALS`
- `AUI_METHOD_RESPONSE` / `OPENAI_METHOD_RESPONSE`

Both event types are dispatched:
- `aui:set_globals`
- `openai:set_globals`

### New Properties

Two additional properties are now available on the global object:

| Property | Type | Description |
|----------|------|-------------|
| `previousDisplayMode` | `DisplayMode \| null` | Previous display mode (for animations) |
| `view` | `View \| null` | Modal view state |

### Usage

ChatGPT Apps work automatically:

```typescript
// ChatGPT App code works unchanged
const theme = window.openai.theme;
const result = await window.openai.callTool("search", { query: "test" });
```

MCP AUI apps can use either namespace:

```typescript
// Both work identically
window.aui.callTool("search", { query: "test" });
window.openai.callTool("search", { query: "test" });
```
```

#### 2. Update Research Document
**File**: `notes/research/chatgpt-apps-on-mcp-aui-standard.md`

Update status to reflect implementation:

```markdown
## Implementation Status: COMPLETE

All recommendations from this research have been implemented:

- [x] Option A: Compatibility shim added to bridge-script.ts
- [x] `window.openai` alias to `window.aui`
- [x] `OPENAI_*` message handling
- [x] `openai:set_globals` event dispatching
- [x] `previousDisplayMode` property added
- [x] `view` property added
- [x] Comprehensive test coverage
```

### Success Criteria

#### Automated Verification:
- [ ] Documentation files exist and are well-formatted
- [ ] No broken links in documentation

#### Manual Verification:
- [ ] Documentation accurately reflects implementation
- [ ] Examples in documentation are correct

---

## Testing Strategy

### Unit Tests
- Bridge script generation includes all new code
- Default globals include new properties
- Message type normalization works correctly

### Integration Tests
- Full round-trip with `OPENAI_*` messages
- Event dispatching for both namespaces
- `previousDisplayMode` tracking on display mode changes

### Manual Testing Steps
1. Build the package: `npm run build`
2. Export a widget from `chatgpt-app-studio`
3. Load the exported widget in a test MCP AUI host
4. Verify `window.openai` is available
5. Call `window.openai.callTool()` and verify it works
6. Change display mode and verify `previousDisplayMode` updates
7. Call `requestModal()` and verify `view` property is set

---

## Performance Considerations

- **Bundle size**: Adds ~50 lines of JavaScript to bridge script (~1-2KB gzipped)
- **Runtime overhead**: Negligible - just one extra event dispatch and simple message normalization
- **Memory**: No additional memory usage (alias points to same object)

---

## Migration Notes

No migration needed. This is purely additive:
- Existing MCP AUI widgets continue to work unchanged
- ChatGPT Apps now work without modification
- Both namespaces are permanently supported

---

## References

- Original research: `notes/research/chatgpt-apps-on-mcp-aui-standard.md`
- ChatGPT Apps SDK types: `packages/chatgpt-app-studio/templates/starter/lib/workbench/types.ts`
- ChatGPT Apps bridge: `packages/chatgpt-app-studio/templates/starter/lib/export/bridge.ts`
- Feature parity doc: `packages/tool-ui-server/CHAGPT_APPS_SDK_PARITY.md`
