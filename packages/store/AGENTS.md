# @assistant-ui/store - Agent Documentation

This document provides comprehensive context for AI agents working on the `@assistant-ui/store` package.

## Package Overview

**Purpose:** Low-level, tap-based state management infrastructure for assistant-ui.

**Status:** Pre-release (v0.0.1) - being developed as the foundation for migrating `@assistant-ui/react`.

**Key Insight:** This package provides **generic primitives only** - no domain-specific chat/assistant logic. The react package contains all actual functionality (threads, messages, branching, speech, etc.).

**Relationship to @assistant-ui/react:** The react package has its own similar but different pattern using `tapApi` (returns `{ key, state, api }`). This store package uses `tapApiResource` (returns `{ key, state, api }`) with a different architecture. Both packages now use `api` consistently.

## Architecture

```
@assistant-ui/store
├── Built on @assistant-ui/tap (React-hooks-like reactive primitives)
├── Scope-based state containers with type-safe definitions
├── Module augmentation for extensibility
└── React Context integration
```

### Core Abstractions

| Concept | Description |
|---------|-------------|
| **Scope** | Named state container with value, meta (source/query), and events |
| **Root Scope** | Top-level scope that owns its state (meta.source = "root") |
| **Derived Scope** | Scope derived from a parent scope |
| **AssistantClient** | Central object providing access to all scopes |
| **ScopeField** | Function returning API + metadata (source/query from meta) |
| **ScopeApi<K>** | Object type `{ state, key?, api }` returned by resources |

## File Map

```
packages/store/src/
├── index.ts                 # Public exports
├── types.ts                 # Core types: ScopeDefinition, AssistantClient, ScopeApi, ScopeField
├── AssistantContext.tsx     # React Context provider + useAssistantContextValue
├── useAssistantClient.tsx   # Main hook - Root/DerivedScopeResource processing
├── useAssistantState.tsx    # ProxiedAssistantState + useSyncExternalStore
├── useAssistantEvent.ts     # Event subscription hook (uses client.on)
├── AssistantIf.tsx          # Conditional rendering component
├── EventContext.ts          # EventManager resource + event types (ScopeEventMap, normalizeEventSelector)
├── DerivedScope.ts          # DerivedScope marker resource (returns null, props used by useAssistantClient)
├── ScopeRegistry.ts         # registerAssistantScope for default scope initialization
├── StoreContext.ts          # Internal tap context (events + parent client access via tapStoreContext)
├── asStore.ts               # Convert ResourceElement → Store interface (getState, subscribe, flushSync)
├── tapApiResource.ts        # tapApiResource wrapper + tapApiResources for batches
├── tapLookupResources.ts    # List lookup by index/key (returns { state, api })
├── tapStoreList.ts          # Dynamic list with add/remove (wraps tapLookupResources)
└── utils/splitScopes.ts     # Separate root from derived scopes for useAssistantClient
```

## Key Implementation Details

### 1. ScopeApi<K> Type (types.ts)

Resources return an object typed as `ScopeApi<K>` with `state`, optional `key`, and `api`:

```typescript
type ScopeApi<K extends keyof AssistantScopes> = {
  key?: string;
  state: ReturnType<AssistantScopes[K]["value"]["getState"]>;
  api: Omit<AssistantScopes[K]["value"], "getState">;
};
```

Example:
```typescript
const FooResource = resource((): ScopeApi<"foo"> => {
  const [state, setState] = tapState({ bar: "hello" });
  return {
    state,
    key: "foo-1",
    api: {
      updateBar: (b) => setState({ bar: b })
    }
  };
});
```

### 2. Module Augmentation Pattern

Scopes are registered via TypeScript declaration merging. The `meta` field combines `source` and `query` as a pair:

```typescript
declare module "@assistant-ui/store" {
  interface AssistantScopeRegistry {
    // Simple root scope
    fooList: {
      value: { getState: () => State; addFoo: () => void };
      meta: { source: "root"; query: Record<string, never> };
      events: {
        "fooList.added": { id: string };
      };
    };
    // Derived scope with single source
    foo: {
      value: { getState: () => State; update: () => void };
      meta: { source: "fooList"; query: { index: number } | { id: string } };
      events: {
        "foo.updated": { id: string; newValue: string };
      };
    };
  }
}
```

### 3. useAssistantClient Flow (useAssistantClient.tsx)

```
useAssistantClient(scopes)
  │
  ├─► splitScopes(scopes)
  │     ├─► rootScopes (element.type !== DerivedScope)
  │     └─► derivedScopes (element.type === DerivedScope)
  │
  ├─► useRootScopes(rootScopes, parent)
  │     └─► RootScopesResource
  │           ├─► Creates EventManager (tapInlineResource)
  │           ├─► Creates client.on() handler for event subscriptions
  │           └─► tapResources(RootScopeResource for each scope)
  │                 ├─► RootScopeStoreResource
  │                 │     ├─► withStoreContextProvider({ events, parent })
  │                 │     └─► tapApiResource(element) → { key, state, api }
  │                 └─► asStore(element) → Store { getState, subscribe, flushSync }
  │
  ├─► useDerivedScopes(derivedScopes, parentClient)
  │     └─► DerivedScopesResource
  │           └─► tapResources(DerivedScopeResource for each scope)
  │                 ├─► tapEffectEvent(props.get) for fresh callbacks
  │                 └─► Creates ScopeField with source/query metadata
  │
  └─► Merge: { ...baseClient, ...rootFields.scopes, ...derivedFields,
  │            subscribe: rootFields.subscribe, flushSync: rootFields.flushSync,
  │            on: rootFields.on }
```

### 4. tapApiResource Pattern (tapApiResource.ts)

`tapApiResource` wraps a `ResourceElement` to create stable API proxies:

```typescript
tapApiResource(element: ResourceElement<{ state, api, key? }>)
  │
  ├─► tapResource(element) → { state, key?, api }
  ├─► tapRef(value) - store latest value for proxy access
  ├─► tapEffect - update ref.current = value on changes
  ├─► tapMemo([element.type]) - create ReadonlyApiHandler proxy (stable identity)
  │     └─► Proxy intercepts "getState" → returns () => ref.current.state
  │     └─► Proxy intercepts other props → returns ref.current.api[prop]
  └─► tapMemo([state, key]) → { key, state, api: proxy }
```

The `ReadonlyApiHandler` proxy:
- Intercepts `getState` property to return `() => this.getValue().state`
- Delegates other property access to `this.getValue().api[prop]`
- Creates stable reference that always returns fresh values
- Is immutable (set, defineProperty, deleteProperty return false)

Also exports `tapApiResources(elements[])` which wraps multiple elements using an internal `ApiResource`.

### 5. useAssistantState (useAssistantState.tsx)

Uses `useSyncExternalStore` with a `ProxiedAssistantState` that lazily accesses scopes:

```typescript
useAssistantState(selector)
  │
  ├─► useAssistantClient() - get client from context
  ├─► useMemo → ProxiedAssistantState.create(client)
  │     └─► Proxy intercepts prop access → client[prop]().getState()
  │
  ├─► useSyncExternalStore(client.subscribe, () => selector(proxiedState))
  │
  └─► Throws if slice instanceof ProxiedAssistantState (entire state returned)
```

**Limitation:** Cannot return entire state - must use selector that extracts specific values. Will throw error if you try to return the proxied state directly.

### 6. Event System (EventContext.ts)

**Events are defined per-scope** in the `AssistantScopeRegistry` augmentation.

```typescript
// Events are defined in scope registry
interface AssistantScopeRegistry {
  foo: {
    // ...
    events: {
      "foo.updated": { id: string; newValue: string };
      "foo.removed": { id: string };
    };
  };
}

// EventManager handles pub/sub (created per root scope group)
EventManager = resource(() => {
  const listeners = new Map<event, Set<callback>>();
  return tapMemo(() => ({
    on(event, callback) → unsubscribe,
    emit(event, payload) → queueMicrotask → notify listeners + wildcards ("*")
  }), []);
});
```

**Key event types:**
- `AssistantEvent` - Union of all event names (e.g., `"foo.updated" | "foo.removed"`)
- `AssistantEventSelector<TEvent>` - String event name OR `{ scope, event }` object
- `ScopeEventMap` - Derived from all scope `events` properties via intersection
- Wildcard `"*"` receives `{ event, payload }` for all events

**Emitting events from resources:**
```typescript
const FooResource = resource((): ScopeApi<"foo"> => {
  const { events } = tapStoreContext();
  const [state, setState] = tapState({ id, value: "" });

  const updateValue = (newValue: string) => {
    setState({ ...state, value: newValue });
    events.emit("foo.updated", { id, newValue });
  };

  return {
    state,
    key: id,
    api: { updateValue },
  };
});
```

**Subscribing to events in components (useAssistantEvent.ts):**
```typescript
// Uses client.on() internally, wraps callback with useEffectEvent
useAssistantEvent("foo.updated", (payload) => {
  console.log(`Foo ${payload.id} updated to ${payload.newValue}`);
});

// Can also use object selector
useAssistantEvent({ scope: "foo", event: "foo.updated" }, callback);
```

## tap Primitives Reference

The store is built on `@assistant-ui/tap`:

| tap | React Equivalent | Usage in store |
|-----|------------------|----------------|
| `resource()` | Component | Creates scope resources (FooResource, FooListResource) |
| `tapState()` | `useState` | Scope state management |
| `tapEffect()` | `useEffect` | Ref updates in tapApiResource, subscriptions |
| `tapMemo()` | `useMemo` | API proxy creation, computed values, stable returns |
| `tapRef()` | `useRef` | tapApiResource stores latest value for proxy access |
| `tapEffectEvent()` | `useEffectEvent` | Fresh DerivedScope get callback (always latest closure) |
| `tapResource()` | - | Mount single child resource (used in tapApiResource) |
| `tapResources()` | - | Mount keyed resource list (used in useAssistantClient) |
| `tapInlineResource()` | - | Inline resource without separate component (EventManager) |
| `createResource()` | - | Imperative resource handle with subscribe/flushSync (asStore) |
| `createContext/tapContext` | Context | StoreContext for events + parent access |
| `withContextProvider` | Provider | StoreContext provider wrapping scope resources |

## Public API Summary

### Hooks

| Hook | Purpose |
|------|---------|
| `useAssistantClient()` | Get client from context (returns AssistantClient) |
| `useAssistantClient(scopes)` | Create/extend client with scopes (merges with context client) |
| `useAssistantState(selector)` | Subscribe to state with selector (uses useSyncExternalStore) |
| `useAssistantEvent(selector, callback)` | Subscribe to events (wraps callback with useEffectEvent) |

### Components

| Component | Purpose |
|-----------|---------|
| `AssistantProvider` | Provide client via React Context |
| `AssistantIf` | Conditional rendering based on state selector |

### Resource Utilities

| Utility | Purpose |
|---------|---------|
| `DerivedScope(config)` | Define derived scope with source/query/get |
| `tapApiResource(element)` | Wrap element returning `{ state, api, key? }` with stable proxy |
| `tapStoreList(config)` | Dynamic list with add/remove (returns `{ state, api, add }`) |
| `tapLookupResources(elements)` | List lookup by index/key (returns `{ state, api }`) |
| `tapStoreContext()` | Access `{ events, parent }` in tap resources |
| `registerAssistantScope(config)` | Register default scope initialization or error |

### Exported Types

| Type | Purpose |
|------|---------|
| `ScopeApi<K>` | Return type for resources: `{ state, key?, api }` |
| `AssistantClient` | Client type with scope fields + subscribe/flushSync/on |
| `AssistantScopes` | All registered scopes (from AssistantScopeRegistry) |
| `AssistantState` | State type extracted from all scopes |
| `ApiObject` | Base type for api objects |
| `EventManager` | Event manager type with on/emit methods |
 
## Common Patterns

### Root Scope Resource

```typescript
const FooResource = resource((): ScopeApi<"foo"> => {
  const [state, setState] = tapState({ value: "initial" });

  return {
    state,
    api: {
      setValue: (v: string) => setState({ value: v }),
    },
  };
});
```

### List Scope with tapStoreList

```typescript
const FooItemResource = resource(
  ({ initialValue, remove }): ScopeApi<"foo"> => {
    const [state, setState] = tapState({ id: initialValue.id, text: initialValue.text });
    return {
      state,
      key: initialValue.id,
      api: {
        updateText: (t) => setState({ ...state, text: t }),
        remove,
      },
    };
  }
);

const FooListResource = resource((): ScopeApi<"fooList"> => {
  const foos = tapStoreList({
    initialValues: [{ id: "1", text: "First" }],
    resource: FooItemResource,
    idGenerator: () => `foo-${Date.now()}`,
  });

  const state = tapMemo(() => ({ foos: foos.state }), [foos.state]);

  return {
    state,
    api: {
      foo: foos.api,
      addFoo: foos.add,
    },
  };
});
```

### Derived Scope Provider

```typescript
const FooProvider = ({ index, children }) => {
  const client = useAssistantClient({
    foo: DerivedScope({
      source: "fooList",
      query: { index },
      get: (aui) => aui.fooList().foo({ index }),
    }),
  });
  return <AssistantProvider client={client}>{children}</AssistantProvider>;
};
```

### List Component

```typescript
const FooList = ({ components: { Foo } }) => {
  const length = useAssistantState(({ fooList }) => fooList.foos.length);
  return Array.from({ length }, (_, i) => (
    <FooProvider key={i} index={i}><Foo /></FooProvider>
  ));
};
```

## Comparison with @assistant-ui/react

Features the store lacks (react package has):

| Category | React Package Features |
|----------|------------------------|
| **Scopes** | threads, threadListItem, thread, message, composer, part, attachment, tools, modelContext |
| **Thread** | isEmpty, isRunning, capabilities, messages, suggestions, speech, import/export |
| **Message** | branchNumber, branchCount, isCopied, isHovering, parts, switchToBranch |
| **Composer** | text, role, attachments, runConfig, isEditing, send, cancel |
| **Systems** | Branching (MessageRepository), Speech/TTS, Attachments, Tool UI, Feedback |
| **Events** | thread.run-start/end, thread.initialize, composer.send, etc. |
| **Runtime** | useLocalRuntime, useExternalStoreRuntime, RuntimeCapabilities |
| **UI** | ThreadViewport (Zustand), 10+ provider components |

## Development Notes

### Example App

`examples/store-example/` demonstrates:
- `lib/store/foo-scope.ts` - Scope type definition with events + module augmentation
- `lib/store/foo-store.tsx` - FooItemResource, FooListResource, FooProvider, FooList using ScopeApi<K>
- `lib/example-app.tsx` - Full usage with useAssistantClient, useAssistantState, useAssistantEvent

### Key Invariants

1. **ScopeApi<K> return type** - All scope resources must return `{ state, key?, api }` with api as a nested object
2. **Selector required** - useAssistantState cannot return entire state object (throws if you try)
3. **Source/query metadata** - Derived scopes must specify source and query in DerivedScope config
4. **Event naming** - Events use `"scope.event-name"` format (e.g., `"foo.updated"`)
5. **Scope imports** - Import scope type files before using resources to ensure module augmentation
6. **tapStoreContext availability** - Only available inside resources wrapped with StoreContext (root scopes)
7. **Key for lists** - List item resources should provide `key` for efficient lookups

### Debug Tips

1. `console.log` in useAssistantClient.tsx line 143-145 shows subscription callbacks
2. ProxiedAssistantState throws if you try to return entire state (line 73-77 in useAssistantState.tsx)
3. tapLookupResources throws with lookup details if not found (line 59-63)
4. tapStoreContext throws if called outside a store context (line 25-26 in StoreContext.ts)
5. tapStoreList.add throws if no id provided and no idGenerator configured

## Migration Path (react → store)

When migrating @assistant-ui/react to use this package:

1. **Define scope types** via module augmentation for all scopes (including events)
2. **Implement resources** returning `ScopeApi<K>` with `{ state, key?, api }` structure
3. **Emit events** using `tapStoreContext().events.emit()` in resources
4. **Create providers** using DerivedScope pattern
5. **Replace hooks** with useAssistantState/useAssistantEvent
6. **Port capabilities** - branching, speech, attachments as scope features

## Comparison with @assistant-ui/react tap-store

The react package has a similar but different pattern using `tapApi`:

| Feature | @assistant-ui/store | @assistant-ui/react tap-store |
|---------|---------------------|------------------------------|
| Resource return | `{ state, key?, api }` | N/A (tapApi takes object directly) |
| Wrapper function | `tapApiResource(element)` | `tapApi(apiObject, options?)` |
| Wrapper input | ResourceElement returning `{ state, api, key? }` | Object with `getState` + methods |
| Wrapper output | `{ key, state, api }` with proxy | `{ key, state, api }` with proxy |
| Lookup return | `{ state, api }` | `{ state, api }` |
| API property name | `api` | `api` |
| Type annotation | `ScopeApi<K>` | Direct type annotations |

**Key difference:** The react package's `tapApi` takes an API object with `getState` and action methods directly (e.g., `tapApi({ getState: () => state, doSomething: () => {} })`), while the store package's `tapApiResource` takes a ResourceElement that returns `{ state, key?, api }` structure.

Files to compare:
- Store: `packages/store/src/tapApiResource.ts`
- React: `packages/react/src/utils/tap-store/tap-api.ts`
- React lookup: `packages/react/src/client/util-hooks/tapLookupResources.ts`
