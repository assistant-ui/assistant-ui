# Unify chatgpt-app-studio and tool-ui-server with OpenAI Naming

## Overview

Standardize on `OpenAI` naming throughout both packages, with `tool-ui-server` as the source of truth. The `chatgpt-app-studio` templates will import shared types, hooks, and schemas from `@assistant-ui/tool-ui-server` instead of maintaining duplicate copies.

## Current State Analysis

### Naming Conflicts

| Component | tool-ui-server (current) | chatgpt-app-studio (current) | Target |
|-----------|-------------------------|------------------------------|--------|
| Global object | `window.aui` | `window.openai` | `window.openai` |
| Types | `AUIGlobals`, `AUIAPI`, `WindowAUI` | `OpenAIGlobals`, `OpenAIAPI`, `WindowOpenAI` | `OpenAI*` |
| Context | `AUIProvider`, `useAUI` | `OpenAIProvider`, `useOpenAI` | `OpenAI*` |
| Events | `aui:set_globals` | `openai:set_globals` | `openai:set_globals` |
| Messages | `AUI_SET_GLOBALS`, `AUI_METHOD_CALL` | `OPENAI_SET_GLOBALS`, `OPENAI_METHOD_CALL` | `OPENAI_*` |

### Files to Modify in tool-ui-server

1. `src/types/protocol.ts` - Rename AUI* to OpenAI*
2. `src/hooks/use-aui.tsx` - Rename to use-openai.tsx, update internals
3. `src/hooks/index.ts` - Update exports
4. `src/runtime/bridge-script.ts` - Update to use OpenAI naming
5. `src/remote/remote-tool-ui.tsx` - Update references
6. `src/remote/mcp-tool-ui-provider.tsx` - Update references
7. `src/remote/message-bridge.ts` - Update message types
8. `src/create-tool-ui-runtime.ts` - Update references
9. `src/index.ts` - Update exports

### Files to Modify in chatgpt-app-studio

1. `templates/starter/package.json` - Add `@assistant-ui/tool-ui-server` dependency
2. `templates/starter/lib/workbench/types.ts` - Remove duplicates, re-export from tool-ui-server
3. `templates/starter/lib/workbench/openai-context.tsx` - Import types from tool-ui-server
4. `templates/starter/lib/workbench/index.ts` - Update exports
5. `templates/starter/lib/export/bridge.ts` - Import from tool-ui-server or remove
6. `templates/starter/components/workbench/shared/schema.ts` - Import from tool-ui-server
7. `templates/starter/components/workbench/shared/use-action-buttons.tsx` - Import from tool-ui-server

## Desired End State

1. **tool-ui-server** exports all shared code with `OpenAI` naming:
   - `OpenAIGlobals`, `OpenAIAPI`, `WindowOpenAI`
   - `OpenAIProvider`, `useOpenAI`, `useToolInput`, etc.
   - `SET_GLOBALS_EVENT_TYPE = "openai:set_globals"`
   - `generateBridgeScript()` that creates `window.openai`

2. **chatgpt-app-studio** templates import from `@assistant-ui/tool-ui-server`:
   - Types: `OpenAIGlobals`, `OpenAIAPI`, etc.
   - Hooks: `useToolInput`, `useCallTool`, etc. (keep local context wrapper)
   - Schemas: `ActionSchema`, `SerializableActionSchema`, etc.
   - Bridge: `generateBridgeScript()` for production export

3. **Workbench-specific code stays in templates**:
   - `store.ts` (Zustand store)
   - `openai-context.tsx` (workbench-specific provider with mock handling)
   - `mock-responses.ts`, `mock-config/`
   - Workbench UI components

## What We're NOT Doing

- NOT removing the workbench functionality from chatgpt-app-studio
- NOT merging the packages into one
- NOT changing the npm package names
- NOT modifying with-openai-apps example (it already uses the right patterns)

## Implementation Approach

We'll work in phases to minimize breakage:

1. **Phase 1**: Rename in tool-ui-server (AUI* -> OpenAI*)
2. **Phase 2**: Export new types from tool-ui-server
3. **Phase 3**: Update chatgpt-app-studio templates to import from tool-ui-server
4. **Phase 4**: Remove duplicate code from templates
5. **Phase 5**: Verify everything works

---

## Phase 1: Rename in tool-ui-server (AUI -> OpenAI)

### Overview
Rename all AUI prefixes to OpenAI for consistency with ChatGPT Apps SDK.

### Changes Required:

#### 1. Protocol Types
**File**: `packages/tool-ui-server/src/types/protocol.ts`

**Rename types**:
- `AUIGlobals` -> `OpenAIGlobals`
- `AUIAPI` -> `OpenAIAPI`
- `WindowAUI` -> `WindowOpenAI`
- `SET_GLOBALS_EVENT_TYPE` -> `"openai:set_globals"`
- `ParentToIframeMessage.type`: `AUI_*` -> `OPENAI_*`
- `IframeToParentMessage.type`: `AUI_*` -> `OPENAI_*`

#### 2. Hooks
**File**: `packages/tool-ui-server/src/hooks/use-aui.tsx` -> `use-openai.tsx`

**Changes**:
- Rename file to `use-openai.tsx`
- Rename `AUIProvider` -> `OpenAIProvider`
- Rename `useAUI` -> `useOpenAI`
- Rename `AUIContext` -> `OpenAIContext`
- Rename `AUIContextValue` -> `OpenAIContextValue`
- Update `window.aui` references to `window.openai`
- Update event listener from `"aui:set_globals"` to `"openai:set_globals"`

#### 3. Hooks Index
**File**: `packages/tool-ui-server/src/hooks/index.ts`

**Changes**:
- Update import path from `./use-aui` to `./use-openai`
- Rename exports: `AUIProvider` -> `OpenAIProvider`, `useAUI` -> `useOpenAI`

#### 4. Bridge Script
**File**: `packages/tool-ui-server/src/runtime/bridge-script.ts`

**Changes**:
- Update CustomEvent name from `"aui:set_globals"` to `"openai:set_globals"`
- Update message types from `AUI_*` to `OPENAI_*`
- Keep `window.openai` (already correct)
- Remove `window.aui` alias (no longer needed)

#### 5. Remote Components
**File**: `packages/tool-ui-server/src/remote/remote-tool-ui.tsx`

**Changes**:
- Update type imports to use `OpenAI*` names
- Update message type checks

**File**: `packages/tool-ui-server/src/remote/mcp-tool-ui-provider.tsx`

**Changes**:
- Update type imports

**File**: `packages/tool-ui-server/src/remote/message-bridge.ts`

**Changes**:
- Update message type constants from `AUI_*` to `OPENAI_*`

#### 6. Runtime
**File**: `packages/tool-ui-server/src/create-tool-ui-runtime.ts`

**Changes**:
- Update references to use OpenAI naming

#### 7. Main Exports
**File**: `packages/tool-ui-server/src/index.ts`

**Changes**:
- Rename exports: `AUIProvider` -> `OpenAIProvider`, `useAUI` -> `useOpenAI`
- Update protocol type exports to use `OpenAI*` names
- Keep backward-compatible aliases for `AUI*` types (deprecated)

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @assistant-ui/tool-ui-server build`
- [ ] Tests pass: `pnpm --filter @assistant-ui/tool-ui-server test`
- [ ] Lint passes: `pnpm lint`

#### Manual Verification:
- [ ] Exports are correctly named when importing from package

---

## Phase 2: Export Shared Types from tool-ui-server

### Overview
Ensure tool-ui-server exports all types needed by chatgpt-app-studio templates.

### Changes Required:

#### 1. Main Exports
**File**: `packages/tool-ui-server/src/index.ts`

**Add exports** (if not already present):
```typescript
// Protocol types - with OpenAI naming
export type {
  DisplayMode,
  Theme,
  WidgetState,
  OpenAIGlobals,
  OpenAIAPI,
  WindowOpenAI,
  CallToolResponse,
  ModalOptions,
  UserAgent,
  SafeArea,
  SafeAreaInsets,
  UserLocation,
  ToolResponseMetadata,
  UploadFileResponse,
  GetFileDownloadUrlResponse,
  ParentToIframeMessage,
  IframeToParentMessage,
  View,
  DeviceInfo,
  DeviceCapabilities,
} from "./types/protocol";

export { SET_GLOBALS_EVENT_TYPE } from "./types/protocol";

// Bridge script generator
export { generateBridgeScript, DEFAULT_GLOBALS } from "./runtime/bridge-script";
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm --filter @assistant-ui/tool-ui-server build`
- [ ] All exports are accessible: Create test import file

---

## Phase 3: Update chatgpt-app-studio Templates

### Overview
Update templates to import shared code from `@assistant-ui/tool-ui-server`.

### Changes Required:

#### 1. Add Dependency
**File**: `packages/chatgpt-app-studio/templates/starter/package.json`

**Add dependency**:
```json
{
  "dependencies": {
    "@assistant-ui/tool-ui-server": "^0.0.1",
    // ... existing deps
  }
}
```

#### 2. Update Types
**File**: `packages/chatgpt-app-studio/templates/starter/lib/workbench/types.ts`

**Replace with**:
```typescript
// Re-export shared types from tool-ui-server
export type {
  DisplayMode,
  Theme,
  WidgetState,
  OpenAIGlobals,
  OpenAIAPI,
  WindowOpenAI,
  CallToolResponse,
  ModalOptions,
  UserAgent,
  SafeArea,
  SafeAreaInsets,
  UserLocation,
  ToolResponseMetadata,
  UploadFileResponse,
  GetFileDownloadUrlResponse,
  ParentToIframeMessage,
  IframeToParentMessage,
  View,
  DeviceInfo,
  DeviceCapabilities,
} from "@assistant-ui/tool-ui-server";

export { SET_GLOBALS_EVENT_TYPE } from "@assistant-ui/tool-ui-server";

// Workbench-specific types (NOT in tool-ui-server)
export type DeviceType = "mobile" | "tablet" | "desktop" | "resizable";

export interface DevicePreset {
  width: number | "100%";
  height: number | "100%";
  userAgent: UserAgent;
}

export const DEVICE_PRESETS: Record<DeviceType, DevicePreset> = {
  // ... keep existing
};

export const LOCALE_OPTIONS = [
  // ... keep existing
] as const;

export type ResponseMode = "success" | "error" | "hang";

export interface ToolSimulationConfig {
  responseMode: ResponseMode;
  responseData: Record<string, unknown>;
}

// ... other workbench-specific types
```

#### 3. Update OpenAI Context
**File**: `packages/chatgpt-app-studio/templates/starter/lib/workbench/openai-context.tsx`

**Update imports**:
```typescript
import type {
  OpenAIGlobals,
  OpenAIAPI,
  DisplayMode,
  CallToolResponse,
  ModalOptions,
  UploadFileResponse,
  GetFileDownloadUrlResponse,
  View,
  WidgetState,
  WindowOpenAI,
} from "@assistant-ui/tool-ui-server";

import { SET_GLOBALS_EVENT_TYPE } from "@assistant-ui/tool-ui-server";
```

Note: Keep the workbench-specific `OpenAIProvider` implementation since it has mock handling, store integration, etc.

#### 4. Update Export Bridge
**File**: `packages/chatgpt-app-studio/templates/starter/lib/export/bridge.ts`

**Option A**: Import from tool-ui-server
```typescript
export { generateBridgeScript } from "@assistant-ui/tool-ui-server";
```

**Option B**: Keep local but import types
```typescript
import type { OpenAIGlobals, ... } from "@assistant-ui/tool-ui-server";
// Keep the installOpenAIBridge function which is slightly different
```

#### 5. Update Schema
**File**: `packages/chatgpt-app-studio/templates/starter/components/workbench/shared/schema.ts`

**Import shared schemas**:
```typescript
// Import shared schemas from tool-ui-server
export {
  ToolUIIdSchema,
  type ToolUIId,
  ActionSchema,
  type Action,
  ActionButtonsPropsSchema,
  SerializableActionSchema,
  SerializableActionsSchema,
  type ActionsConfig,
  SerializableActionsConfigSchema,
  type SerializableActionsConfig,
  type SerializableAction,
} from "@assistant-ui/tool-ui-server";

// Workbench-specific schemas (keep these)
export const ToolUIRoleSchema = z.enum([...]);
// ...
```

#### 6. Update Action Buttons Hook
**File**: `packages/chatgpt-app-studio/templates/starter/components/workbench/shared/use-action-buttons.tsx`

**Import from tool-ui-server**:
```typescript
export {
  useActionButtons,
  type UseActionButtonsOptions,
  type UseActionButtonsResult,
} from "@assistant-ui/tool-ui-server";
```

### Success Criteria:

#### Automated Verification:
- [ ] Template builds correctly when scaffolded
- [ ] No TypeScript errors in template code
- [ ] Lint passes

#### Manual Verification:
- [ ] `npx chatgpt-app-studio test-app` creates working app
- [ ] Workbench functions correctly
- [ ] Export functionality works

---

## Phase 4: Remove Duplicate Code

### Overview
After imports are working, remove the duplicate implementations.

### Changes Required:

#### 1. Slim Down types.ts
Keep only workbench-specific types, remove duplicates of what's in tool-ui-server.

#### 2. Remove Duplicate use-action-buttons.tsx
Replace with re-export.

#### 3. Remove Duplicate schema.ts Definitions
Keep only workbench-specific schemas.

### Success Criteria:

#### Automated Verification:
- [ ] Build passes
- [ ] Tests pass
- [ ] No duplicate type/schema definitions

---

## Phase 5: Verify Integration

### Overview
End-to-end verification that everything works together.

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm build` passes for entire monorepo
- [ ] `pnpm test` passes for all packages
- [ ] `pnpm lint` passes

#### Manual Verification:
- [ ] Create new app with `npx chatgpt-app-studio test-unify`
- [ ] Run workbench: `npm run dev`
- [ ] Verify `window.openai` is available
- [ ] Test tool calls work
- [ ] Test display mode changes
- [ ] Test widget state
- [ ] Run export: `npm run export`
- [ ] Verify exported widget works

---

## Testing Strategy

### Unit Tests:
- tool-ui-server tests should pass with renamed types
- Verify exports are correct

### Integration Tests:
- Scaffold new project with chatgpt-app-studio
- Run workbench
- Verify all functionality

### Manual Testing Steps:
1. Build tool-ui-server: `pnpm --filter @assistant-ui/tool-ui-server build`
2. Create test app: `cd /tmp && npx chatgpt-app-studio test-app`
3. Install deps: `cd test-app && npm install`
4. Run dev: `npm run dev`
5. Open http://localhost:3000
6. Test widget preview
7. Test tool calls
8. Test display mode changes
9. Run export: `npm run export`
10. Verify export/widget/index.html works

## Migration Notes

### Backward Compatibility

Add deprecated aliases in tool-ui-server for anyone using old names:
```typescript
/** @deprecated Use OpenAIGlobals instead */
export type AUIGlobals = OpenAIGlobals;
/** @deprecated Use OpenAIProvider instead */
export const AUIProvider = OpenAIProvider;
// etc.
```

### with-openai-apps Example

The example already uses `window.openai`, so it should continue working. May need minor updates if it imports `AUI*` types.

## References

- Research: `notes/research/unify-chatgpt-app-packages.md`
- tool-ui-server: `packages/tool-ui-server/`
- chatgpt-app-studio: `packages/chatgpt-app-studio/`
- with-openai-apps example: `examples/with-openai-apps/`
