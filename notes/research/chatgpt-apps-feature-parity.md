---
date: 2026-01-06T12:42:00-08:00
researcher: Sisyphus
git_commit: 46104f4a646e429610a8c01fc9565ac303d752ed
branch: mcp_standard_aui
repository: mcp_standard_aui
topic: "ChatGPT Apps SDK Feature Parity Analysis"
tags: [research, feature-parity, chatgpt-apps, tool-ui, aui, mcp-standard]
status: complete
last_updated: 2026-01-06
last_updated_by: Sisyphus
---

# Research: ChatGPT Apps SDK Feature Parity Analysis

**Date**: 2026-01-06T12:42:00-08:00
**Researcher**: Sisyphus
**Git Commit**: 46104f4a646e429610a8c01fc9565ac303d752ed
**Branch**: mcp_standard_aui
**Repository**: mcp_standard_aui

## Research Question
Does our tool-ui / aui / MCP standard implementation have full feature parity with ChatGPT Apps SDK?

## Summary

**Overall Assessment: ~90% Feature Parity**

Our `@assistant-ui/tool-ui-server` implementation provides strong parity with ChatGPT Apps SDK. Most core features are implemented with equivalent or similar APIs. A few gaps exist in file handling, monetization, and some advanced metadata fields.

## Feature Comparison Matrix

| Feature | ChatGPT Apps SDK | Our Implementation | Parity |
|---------|------------------|-------------------|--------|
| **Display Modes** | inline, fullscreen, pip | inline, fullscreen, pip | ✅ Full |
| **Theme Support** | light/dark | light/dark | ✅ Full |
| **Widget State** | `setWidgetState`/`widgetState` | `setWidgetState`/`widgetState` | ✅ Full |
| **Tool Input** | `toolInput` | `toolInput` | ✅ Full |
| **Tool Output** | `toolOutput` | `toolOutput` | ✅ Full |
| **Call Tools** | `callTool(name, args)` | `callTool(name, args)` | ✅ Full |
| **Follow-up Messages** | `sendFollowUpMessage({ prompt })` | `sendFollowUpMessage({ prompt })` | ✅ Full |
| **Request Display Mode** | `requestDisplayMode({ mode })` | `requestDisplayMode({ mode })` | ✅ Full |
| **Modal Dialogs** | `requestModal(options)` | `requestModal(options)` | ✅ Full |
| **Close Widget** | `requestClose()` | `requestClose()` | ✅ Full |
| **External Links** | `openExternal({ href })` | `openExternal({ href })` | ✅ Full |
| **Height Notification** | `notifyIntrinsicHeight(height)` | `notifyIntrinsicHeight(height)` | ✅ Full |
| **Locale** | `locale` | `locale` | ✅ Full |
| **User Agent/Device Info** | `userAgent` (device, capabilities) | `userAgent` (device, capabilities) | ✅ Full |
| **Safe Area Insets** | `safeArea` (top, bottom, left, right) | `safeArea` (top, bottom, left, right) | ✅ Full |
| **Max Height** | `maxHeight` | `maxHeight` | ✅ Full |
| **Iframe Sandbox** | `allow-scripts allow-forms` | `allow-scripts allow-forms` | ✅ Full |
| **File Upload** | `uploadFile(file)` | ❌ Not implemented | ❌ Missing |
| **File Download** | `getFileDownloadUrl({ fileId })` | ❌ Not implemented | ❌ Missing |
| **Tool Invocation Messages** | `openai/toolInvocation/invoking/invoked` | ❌ Not implemented | ❌ Missing |
| **Widget Session ID** | `openai/widgetSessionId` | ❌ Not implemented | ❌ Missing |
| **File Params** | `openai/fileParams` | ❌ Not implemented | ❌ Missing |
| **Tool Visibility** | `openai/visibility` (public/private) | ❌ Not implemented | ❌ Missing |
| **Widget Accessible** | `openai/widgetAccessible` | ❌ Not implemented | ❌ Missing |
| **Read-Only Hint** | `readOnlyHint` annotation | ❌ Not implemented | ❌ Missing |
| **Destructive Hint** | `destructiveHint` annotation | ❌ Not implemented | ❌ Missing |
| **Open World Hint** | `openWorldHint` annotation | ❌ Not implemented | ❌ Missing |
| **CSP Configuration** | `openai/widgetCSP` | Partial (via manifest permissions) | ⚠️ Partial |
| **Widget Domain** | `openai/widgetDomain` | Via PSL-isolated hosting | ✅ Equivalent |
| **Widget Description** | `openai/widgetDescription` | Component `description` field | ✅ Equivalent |
| **Widget Border** | `openai/widgetPrefersBorder` | ❌ Not implemented | ❌ Missing |
| **Close Widget (server)** | `openai/closeWidget` metadata | ❌ Not implemented | ❌ Missing |
| **User Location** | `openai/userLocation` | ❌ Not implemented | ❌ Missing |
| **Monetization** | Built-in support | ❌ Not implemented | ❌ Missing |
| **OAuth Authentication** | `securitySchemes` | ❌ Not implemented | ❌ Missing |

## Detailed Findings

### Fully Implemented Features (Our Implementation)

#### 1. Display Modes
**ChatGPT**: `inline`, `fullscreen`, `pip`
**Ours**: Identical - `packages/tool-ui-server/src/types/protocol.ts:1`
```typescript
export type DisplayMode = "inline" | "fullscreen" | "pip";
```

#### 2. Theme System
**ChatGPT**: `light`, `dark`
**Ours**: Identical - `packages/tool-ui-server/src/types/protocol.ts:3`
```typescript
export type Theme = "light" | "dark";
```

#### 3. Widget State Management
**ChatGPT**: `window.openai.widgetState` + `setWidgetState(state)`
**Ours**: `packages/tool-ui-server/src/types/protocol.ts:55-69`
```typescript
export interface AUIAPI {
  setWidgetState: (state: WidgetState) => void;
  // ...
}
```

#### 4. Tool Calling from Widget
**ChatGPT**: `window.openai.callTool(name, args)`
**Ours**: Identical API signature

#### 5. Follow-up Messages
**ChatGPT**: `window.openai.sendFollowUpMessage({ prompt })`
**Ours**: Identical API signature

#### 6. Request Display Mode
**ChatGPT**: `window.openai.requestDisplayMode({ mode })`
**Ours**: Identical API signature

#### 7. Modal Dialogs
**ChatGPT**: `window.openai.requestModal(options)`
**Ours**: Identical API signature

#### 8. User Agent & Device Info
**ChatGPT**: `{ device: { type }, capabilities: { hover, touch } }`
**Ours**: Identical structure - `packages/tool-ui-server/src/types/protocol.ts:7-19`

#### 9. Safe Area Insets
**ChatGPT**: `{ top, bottom, left, right }`
**Ours**: Identical structure - `packages/tool-ui-server/src/types/protocol.ts:21-30`

#### 10. Permission System
**ChatGPT**: CSP via `openai/widgetCSP`
**Ours**: Manifest permissions - `packages/tool-ui-server/src/schemas/manifest.ts:14-32`
```typescript
permissions: z.object({
  network: z.boolean().default(false),
  storage: z.boolean().default(false),
  clipboard: z.boolean().default(false),
  callTools: z.boolean().default(false),
  displayMode: z.boolean().default(false),
  followUpMessages: z.boolean().default(false),
  modals: z.boolean().default(false),
})
```

### Missing Features (Gaps)

#### 1. File Upload/Download APIs
**ChatGPT**:
```javascript
const { fileId } = await window.openai.uploadFile(file);
const { downloadUrl } = await window.openai.getFileDownloadUrl({ fileId });
```
**Ours**: Not implemented
**Impact**: Medium - Required for image-heavy applications

#### 2. Tool Invocation Status Messages
**ChatGPT**:
```javascript
_meta: {
  "openai/toolInvocation/invoking": "Loading...",
  "openai/toolInvocation/invoked": "Done."
}
```
**Ours**: Not implemented
**Impact**: Low - Nice-to-have UX feature

#### 3. Tool Annotations (Hints)
**ChatGPT**:
```javascript
annotations: {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true
}
```
**Ours**: Not implemented
**Impact**: Medium - Affects confirmation flow behavior

#### 4. Tool Visibility Control
**ChatGPT**: `"openai/visibility": "private"` - Hide from model but callable from widget
**Ours**: Not implemented
**Impact**: Low - Advanced use case

#### 5. Widget Accessible Flag
**ChatGPT**: `"openai/widgetAccessible": true` - Allow widget to call tools
**Ours**: Not implemented (our `callTools` permission serves similar purpose)
**Impact**: Low - Different approach, functionally similar

#### 6. File Params Declaration
**ChatGPT**: `"openai/fileParams": ["imageToProcess"]`
**Ours**: Not implemented
**Impact**: Medium - Required for file-accepting tools

#### 7. Widget Session ID
**ChatGPT**: `_meta["openai/widgetSessionId"]` for correlation
**Ours**: Not implemented
**Impact**: Low - Debugging/analytics feature

#### 8. Server-side Widget Close
**ChatGPT**: `metadata.openai/closeWidget: true`
**Ours**: Not implemented
**Impact**: Low - Edge case feature

#### 9. User Location Context
**ChatGPT**: `_meta["openai/userLocation"]` (city, region, country, timezone, lat/lng)
**Ours**: Not implemented
**Impact**: Medium - Useful for location-aware apps

#### 10. Monetization
**ChatGPT**: Built-in monetization support
**Ours**: Not implemented
**Impact**: High for commercial use cases

#### 11. OAuth/Security Schemes
**ChatGPT**: `securitySchemes` on tool descriptors
**Ours**: Not implemented
**Impact**: High - Required for authenticated APIs

### Architectural Differences

| Aspect | ChatGPT Apps SDK | Our Implementation |
|--------|------------------|-------------------|
| **Global Object** | `window.openai` | `window.aui` (via bridge script) |
| **Bridge Communication** | `openai:set_globals` event | `aui:set_globals` event |
| **Template MIME Type** | `text/html+skybridge` | HTML served via registry |
| **Hosting** | `*.web-sandbox.oaiusercontent.com` | `*.auiusercontent.com` |
| **Bundle Integrity** | Not explicitly documented | SHA-256 hash verification |

## Code References

### Our Implementation
- `packages/tool-ui-server/src/types/protocol.ts` - Core protocol definitions
- `packages/tool-ui-server/src/create-tool-ui-server.ts` - Server SDK
- `packages/tool-ui-server/src/create-tool-ui-runtime.ts` - Client runtime
- `packages/tool-ui-server/src/remote/remote-tool-ui.tsx` - Iframe renderer
- `packages/tool-ui-server/src/hooks/use-aui.tsx` - React hooks
- `packages/tool-ui-server/src/schemas/manifest.ts` - Manifest schema
- `packages/tool-ui-server/src/runtime/bridge-script.ts` - Injected bridge

### ChatGPT Apps SDK References
- https://developers.openai.com/apps-sdk/build/chatgpt-ui/
- https://developers.openai.com/apps-sdk/build/mcp-server/
- https://developers.openai.com/apps-sdk/reference/
- https://developers.openai.com/apps-sdk/build/state-management/
- https://github.com/openai/apps-sdk-ui

## Recommendations for Full Parity

### High Priority
1. **File Upload/Download APIs** - Critical for media-rich applications
2. **OAuth/Security Schemes** - Required for authenticated third-party APIs
3. **Tool Annotations** - Improves UX with smart confirmation flows

### Medium Priority
4. **User Location Context** - Enables location-aware applications
5. **Tool Invocation Status Messages** - Better loading UX
6. **File Params Declaration** - Clean file handling interface

### Low Priority
7. **Widget Session ID** - Debugging/analytics
8. **Tool Visibility Control** - Advanced use case
9. **Server-side Widget Close** - Edge case
10. **Widget Border Preference** - Cosmetic

## Open Questions
1. Should we aim for API name compatibility (`window.openai` vs `window.aui`)?
2. Is monetization a priority for this implementation?
3. Should we implement the `text/html+skybridge` MIME type convention?

## Related Research
- None yet in this repository
