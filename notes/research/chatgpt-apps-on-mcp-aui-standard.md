---
date: 2026-01-08T15:45:00-08:00
researcher: Claude
git_commit: a8a9ef9032ceab29e4fb51538d7b8a6579f7d3fc
branch: mcp_standard_aui
repository: samdickson22/assistant-ui
topic: "Running ChatGPT Apps on MCP Standard AUI"
tags: [research, chatgpt-apps, mcp-aui, compatibility, bridge]
status: complete
last_updated: 2026-01-08
last_updated_by: Claude
---

# Research: Running ChatGPT Apps on MCP Standard AUI

**Date**: 2026-01-08T15:45:00-08:00  
**Researcher**: Claude  
**Git Commit**: a8a9ef9032ceab29e4fb51538d7b8a6579f7d3fc  
**Branch**: mcp_standard_aui  
**Repository**: samdickson22/assistant-ui

## Research Question

How can a ChatGPT App made with `chatgpt-app-studio` run on our open MCP Standard AUI? What changes need to be made, and what could we do to minimize those changes?

## Summary

**Good news: The two systems are architecturally identical and 95%+ compatible.** Both use:
- Sandboxed iframes for widget rendering
- `postMessage` for parent ↔ iframe communication
- Nearly identical global objects (`window.openai` vs `window.aui`)
- Nearly identical API methods and properties

**The primary difference is the namespace**: ChatGPT Apps use `window.openai`, our standard uses `window.aui`. 

### Quick Answer

| Approach | Changes Required | Effort |
|----------|------------------|--------|
| **Option A**: Add compatibility shim to our standard | ~50 lines of code in bridge-script.ts | Low (1-2 hours) |
| **Option B**: ChatGPT App developer adds wrapper | Import our production provider instead | Low |
| **Option C**: Build tool converts namespace | Post-process export to swap `openai` → `aui` | Medium |

**Recommended**: Option A - Add a compatibility shim on our side that also exposes `window.openai` pointing to the same implementation as `window.aui`.

---

## Detailed Findings

### 1. API Comparison: window.openai vs window.aui

#### Global Properties (Read-Only)

| Property | ChatGPT Apps (`window.openai`) | MCP AUI (`window.aui`) | Status |
|----------|-------------------------------|------------------------|--------|
| `theme` | `"light" \| "dark"` | `"light" \| "dark"` | ✅ Identical |
| `locale` | `string` | `string` | ✅ Identical |
| `displayMode` | `"pip" \| "inline" \| "fullscreen"` | `"inline" \| "fullscreen" \| "pip"` | ✅ Identical |
| `maxHeight` | `number` | `number` | ✅ Identical |
| `toolInput` | `Record<string, unknown>` | `Record<string, unknown>` | ✅ Identical |
| `toolOutput` | `Record<string, unknown> \| null` | `Record<string, unknown> \| null` | ✅ Identical |
| `widgetState` | `Record<string, unknown> \| null` | `Record<string, unknown> \| null` | ✅ Identical |
| `userAgent` | `UserAgent` | `UserAgent` | ✅ Identical |
| `safeArea` | `SafeArea` | `SafeArea` | ✅ Identical |
| `userLocation` | `UserLocation \| null` | `UserLocation \| null` | ✅ Identical |
| `toolResponseMetadata` | `Record<string, unknown> \| null` | `ToolResponseMetadata \| null` | ✅ Identical |
| `previousDisplayMode` | `DisplayMode \| null` | ❌ Not in AUI | ⚠️ Missing |
| `view` | `View \| null` | ❌ Not in AUI | ⚠️ Missing |

#### API Methods

| Method | ChatGPT Apps | MCP AUI | Status |
|--------|--------------|---------|--------|
| `callTool(name, args)` | ✅ | ✅ | ✅ Identical |
| `setWidgetState(state)` | ✅ | ✅ | ✅ Identical |
| `sendFollowUpMessage({prompt})` | ✅ | ✅ | ✅ Identical |
| `requestDisplayMode({mode})` | ✅ | ✅ | ✅ Identical |
| `requestModal(options)` | ✅ | ✅ | ✅ Identical |
| `requestClose()` | ✅ | ✅ | ✅ Identical |
| `openExternal({href})` | ✅ | ✅ | ✅ Identical |
| `notifyIntrinsicHeight(height)` | ✅ | ✅ | ✅ Identical |
| `uploadFile(file)` | ✅ | ✅ | ✅ Identical |
| `getFileDownloadUrl({fileId})` | ✅ | ✅ | ✅ Identical |

### 2. Message Protocol Comparison

| Aspect | ChatGPT Apps | MCP AUI | Status |
|--------|--------------|---------|--------|
| Set Globals | `OPENAI_SET_GLOBALS` | `AUI_SET_GLOBALS` | ⚠️ Different prefix |
| Method Call | `OPENAI_METHOD_CALL` | `AUI_METHOD_CALL` | ⚠️ Different prefix |
| Method Response | `OPENAI_METHOD_RESPONSE` | `AUI_METHOD_RESPONSE` | ⚠️ Different prefix |
| Change Event | `openai:set_globals` | `aui:set_globals` | ⚠️ Different prefix |
| Legacy Messages | `ready`, `resize`, etc. | `ready`, `resize`, etc. | ✅ Identical |

### 3. What's Missing from MCP AUI

Two properties exist in ChatGPT Apps that don't exist in our standard:

1. **`previousDisplayMode`**: Tracks the previous display mode for smooth animations
2. **`view`**: Modal view state (`{ mode: "modal" | "inline", params: {...} }`)

These are **minor additions** that could be added to our protocol if needed.

---

## Solutions to Run ChatGPT Apps on MCP AUI

### Option A: Add Compatibility Shim (RECOMMENDED)

**Location**: `packages/tool-ui-server/src/runtime/bridge-script.ts`

Add a few lines to also expose `window.openai` as an alias:

```javascript
// After creating window.aui, add OpenAI compatibility shim
Object.defineProperty(window, "openai", {
  value: window.aui,
  configurable: false,
  writable: false,
});

// Also listen for OPENAI_ prefixed messages
window.addEventListener("message", function(event) {
  if (event.data?.type === "OPENAI_SET_GLOBALS") {
    // Transform to AUI format and dispatch
    var auiMessage = {
      type: "AUI_SET_GLOBALS",
      globals: event.data.globals
    };
    // Process as normal AUI message
    handleMessage({ data: auiMessage, source: event.source });
  }
  // Similar for OPENAI_METHOD_RESPONSE
});

// Dispatch both event types for globals changes
function dispatchGlobalsChange(changedGlobals) {
  var auiEvent = new CustomEvent("aui:set_globals", { detail: { globals: changedGlobals } });
  var openaiEvent = new CustomEvent("openai:set_globals", { detail: { globals: changedGlobals } });
  window.dispatchEvent(auiEvent);
  window.dispatchEvent(openaiEvent);
}
```

**Pros**:
- Zero changes needed by ChatGPT App developers
- Apps built with `chatgpt-app-studio` work out of the box
- Backward compatible with existing AUI widgets

**Cons**:
- Slightly larger bridge script (~2KB more)
- Need to maintain compatibility layer

### Option B: ChatGPT App Developer Adds Wrapper

The ChatGPT App developer could import our production provider instead:

```typescript
// Instead of OpenAI's production provider:
// import { ProductionOpenAIProvider } from "@/lib/export/production-provider";

// Use our AUI provider:
import { AUIProvider } from "@assistant-ui/tool-ui-server";

function App() {
  return (
    <AUIProvider>
      <MyWidget />
    </AUIProvider>
  );
}
```

**Pros**:
- No changes to our standard needed
- Developer has full control

**Cons**:
- Requires code changes by every ChatGPT App developer
- Different import path/package

### Option C: Build Tool Transforms Output

Add a post-processing step to `chatgpt-app-studio` export that:
1. Replaces `window.openai` → `window.aui`
2. Replaces `OPENAI_` message prefixes → `AUI_`
3. Replaces `openai:set_globals` → `aui:set_globals`

**Pros**:
- Clean separation of concerns
- Output is native MCP AUI format

**Cons**:
- More complex build process
- Potential for transformation bugs

---

## Recommended Implementation Plan

### Phase 1: Immediate Compatibility (1-2 hours)

Add the compatibility shim to `bridge-script.ts`:

1. Expose `window.openai` as alias to `window.aui`
2. Handle both `OPENAI_*` and `AUI_*` message types
3. Dispatch both `openai:set_globals` and `aui:set_globals` events

**Files to modify**:
- `packages/tool-ui-server/src/runtime/bridge-script.ts`

### Phase 2: Add Missing Properties (Optional, 2-4 hours)

Add `previousDisplayMode` and `view` to our protocol:

1. Add to `AUIGlobals` type in `types/protocol.ts`
2. Add to default globals in `bridge-script.ts`
3. Track previous display mode when mode changes
4. Add view state for modal support

**Files to modify**:
- `packages/tool-ui-server/src/types/protocol.ts`
- `packages/tool-ui-server/src/runtime/bridge-script.ts`
- `packages/tool-ui-server/src/remote/message-bridge.ts`

### Phase 3: Documentation & Testing (2-4 hours)

1. Add "Running ChatGPT Apps" section to tool-ui-server README
2. Create example showing ChatGPT App running on MCP AUI
3. Add integration tests for OpenAI compatibility

---

## Code References

### ChatGPT App Studio

| Purpose | File |
|---------|------|
| Type Definitions | `packages/chatgpt-app-studio/templates/starter/lib/workbench/types.ts` |
| Production Bridge | `packages/chatgpt-app-studio/templates/starter/lib/export/bridge.ts` |
| React Hooks | `packages/chatgpt-app-studio/templates/starter/lib/workbench/openai-context.tsx` |
| Production Provider | `packages/chatgpt-app-studio/templates/starter/lib/export/production-provider.tsx` |
| Export Bundler | `packages/chatgpt-app-studio/templates/starter/lib/export/bundler.ts` |

### MCP AUI Standard (tool-ui-server)

| Purpose | File |
|---------|------|
| Type Definitions | `packages/tool-ui-server/src/types/protocol.ts` |
| Bridge Script | `packages/tool-ui-server/src/runtime/bridge-script.ts` |
| Message Bridge | `packages/tool-ui-server/src/remote/message-bridge.ts` |
| React Component | `packages/tool-ui-server/src/remote/remote-tool-ui.tsx` |
| Runtime Creation | `packages/tool-ui-server/src/create-tool-ui-runtime.ts` |

### Existing Parity Documentation

| Purpose | File |
|---------|------|
| Feature Parity Summary | `packages/tool-ui-server/CHAGPT_APPS_SDK_PARITY.md` |

---

## Architecture Insights

Both systems share the same fundamental architecture:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Host Application                              │
│  (ChatGPT / Assistant-UI Client / Any MCP Client)                  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Sandboxed iframe                             │ │
│  │  sandbox="allow-scripts allow-forms"                           │ │
│  │                                                                 │ │
│  │  ┌──────────────────┐                                          │ │
│  │  │  Bridge Script    │  Creates window.openai / window.aui      │ │
│  │  │                   │  Handles postMessage communication       │ │
│  │  └────────┬─────────┘                                          │ │
│  │           │                                                     │ │
│  │           ▼                                                     │ │
│  │  ┌──────────────────┐                                          │ │
│  │  │  Widget Code     │  Uses window.openai.* / window.aui.*     │ │
│  │  │  (React/Vanilla) │  to read globals and call methods        │ │
│  │  └──────────────────┘                                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ▲                                       │
│                              │ postMessage                          │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Message Bridge                               │ │
│  │  Sends globals, receives method calls, returns responses       │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

The only differences are:
1. **Namespace**: `openai` vs `aui`
2. **Message prefix**: `OPENAI_` vs `AUI_`
3. **Event name**: `openai:set_globals` vs `aui:set_globals`

These are trivial to bridge.

---

## Open Questions

1. **Should we maintain both namespaces permanently?** Or just as a migration path?
2. **Should chatgpt-app-studio have a build flag?** `--target mcp-aui` to output native AUI format?
3. **Should we add `previousDisplayMode` and `view` to our standard?** They're useful for animations and modals.
4. **Registry compatibility?** Can ChatGPT Apps publish to our registry and vice versa?

---

## Implementation Status: COMPLETE

All recommendations from this research have been implemented:

- [x] Option A: Compatibility shim added to bridge-script.ts
- [x] `window.openai` alias to `window.aui`
- [x] `OPENAI_*` message handling
- [x] `openai:set_globals` event dispatching
- [x] `previousDisplayMode` property added
- [x] `view` property added
- [x] Comprehensive test coverage

ChatGPT Apps built with `chatgpt-app-studio` now run on MCP AUI Standard with zero code changes.

---

## Related Research

- `packages/tool-ui-server/CHAGPT_APPS_SDK_PARITY.md` - Full feature parity documentation
- `notes/research/chatgpt-apps-feature-parity.md` - Earlier research on feature parity
- `notes/plans/chatgpt-apps-feature-parity-implementation.md` - Implementation plan
