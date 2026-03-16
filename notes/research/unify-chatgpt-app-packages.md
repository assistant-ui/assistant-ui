---
date: 2026-01-16T03:07:00-08:00
researcher: Claude
git_commit: 5f04cb74c3446b9cb84e11490da9870c90a43128
branch: unify_chatgpt_app_stuff
repository: assistant-ui
topic: "Unifying chatgpt-app-studio and tool-ui-server packages"
tags: [research, codebase, chatgpt-apps, tool-ui-server, unification]
status: complete
last_updated: 2026-01-16
last_updated_by: Claude
---

# Research: Unifying chatgpt-app-studio and tool-ui-server packages

**Date**: 2026-01-16T03:07:00-08:00
**Researcher**: Claude
**Git Commit**: 5f04cb74c3446b9cb84e11490da9870c90a43128
**Branch**: unify_chatgpt_app_stuff
**Repository**: assistant-ui

## Research Question

Analyze the relationship between `chatgpt-app-studio` and `@assistant-ui/tool-ui-server` packages to determine unification strategy.

## Summary

These two packages have **significant code duplication** and serve complementary purposes:

| Package | Purpose | API Surface |
|---------|---------|-------------|
| `chatgpt-app-studio` | CLI scaffolding + local dev workbench | `window.openai` |
| `@assistant-ui/tool-ui-server` | Production SDK for MCP servers | `window.aui` (+ `window.openai` alias) |

**Key finding**: Both implement nearly identical:
- Type definitions (`OpenAIGlobals` vs `AUIGlobals`)
- React hooks (`useToolInput`, `useCallTool`, etc.)
- Bridge scripts for iframe communication
- Action button schemas and hooks
- PostMessage protocol (`OPENAI_*` vs `AUI_*` prefixes)

## Detailed Findings

### 1. Package Purposes

#### chatgpt-app-studio (`packages/chatgpt-app-studio`)
- **Type**: CLI tool + template scaffolder
- **npm**: `chatgpt-app-studio` (not scoped)
- **Command**: `npx chatgpt-app-studio my-app`
- **Contains**:
  - `src/index.ts` - CLI entry point with prompts
  - `src/utils.ts` - Scaffolding utilities
  - `templates/starter/` - Full Next.js workbench app (~150+ files)

#### tool-ui-server (`packages/tool-ui-server`)
- **Type**: SDK library
- **npm**: `@assistant-ui/tool-ui-server`
- **Exports**: `createToolUIServer()`, hooks, `RemoteToolUI`, OAuth utils
- **Contains**:
  - Server creation (`create-tool-ui-server.ts`)
  - Runtime bridge (`create-tool-ui-runtime.ts`)
  - React hooks (`hooks/`)
  - Remote iframe rendering (`remote/`)
  - OAuth implementation (`oauth/`)
  - Registry API (`registry-api.ts`)

### 2. Duplicate Type Definitions

#### Protocol Types (99% identical)

| chatgpt-app-studio | tool-ui-server | Difference |
|-------------------|----------------|------------|
| `templates/starter/lib/workbench/types.ts` | `src/types/protocol.ts` | |
| `OpenAIGlobals` | `AUIGlobals` | Name only |
| `OpenAIAPI` | `AUIAPI` | Name only |
| `WindowOpenAI` | `WindowAUI` | Name only |
| `OPENAI_SET_GLOBALS` | `AUI_SET_GLOBALS` | Prefix only |
| `openai:set_globals` | `aui:set_globals` | Event name |

Both have identical:
- `DisplayMode = "inline" | "fullscreen" | "pip"`
- `Theme = "light" | "dark"`
- `WidgetState = Record<string, unknown> | null`
- `UserAgent`, `SafeArea`, `UserLocation`, `View`
- `CallToolResponse`, `ModalOptions`, `UploadFileResponse`, `GetFileDownloadUrlResponse`

**chatgpt-app-studio extra types** (workbench-specific):
- `DeviceType = "mobile" | "tablet" | "desktop" | "resizable"`
- `DevicePreset`, `DEVICE_PRESETS`
- `WorkbenchComponent`, `ComponentCategory`
- `ConsoleEntry`, `ConsoleEntryType`
- `SimulationState`, `ToolSimulationConfig`
- `LOCALE_OPTIONS`

**tool-ui-server extra types**:
- `ToolInvocationMessages`, `ToolMetadata`, `ToolAnnotations`
- `LegacyRemoteMessage`

### 3. Duplicate Hooks

#### useActionButtons (95% identical)

| File | Lines | Difference |
|------|-------|------------|
| `chatgpt-app-studio/templates/starter/components/workbench/shared/use-action-buttons.tsx` | 125 | Uses state for execution tracking |
| `tool-ui-server/src/hooks/use-action-buttons.ts` | 130 | Adds `isExecutingRef` for double-click prevention |

Both have identical:
- `UseActionButtonsOptions` type
- `UseActionButtonsResult` type
- Confirm timeout logic
- Escape key handling
- Action resolution logic

### 4. Duplicate Schemas

#### Action Schemas (90% identical)

| chatgpt-app-studio | tool-ui-server |
|-------------------|----------------|
| `templates/starter/components/workbench/shared/schema.ts` | `src/schemas/shared.ts` |

Both define:
- `ToolUIIdSchema`
- `ActionSchema` (id, label, confirmLabel, variant, icon, loading, disabled, shortcut)
- `ActionButtonsPropsSchema`
- `SerializableActionSchema`
- `SerializableActionsConfigSchema`
- `ActionsConfig` type

**chatgpt-app-studio extras**:
- `ToolUIRoleSchema` (information, decision, control, state, composite)
- `ToolUIReceiptSchema` (outcome, summary, identifiers, at)
- `ToolUISurfaceSchema`

**tool-ui-server extras**:
- `ToolInvocationMessagesSchema`
- `ToolMetadataSchema`
- `ToolAnnotationsSchema`

### 5. Duplicate Bridge Scripts

#### Production Bridge

| chatgpt-app-studio | tool-ui-server |
|-------------------|----------------|
| `templates/starter/lib/export/bridge.ts` | `src/runtime/bridge-script.ts` |
| 279 lines | 224 lines |
| TypeScript (compiled) | String template (runtime) |
| `window.openai` only | `window.aui` + `window.openai` alias |
| No timeout | 30s timeout on method calls |

Both implement:
- `pendingCalls` Map for async tracking
- `generateCallId()` function
- `dispatchGlobalsChange()` with CustomEvent
- `buildChangedGlobals()` diff logic
- `handleMessage()` for PostMessage
- `callMethod()` for RPC
- Getter-based globals access

**Key difference**: tool-ui-server bridge dispatches BOTH events:
```javascript
// Dispatch AUI event (our standard)
var auiEvent = new CustomEvent("aui:set_globals", ...);
// Dispatch OpenAI event (ChatGPT Apps compatibility)
var openaiEvent = new CustomEvent("openai:set_globals", ...);
```

### 6. Duplicate React Context/Provider

Both packages have OpenAI/AUI context providers with identical hook patterns:

| Hook | chatgpt-app-studio | tool-ui-server |
|------|-------------------|----------------|
| `useToolInput<T>()` | `openai-context.tsx:567` | `use-aui.tsx:170` |
| `useToolOutput<T>()` | `openai-context.tsx:573` | `use-aui.tsx:174` |
| `useTheme()` | `openai-context.tsx:579` | `use-aui.tsx:158` |
| `useDisplayMode()` | `openai-context.tsx:585` | `use-aui.tsx:166` |
| `useWidgetState<T>()` | `openai-context.tsx:591` | `use-aui.tsx:178` |
| `useCallTool()` | `openai-context.tsx:609` | `use-aui.tsx:195` |
| `useRequestDisplayMode()` | `openai-context.tsx:617` | `use-aui.tsx:200` |
| `useSendFollowUpMessage()` | `openai-context.tsx:625` | `use-aui.tsx:205` |
| `useMaxHeight()` | `openai-context.tsx:633` | `use-aui.tsx:210` |
| `useUserAgent()` | `openai-context.tsx:639` | `use-aui.tsx:214` |
| `useSafeArea()` | `openai-context.tsx:645` | `use-aui.tsx:218` |
| `useUserLocation()` | `openai-context.tsx:651` | `use-aui.tsx:222` |
| `useUploadFile()` | `openai-context.tsx:657` | `use-aui.tsx:230` |
| `useGetFileDownloadUrl()` | `openai-context.tsx:663` | `use-aui.tsx:237` |

### 7. with-openai-apps Example

The `examples/with-openai-apps/` directory uses BOTH patterns:

- **Client**: Uses `@assistant-ui/tool-ui-server` for `MCPToolUIProvider`
- **Servers**: Uses `generateBridgeScript` from `@assistant-ui/tool-ui-server`
- **Widgets**: Use `window.openai` API (aliased from `window.aui`)

This example demonstrates the intended relationship: `tool-ui-server` is the production SDK.

## Architecture Insights

### Current State

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEVELOPMENT                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              chatgpt-app-studio                              ││
│  │  ┌──────────────┐  ┌──────────────────────────────────────┐ ││
│  │  │   CLI        │  │  templates/starter/                   │ ││
│  │  │   (scaffold) │  │  - lib/workbench/ (types, hooks,     │ ││
│  │  └──────────────┘  │    store, context, bridge)           │ ││
│  │                    │  - lib/export/ (bundler, bridge)     │ ││
│  │                    │  - components/workbench/ (UI)        │ ││
│  │                    └──────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTION                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              @assistant-ui/tool-ui-server                    ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   ││
│  │  │ Server SDK   │  │ React hooks  │  │ Remote iframe    │   ││
│  │  │ (MCP)        │  │ (AUI context)│  │ (RemoteToolUI)   │   ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   ││
│  │  │ CLI          │  │ OAuth        │  │ Registry API     │   ││
│  │  │ (publish)    │  │ (2.1 impl)   │  │ (manifest)       │   ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Duplication Matrix

| Component | chatgpt-app-studio | tool-ui-server | Status |
|-----------|-------------------|----------------|--------|
| Types (protocol) | `lib/workbench/types.ts` | `types/protocol.ts` | **DUPLICATE** |
| Types (schemas) | `components/workbench/shared/schema.ts` | `schemas/shared.ts` | **DUPLICATE** |
| Hooks (AUI/OpenAI) | `lib/workbench/openai-context.tsx` | `hooks/use-aui.tsx` | **DUPLICATE** |
| Hooks (actions) | `components/workbench/shared/use-action-buttons.tsx` | `hooks/use-action-buttons.ts` | **DUPLICATE** |
| Bridge (production) | `lib/export/bridge.ts` | `runtime/bridge-script.ts` | **DUPLICATE** |
| Bridge (dev) | `lib/workbench/openai-bridge.ts` | N/A | Workbench-only |
| Server SDK | N/A | `create-tool-ui-server.ts` | SDK-only |
| OAuth | N/A | `oauth/` | SDK-only |
| Registry | N/A | `registry-api.ts` | SDK-only |
| Remote iframe | N/A | `remote/` | SDK-only |
| Workbench UI | `components/workbench/` | N/A | Workbench-only |
| Store (Zustand) | `lib/workbench/store.ts` | N/A | Workbench-only |

## Unification Strategy

### Option A: Make chatgpt-app-studio depend on tool-ui-server

**Approach**: 
- Move shared types, hooks, schemas, bridge to `tool-ui-server`
- `chatgpt-app-studio` templates import from `@assistant-ui/tool-ui-server`
- Keep workbench-specific code in templates

**Pros**:
- Single source of truth for protocol
- Easier to maintain
- Clear dependency direction

**Cons**:
- Templates need to depend on npm package
- Build complexity for templates

### Option B: Extract shared code to new package

**Approach**:
- Create `@assistant-ui/chatgpt-protocol` (types, schemas, bridge)
- Both packages depend on it
- Each package adds domain-specific code

**Pros**:
- Clean separation
- Minimal changes to existing packages

**Cons**:
- Yet another package to maintain
- More complex dependency graph

### Option C: Merge into single package

**Approach**:
- Rename `tool-ui-server` to `@assistant-ui/chatgpt-apps`
- Add CLI scaffolding to same package
- Templates ship as separate files or separate package

**Pros**:
- Simplest mental model
- One package to maintain

**Cons**:
- Larger package size
- May not fit npm naming conventions

### Recommended: Option A (chatgpt-app-studio depends on tool-ui-server)

**Rationale**:
1. `tool-ui-server` already has the production-ready code
2. The bridge already supports both `window.aui` and `window.openai`
3. Templates can import hooks from `@assistant-ui/tool-ui-server`
4. Workbench-specific code (store, mock config, dev UI) stays in templates

**Changes needed**:
1. Export shared types from `tool-ui-server` (already done)
2. Export bridge script as `generateBridgeScript()` (already done)
3. Update chatgpt-app-studio templates to import from `@assistant-ui/tool-ui-server`
4. Remove duplicate code from templates
5. Keep only workbench-specific code in templates

## Code References

### Duplicate Types
- `packages/chatgpt-app-studio/templates/starter/lib/workbench/types.ts:46-108`
- `packages/tool-ui-server/src/types/protocol.ts:73-126`

### Duplicate Hooks
- `packages/chatgpt-app-studio/templates/starter/lib/workbench/openai-context.tsx:567-663`
- `packages/tool-ui-server/src/hooks/use-aui.tsx:158-242`

### Duplicate Schemas
- `packages/chatgpt-app-studio/templates/starter/components/workbench/shared/schema.ts:73-120`
- `packages/tool-ui-server/src/schemas/shared.ts:20-63`

### Duplicate Bridge
- `packages/chatgpt-app-studio/templates/starter/lib/export/bridge.ts:58-273`
- `packages/tool-ui-server/src/runtime/bridge-script.ts:24-222`

### Duplicate Action Buttons Hook
- `packages/chatgpt-app-studio/templates/starter/components/workbench/shared/use-action-buttons.tsx:28-124`
- `packages/tool-ui-server/src/hooks/use-action-buttons.ts:30-129`

## Open Questions

1. Should `chatgpt-app-studio` be renamed to align with `@assistant-ui` scope?
2. Should the CLI be split from templates (separate npm packages)?
3. What's the versioning strategy between packages?
4. Should `window.openai` be deprecated in favor of `window.aui`?
5. How to handle the `with-openai-apps` example - does it stay or get moved?
