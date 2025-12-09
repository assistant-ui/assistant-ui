# Migration Plan: @assistant-ui/react to use @assistant-ui/store

## Overview

Migrate `@assistant-ui/react` to use `@assistant-ui/store`'s `ClientRegistry` pattern for type-safe, tap-based state management. This removes the duplicated context/store layer in the react package.

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

## Phase 1: Add Store Dependency & Create Type Files

### 1.1 Add dependency to `packages/react/package.json`
```json
"@assistant-ui/store": "workspace:*"
```

### 1.2 Create type files structure
```
packages/react/src/types/scopes/
├── index.ts
├── threads.ts
├── threadListItem.ts
├── thread.ts
├── message.ts
├── part.ts
├── composer.ts
├── attachment.ts
├── tools.ts
└── modelContext.ts
```

### 1.3 Type file pattern

Each file exports: `{Scope}State`, `{Scope}Methods`, `{Scope}Meta` (if derived), `{Scope}Events` (if has events), and `{Scope}ClientSchema`.

Example structure:
```typescript
// types/scopes/thread.ts

// State - copy from client/types/Thread.ts ThreadClientState (without nested states)
export type ThreadState = { ... };

// Methods - copy from client/types/Thread.ts ThreadClientApi (without getState, without nested apis like composer)
export type ThreadMethods = { ... };

// Meta - for derived scopes only
export type ThreadMeta = {
  source: "threads";
  query: { type: "main" };
};

// Events - only if scope emits events
export type ThreadEvents = {
  "thread.run-start": { threadId: string };
  "thread.run-end": { threadId: string };
  "thread.initialize": { threadId: string };
  "thread.model-context-update": { threadId: string };
};

// Combined schema for registry
export type ThreadClientSchema = {
  state: ThreadState;
  methods: ThreadMethods;
  meta: ThreadMeta;
  events: ThreadEvents;
};
```

### 1.4 Create store augmentation

Create `packages/react/src/types/store-augmentation.ts`:
```typescript
import type { ThreadsClientSchema } from "./scopes/threads";
// ... other imports

declare module "@assistant-ui/store" {
  interface ClientRegistry {
    threads: ThreadsClientSchema;
    threadListItem: ThreadListItemClientSchema;
    thread: ThreadClientSchema;
    message: MessageClientSchema;
    part: PartClientSchema;
    composer: ComposerClientSchema;
    attachment: AttachmentClientSchema;
    tools: ToolsClientSchema;
    modelContext: ModelContextClientSchema;
  }
}
```

### 1.5 Import augmentation in index.ts

Add to top of `packages/react/src/index.ts`:
```typescript
import "./types/store-augmentation";
```

---

## Phase 2: Migrate Resources from tapApi to Store Package

### 2.1 Migration pattern

**Before (current pattern using tapApi):**
```typescript
import { tapApi } from "../../utils/tap-store";

export const ThreadClient = resource(({ runtime }) => {
  // ... setup
  return tapApi<ThreadClientApi>({
    getState: () => state,
    append: runtime.append,
    // ...
  });
});
```

**After (store pattern using tapClientResource):**
```typescript
import { tapClientResource, type ClientOutput } from "@assistant-ui/store";

export const ThreadClient = resource(({ runtime }): ClientOutput<"thread"> => {
  // ... setup
  return tapClientResource({
    state,
    methods: {
      append: runtime.append,
      // ... (no getState needed)
    },
  });
});
```

### 2.2 Files to migrate

| Current File | Resource Name |
|--------------|---------------|
| `legacy-runtime/client/ThreadListRuntimeClient.ts` | `ThreadListClient` |
| `legacy-runtime/client/ThreadListItemRuntimeClient.ts` | `ThreadListItemClient` |
| `legacy-runtime/client/ThreadRuntimeClient.ts` | `ThreadClient` |
| `legacy-runtime/client/MessageRuntimeClient.ts` | `MessageClient` |
| `legacy-runtime/client/MessagePartRuntimeClient.ts` | `MessagePartClient` |
| `legacy-runtime/client/ComposerRuntimeClient.ts` | `ComposerClient` |
| `legacy-runtime/client/AttachmentRuntimeClient.ts` | `AttachmentRuntimeClient` |
| `client/Tools.ts` | `Tools` |
| `client/ModelContextClient.ts` | `ModelContext` |

### 2.3 Replace event emission

**Before:**
```typescript
import { tapEvents } from "../../client/EventContext";
const events = tapEvents();
events.emit(`thread.${event}`, { threadId });
```

**After:**
```typescript
import { tapAssistantEmit } from "@assistant-ui/store";
const emit = tapAssistantEmit();
emit("thread.run-start", { threadId });
```

### 2.4 Replace tapLookupResources with tapClientLookup

**Before:**
```typescript
import { tapLookupResources } from "../../client/util-hooks/tapLookupResources";
const messages = tapLookupResources(
  runtimeState.messages.map((m) => [m.id, MessageClientById({ ... })])
);
```

**After:**
```typescript
import { tapClientLookup } from "@assistant-ui/store";
const messages = tapClientLookup(
  Object.fromEntries(runtimeState.messages.map((m) => [m.id, m])),
  (m, id) => MessageClientById({ runtime, id, threadIdRef }),
  [MessageClientById, runtime, threadIdRef],
);
```

---

## Phase 3: Drop Duplicated Context Layer

### 3.1 Replace AssistantApiContext with re-exports

Replace `packages/react/src/context/react/AssistantApiContext.tsx` with:
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

### 3.2 Files to remove

```
context/ReadonlyStore.ts
context/stores/ (entire directory)
context/react/utils/createContextStoreHook.ts
context/react/utils/createContextHook.ts
context/react/utils/useRuntimeState.ts
utils/tap-store/ (entire directory)
client/AssistantClient.ts
client/EventContext.ts
client/util-hooks/tapLookupResources.ts
```

### 3.3 Remove zustand from dependencies

Update `packages/react/package.json` to remove zustand.

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

## Phase 5: Update Providers

### 5.1 Provider pattern

**Before:**
```typescript
const api = useExtendedAssistantApi({
  message: DerivedScope({ ... }),
});
return <AssistantProvider api={api}>{children}</AssistantProvider>;
```

**After:**
```typescript
const aui = useAssistantClient({
  message: Derived({ ... }),
});
return <AssistantProvider client={aui}>{children}</AssistantProvider>;
```

### 5.2 Files to update

- `context/providers/MessageProvider.tsx`
- `context/providers/MessageByIndexProvider.tsx`
- `context/providers/ThreadListItemProvider.tsx`
- `context/providers/PartByIndexProvider.tsx`
- `context/providers/AttachmentByIndexProvider.tsx`

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
