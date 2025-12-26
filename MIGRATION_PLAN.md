# Migration Plan: @assistant-ui/react to use @assistant-ui/store

## Overview

Migrate `@assistant-ui/react` to use `@assistant-ui/store`'s `ClientRegistry` pattern for type-safe, tap-based state management. This removes the duplicated context/store layer in the react package.

---

## Progress

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | Done | Type files and store augmentation |
| Phase 2 | Done | Client migrations to store patterns |
| Phase 3 | Done | Drop duplicated context layer |
| Phase 4 | Done | Default peer scopes |
| Phase 5 | Done | Providers updated to use store |
| Phase 6 | Not Started | Primitive updates |
| Phase 7 | Not Started | Testing & cleanup |

---

## Client Scopes

| Scope | Type | Source | Has Events |
|-------|------|--------|------------|
| `threads` | Root | - | No |
| `tools` | Root | - | No |
| `modelContext` | Root | - | No |
| `threadListItem` | Derived | `threads` | Yes |
| `thread` | Derived | `threads` | Yes |
| `composer` | Derived | `thread` or `message` | Yes |
| `message` | Derived | `thread` | No |
| `part` | Derived | `message` | No |
| `attachment` | Derived | `message` or `composer` | No |

---

## Event Types

```typescript
// Thread events
"thread.run-start": { threadId: string }
"thread.run-end": { threadId: string }
"thread.initialize": { threadId: string }
"thread.model-context-update": { threadId: string }

// ThreadListItem events
"thread-list-item.switched-to": { threadId: string }
"thread-list-item.switched-away": { threadId: string }

// Composer events
"composer.send": { threadId: string; messageId?: string }
"composer.attachment-add": { threadId: string; messageId?: string }
```

---

## Key Files Reference

### Store Package (target pattern)
- `packages/store/src/types/client.ts` - ClientRegistry, ClientOutput, ClientSchema types
- `packages/store/src/types/events.ts` - Event system types
- `packages/store/src/tapClientResource.ts` - Wrap resources as clients
- `packages/store/src/tapClientLookup.ts` - Manage collections of clients
- `packages/store/src/Derived.ts` - Reference parent scope clients
- `packages/store/src/useAssistantClient.tsx` - Main hook
- `packages/store/src/useAssistantState.tsx` - State selector hook
- `packages/store/src/utils/react-assistant-context.tsx` - AssistantProvider and context

### React Package (files to migrate)
- `packages/react/src/context/react/AssistantApiContext.tsx` - Current context (to be replaced)
- `packages/react/src/client/AssistantClient.ts` - Current root client creation
- `packages/react/src/utils/tap-store/` - Old tap utilities (to be removed)

---

## Phase 3: Drop Duplicated Context Layer (DONE)

### Summary

Replaced the react package's duplicated context system with re-exports from the store package while maintaining backward compatibility.

### Changes Made

**`context/react/AssistantApiContext.tsx`** - Now a thin wrapper:
- `AssistantApi` is a type alias for `AssistantClient`
- `useAssistantApi()` delegates to store's `useAssistantClient` or react's custom hook
- `AssistantProvider` wrapper accepts both `api` and `client` props (with DevTools integration)
- Deprecated: `useExtendedAssistantApi`, `createAssistantApiField`, `extendApi`

**`client/AssistantClient.ts`** - Rewritten to use store patterns:
- Uses `tapClientResource` from store for root clients
- `RootClientsResource` handles model context provider nesting
- Creates `AssistantClient` compatible structure
- Uses store's React context via `useAssistantContextValue`

**`context/react/hooks/`** - Simplified to re-exports:
- `useAssistantState.tsx` → re-exports from store
- `useAssistantEvent.ts` → re-exports from store

### Files Removed

```
utils/tap-store/  (entire directory)
client/EventContext.ts
client/util-hooks/tapLookupResources.ts
```

### Event Naming Update

Changed event names from dash-separated to camelCase to match client registry:
- `thread-list-item.switched-to` → `threadListItem.switched-to`
- `thread-list-item.switched-away` → `threadListItem.switched-away`

### Files Kept (unrelated to migration)

```
context/stores/ThreadViewport.tsx - viewport/scroll features (uses zustand)
context/stores/index.ts
context/react/utils/createContextStoreHook.ts - used by ThreadViewportContext
context/react/utils/createContextHook.ts
context/react/utils/useRuntimeState.ts - legacy hooks support
context/react/utils/createStateHookForRuntime.ts - deprecated hooks
context/ReadonlyStore.ts - SmoothContext
```

---

## Phase 4: Define Default Peer Scopes on RuntimeAdapter (DONE)

### Summary

Added default peer scopes to `RuntimeAdapter` using `attachDefaultPeers`, allowing automatic resolution of derived clients without manual specification in providers.

### Changes Made

**`legacy-runtime/RuntimeAdapter.ts`** - Added default peers:
```typescript
attachDefaultPeers(RuntimeAdapter, {
  threadListItem: Derived({
    source: "threads",
    query: { type: "main" },
    get: (aui) => aui.threads().item("main"),
  }),
  thread: Derived({
    source: "threads",
    query: { type: "main" },
    get: (aui) => aui.threads().thread("main"),
  }),
  composer: Derived({
    source: "thread",
    query: {},
    get: (aui) => aui.threads().thread("main").composer,
  }),
});
```

**`legacy-runtime/AssistantRuntimeProvider.tsx`** - Simplified to use default peers:
- Removed manual `Derived` specifications for `threadListItem`, `thread`, and `composer`
- Now only specifies root clients: `modelContext`, `tools`, and `threads`
- Default peers are automatically applied from `RuntimeAdapter`

### How Default Peers Work

1. When `useAssistantClient` receives a root client with `attachDefaultPeers` attached
2. `splitClients` checks for default peers on each root client
3. Default peers are only applied if:
   - The scope doesn't exist in parent context
   - Not explicitly provided by user
   - Not already defined by another resource's default peers
4. First definition wins - no overriding is permitted

---

## Phase 6: Update Primitives

Replace `useAssistantApi()` + `useRuntimeState()` pattern with `useAssistantState()` selector pattern.

---

## Phase 7: Testing & Cleanup

- Run tests, fix failures
- Verify type inference
- Test event scoping
- Integration test with examples
- Remove dead code

---

## API Summary

```typescript
// Get client
const aui = useAssistantClient();

// Access state
const messages = useAssistantState((s) => s.thread.messages);

// Call methods
aui.thread().append("Hello");
aui.message().reload();

// Listen to events
aui.on("thread.run-start", (payload) => {
  console.log("Run started:", payload.threadId);
});
```
