# Migration Plan: @assistant-ui/react to use @assistant-ui/store

## Overview

Migrate `@assistant-ui/react` to use `@assistant-ui/store`'s `ClientRegistry` pattern for type-safe, tap-based state management. This removes the duplicated context/store layer in the react package.

---

## Current Progress Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 | ✅ COMPLETE | Type files and store augmentation done |
| Phase 2 | ✅ COMPLETE | All clients migrated to store patterns |
| Phase 3 | ⏳ READY | Prerequisites complete, can now drop duplicated context layer |
| Phase 4 | ⏳ NOT STARTED | Default peer scopes |
| Phase 5 | ✅ COMPLETE | Providers updated to use store's Derived/useAssistantClient |
| Phase 6 | ⏳ NOT STARTED | Primitive updates |
| Phase 7 | ⏳ NOT STARTED | Testing & cleanup |

### Completed Pre-Phase 3 Work

All prerequisites for Phase 3 are now complete:

| Task | Status |
|------|--------|
| `client/NoOpComposerClient.tsx` | ✅ Migrated to `ClientOutput<"composer">` pattern |
| `client/ThreadMessageClient.tsx` | ✅ Migrated to `ClientOutput<"message">` with `tapClientLookup` |
| All providers migrated to `useAssistantClient` + `Derived` | ✅ Complete |
| Meta types updated with `type` discriminators | ✅ Complete |

### What Remains: client/AssistantClient.ts

This file still uses old patterns (`asStore`, `Store` from tap-store). However, it may be addressed as part of Phase 3 since it's the bridge between the old and new context systems.

---

## Phase 3 Feasibility Analysis

### Can Phase 3 Be Started Now?

**YES.** All blocking dependencies are resolved:
- ✅ All client files migrated to store patterns
- ✅ All providers use `useAssistantClient` + `Derived` from store
- ✅ Meta types updated with discriminators

### Key Technical Challenges for Phase 3

1. **`client/AssistantClient.ts`** - This is the main bridge file that needs to be addressed
2. **`context/react/AssistantApiContext.tsx`** - Should be replaced with re-exports from store
3. **Backward compatibility** - May need `useAssistantApi` as an alias for `useAssistantClient`
4. **Event system** - Verify events work correctly after migration

---

## Key Files to Read First

### Store Package (the target pattern)
- `packages/store/src/types/client.ts` - ClientRegistry, ClientOutput, ClientSchema types
- `packages/store/src/types/events.ts` - Event system types
- `packages/store/src/tapClientResource.ts` - How to wrap resources as clients
- `packages/store/src/tapClientLookup.ts` - How to manage collections of clients
- `packages/store/src/tapClientList.ts` - Dynamic lists with add/remove
- `packages/store/src/Derived.ts` - How to reference parent scope clients
- `packages/store/src/attachDefaultPeers.ts` - How to declare default peer scopes
- `packages/store/src/useAssistantClient.tsx` - The main hook (uses `aui` pattern)
- `packages/store/src/useAssistantState.tsx` - State selector hook
- `packages/store/src/utils/tap-assistant-context.ts` - tapAssistantEmit for events

### React Package (current implementation to migrate)
- `packages/react/src/client/types/*.ts` - Current type definitions
- `packages/react/src/legacy-runtime/client/*.ts` - Current resource implementations using tapApi
- `packages/react/src/utils/tap-store/tap-api.ts` - Current tapApi (to be replaced)
- `packages/react/src/client/EventContext.ts` - Current event context (to be replaced)
- `packages/react/src/context/react/AssistantApiContext.tsx` - Current context (to be replaced)
- `packages/react/src/context/providers/*.tsx` - Current providers (to simplify)
- `packages/react/src/types/EventTypes.ts` - Event definitions (has actual event names)

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

## Actual Events (from types/EventTypes.ts)

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

## Phase 1: Add Store Dependency & Create Type Files ✅ COMPLETE

All type files created in `packages/react/src/types/scopes/`:
- `threads.ts`, `threadListItem.ts`, `thread.ts`, `message.ts`, `part.ts`
- `composer.ts`, `attachment.ts`, `tools.ts`, `modelContext.ts`, `index.ts`

Store augmentation created at `packages/react/src/types/store-augmentation.ts`.

---

## Phase 2: Migrate Resources from tapApi to Store Package ✅ COMPLETE

### All Migrations Complete

| File | Status |
|------|--------|
| `legacy-runtime/client/ThreadListRuntimeClient.ts` | ✅ Uses `tapClientResource`, `tapClientLookup` |
| `legacy-runtime/client/ThreadListItemRuntimeClient.ts` | ✅ Uses `tapAssistantEmit` |
| `legacy-runtime/client/ThreadRuntimeClient.ts` | ✅ Uses `tapClientResource`, `tapClientLookup`, `tapAssistantEmit` |
| `legacy-runtime/client/MessageRuntimeClient.ts` | ✅ Uses `tapClientResource`, `tapClientLookup` |
| `legacy-runtime/client/MessagePartRuntimeClient.ts` | ✅ Migrated |
| `legacy-runtime/client/ComposerRuntimeClient.ts` | ✅ Uses `tapClientResource`, `tapClientLookup`, `tapAssistantEmit` |
| `legacy-runtime/client/AttachmentRuntimeClient.ts` | ✅ Migrated |
| `client/Tools.ts` | ✅ Migrated |
| `client/ModelContextClient.ts` | ✅ Migrated |
| `client/NoOpComposerClient.tsx` | ✅ Uses `ClientOutput<"composer">` pattern |
| `client/ThreadMessageClient.tsx` | ✅ Uses `ClientOutput<"message">` with `tapClientLookup` |

### Migration Pattern Reference

**Return `{ state, methods }` directly:**
```typescript
// Resource returns ClientOutput<"scopeName">
export const MyClient = resource(
  ({ ... }): ClientOutput<"message"> => {
    const state = tapMemo<MessageState>(() => ({ ... }), deps);

    return {
      state,
      methods: {
        getState: () => state,
        someMethod: () => { ... },
      },
    };
  }
);
```

**tapClientLookup for collections:**
```typescript
const parts = tapClientLookup(
  sourceArray,
  (item, idx) => attachKey(item.id, PartClient({ part: item })),
  [PartClient, ...deps],
);
// Access: parts.state (array), parts.get({ index }) or parts.get({ key })
```

---

## Phase 3: Drop Duplicated Context Layer ⏳ READY TO START

### Prerequisites ✅ ALL COMPLETE

1. ✅ **Phase 2 migrations complete** - All client files use store patterns
2. ✅ **Phase 5 provider updates complete** - All providers use `useAssistantClient` + `Derived`

### 3.1 Current State Analysis

The react package has its own context layer that duplicates the store package:

| React Package (current) | Store Package (target) |
|------------------------|----------------------|
| `AssistantApi` type | `AssistantClient` type |
| `useAssistantApi()` hook | `useAssistantClient()` hook |
| `AssistantProvider` (custom) | `AssistantProvider` (from store) |
| `DerivedScope` resource | `Derived` element (already migrated) |
| `useExtendedAssistantApi()` | `useAssistantClient(props)` (already using) |
| `createAssistantApiField()` | Built into store |
| `extendApi()` | Built into store |

### 3.2 Files Still Using Old Patterns

Only these files still import from `utils/tap-store/derived-scopes`:
- `context/react/AssistantApiContext.tsx` - **Main target for Phase 3**

All provider files have already been migrated to use `@assistant-ui/store` directly.

### 3.3 Files to Remove (After Migration)

**Can be removed (tap-store related):**
```
utils/tap-store/tap-api.ts
utils/tap-store/derived-scopes.ts
utils/tap-store/store.ts
utils/tap-store/index.ts
client/AssistantClient.ts (will be replaced by store package usage)
client/EventContext.ts
client/util-hooks/tapLookupResources.ts
```

**Must remain (used by other features):**
```
context/stores/ThreadViewport.tsx - used by viewport/scroll features
context/stores/index.ts - exports ThreadViewport
context/react/utils/createContextStoreHook.ts - used by ThreadViewportContext, SmoothContext
context/react/utils/createContextHook.ts - used by ThreadViewportContext
context/react/utils/useRuntimeState.ts - used by createStateHookForRuntime (legacy hooks)
context/react/utils/createStateHookForRuntime.ts - used by deprecated useThread, useMessage, etc.
context/ReadonlyStore.ts - used by SmoothContext
```

Note: The legacy-runtime hooks (`useThread`, `useMessage`, etc.) are deprecated but still supported.
They use `createStateHookForRuntime` which depends on `useRuntimeState`.

### 3.4 Target: Replace AssistantApiContext

The goal is to replace `context/react/AssistantApiContext.tsx` with re-exports:
```typescript
"use client";

export {
  useAssistantClient,
  useAssistantState,
  useAssistantEvent,
  AssistantProvider,
  Derived,
  tapClientResource,
  tapClientLookup,
  tapClientList,
  tapAssistantClientRef,
  tapAssistantEmit,
  attachDefaultPeers,
} from "@assistant-ui/store";

export type {
  AssistantClient,
  AssistantState,
  ClientOutput,
  ClientRegistry,
} from "@assistant-ui/store";
```

### 3.5 ~~Remove zustand from dependencies~~ ❌ NOT FEASIBLE

Zustand is used for features **unrelated to the tap-store migration**:

| Feature | File | Usage |
|---------|------|-------|
| ThreadViewport | `context/stores/ThreadViewport.tsx` | Scroll state, isAtBottom, heights |
| SmoothContext | `utils/smooth/SmoothContext.tsx` | Smooth animation status |
| useInlineRender | `model-context/useInlineRender.tsx` | Tool UI component caching |
| RemoteThreadList | `legacy-runtime/runtime-cores/remote-thread-list/` | Remote thread state |
| MessageParts | `primitives/message/MessageParts.tsx` | `useShallow` for parts comparison |

**Zustand must remain as a dependency.**

---

## Phase 4: Define Default Peer Scopes on ThreadList

### 4.1 Add attachDefaultPeers to ThreadListClient

In `legacy-runtime/client/ThreadListRuntimeClient.ts`, after the resource definition:

```typescript
import { attachDefaultPeers, Derived } from "@assistant-ui/store";

export const ThreadListClient = resource(({ ... }) => { ... });

attachDefaultPeers(ThreadListClient, {
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
    getMeta: (aui) => ({
      source: aui.message.source === null ? "thread" : "message",
      query: {},
    }),
    get: (aui) => {
      if (aui.message.source === null) {
        return aui.thread().composer;
      }
      return aui.message().composer;
    },
  }),
});
```

---

## Phase 5: Update Providers ✅ COMPLETE

### All Providers Migrated

| File | Status |
|------|--------|
| `context/providers/MessageProvider.tsx` | ✅ Uses `useAssistantClient` + root client |
| `context/providers/MessageByIndexProvider.tsx` | ✅ Uses `useAssistantClient` + `Derived` |
| `context/providers/ThreadListItemProvider.tsx` | ✅ Uses `useAssistantClient` + `Derived` |
| `context/providers/PartByIndexProvider.tsx` | ✅ Uses `useAssistantClient` + `Derived` |
| `context/providers/AttachmentByIndexProvider.tsx` | ✅ Uses `useAssistantClient` + `Derived` |
| `context/providers/TextMessagePartProvider.tsx` | ✅ Uses `useAssistantClient` + root client |

### Provider Pattern (Now Complete)

```typescript
// Root client provider (creates standalone scope)
const aui = useAssistantClient({
  message: MessageClient(props),
});
return <AssistantProvider client={aui}>{children}</AssistantProvider>;

// Derived client provider (references parent scope)
const aui = useAssistantClient({
  message: Derived({
    source: "thread",
    query: { type: "index", index },
    get: (aui) => aui.thread().message({ index }),
  }),
});
return <AssistantProvider client={aui}>{children}</AssistantProvider>;
```

---

## Phase 6: Update Primitives

### 6.1 Pattern

**Before:**
```typescript
const api = useAssistantApi();
const text = useRuntimeState(api.message(), (s) => s.text);
```

**After:**
```typescript
const text = useAssistantState((s) => s.message.text);
// For methods:
const aui = useAssistantClient();
aui.message().reload();
```

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
// Get client (use "aui" not "client")
const aui = useAssistantClient();

// Access state
const messages = useAssistantState((s) => s.thread.messages);
const text = useAssistantState((s) => s.message.content);

// Call methods
aui.thread().append("Hello");
aui.message().reload();
aui.composer().send();

// Listen to events
aui.on("thread.run-start", (payload) => {
  console.log("Run started:", payload.threadId);
});
```
