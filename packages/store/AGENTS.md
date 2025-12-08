# @assistant-ui/store - Agent Documentation

This document provides comprehensive context for AI agents working on the `@assistant-ui/store` package.

## Package Overview

**Purpose:** Low-level, tap-based state management infrastructure for assistant-ui.

**Status:** Pre-release (v0.0.1) - being developed as the foundation for migrating `@assistant-ui/react`.

**Key Insight:** This package provides **generic primitives only** - no domain-specific chat/assistant logic. The react package contains all actual functionality (threads, messages, branching, speech, etc.).

**Relationship to @assistant-ui/react:** The react package has its own similar but different pattern using `tapClient` (returns `{ state, client }`). This store package uses `tapClientResource` (returns `{ state, client }`) with a different architecture. Both packages now use `client` consistently.

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
| **Scope** | Named state container with state, client, and optional meta (source/query) and events |
| **Root Scope** | Top-level scope that owns its state (meta.source = "root") |
| **Derived Scope** | Scope derived from a parent scope |
| **AssistantClient** | Central object providing access to all scopes |
| **ScopeField** | Function returning API + metadata (source/query from meta) |
| **ScopeOutput<K>** | Object type `{ state, client }` returned by resources |

## File Map

```
packages/store/src/
├── index.ts                 # Public exports
├── types.ts                 # Core types: ScopeDefinition, AssistantClient, ScopeOutput, ScopeField
├── AssistantContext.tsx     # React Context provider + useAssistantContextValue
├── useAssistantClient.tsx   # Main hook - Root/DerivedScopeResource processing
├── useAssistantState.tsx    # ProxiedAssistantState + useSyncExternalStore
├── useAssistantEvent.ts     # Event subscription hook (uses client.on)
├── AssistantIf.tsx          # Conditional rendering component
├── EventContext.ts          # EventManager resource + event types (ScopeEventMap, normalizeEventSelector)
├── DerivedScope.ts          # DerivedScope marker resource (returns null, props used by useAssistantClient)
├── ScopeRegistry.ts         # registerAssistantScope for default scope initialization
├── AssistantTapContext.ts   # tapAssistantClient and tapEmitEvent for use in tap resources
├── asStore.ts               # Convert ResourceElement → Store interface (getState, subscribe)
├── tapClientResource.ts        # tapClientResource wrapper + tapClientResources for batches
├── tapLookupResources.ts    # List lookup by index/key (returns { state, client })
├── tapStoreList.ts          # Dynamic list with add/remove (wraps tapLookupResources)
└── utils/splitScopes.ts     # Separate root from derived scopes for useAssistantClient
```

## Key Implementation Details

### 1. ScopeOutput<K> Type (types.ts)

Resources return an object typed as `ScopeOutput<K>` with `state` and `client`:

```typescript
type ScopeOutput<K extends keyof AssistantScopes> = {
  state: AssistantScopes[K]["state"];
  client: AssistantScopes[K]["client"];
};
```

Example:
```typescript
const FooResource = resource((): ScopeOutput<"foo"> => {
  const [state, setState] = tapState({ bar: "hello" });
  return {
    state,
    key: "foo-1",
    client: {
      getState: () => state,  // optional convention
      updateBar: (b) => setState({ bar: b })
    }
  };
});
```

### 2. Module Augmentation Pattern

Scopes are registered via TypeScript declaration merging. Define types separately to avoid duplication:

```typescript
// Define all types separately
type FooState = { bar: string };
type FooApi = {
  getState: () => FooState;  // optional convention
  updateBar: (bar: string) => void;
};
type FooMeta = { source: "fooList"; query: { index: number } | { id: string } };
type FooEvents = {
  "foo.updated": { id: string; newValue: string };
};

declare module "@assistant-ui/store" {
  interface AssistantScopeRegistry {
    // Minimal scope - just state and client (meta and events are optional)
    simple: {
      state: FooState;
      client: FooClient;
    };
    // Full scope with meta and events
    foo: {
      state: FooState;
      client: FooClient;
      meta: FooMeta;
      events: FooEvents;
    };
  }
}
```

**Note:** `meta` and `events` are optional. Use `meta` for derived scopes with source/query tracking; use `events` for scopes that emit events.

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
  │                 │     └─► tapClientResource(element) → { state, client }
  │                 └─► asStore(element) → Store { getState, subscribe }
  │
  ├─► useDerivedScopes(derivedScopes, parentClient)
  │     └─► DerivedScopesResource
  │           └─► tapResources(DerivedScopeResource for each scope)
  │                 ├─► tapEffectEvent(props.get) for fresh callbacks
  │                 └─► Creates ScopeField with source/query metadata
  │
  └─► Merge: { ...baseClient, ...rootFields.scopes, ...derivedFields,
  │            subscribe: rootFields.subscribe,
  │            on: rootFields.on }
```

### 4. tapClientResource Pattern (tapClientResource.ts)

`tapClientResource` wraps a `ResourceElement` to create stable API proxies:

```typescript
tapClientResource(element: ResourceElement<{ state, client }>)
  │
  ├─► tapResource(element) → { state, client }
  ├─► tapRef(value) - store latest value for proxy access
  ├─► tapEffect - update ref.current = value on changes
  ├─► tapMemo([element.type]) - create ReadonlyClientHandler proxy (stable identity)
  │     └─► Proxy intercepts SYMBOL_GET_STATE → returns () => ref.current.state
  │     └─► Proxy intercepts other props → returns ref.current.client[prop]
  └─► tapMemo([state]) → { state, client: proxy }
```

The `ReadonlyClientHandler` proxy:
- Intercepts `SYMBOL_GET_STATE` (internal) to return `() => this.getValue().state`
- Delegates other property access to `this.getValue().client[prop]`
- Creates stable reference that always returns fresh values
- Is immutable (set, defineProperty, deleteProperty return false)

**Note:** `getState` is NOT automatically added to the API. It's an optional convention that users can implement themselves.

Also exports `tapClientResources(map, getElement, deps?)` which wraps multiple elements using an internal `ApiResource`.

### 5. useAssistantState (useAssistantState.tsx)

Uses `useSyncExternalStore` with a `ProxiedAssistantState` that lazily accesses scopes:

```typescript
useAssistantState(selector)
  │
  ├─► useAssistantClient() - get client from context
  ├─► useMemo → ProxiedAssistantState.create(client)
  │     └─► Proxy intercepts prop access → getClientState(client[prop]())
  │
  ├─► useSyncExternalStore(client.subscribe, () => selector(proxiedState))
  │
  └─► Throws if slice instanceof ProxiedAssistantState (entire state returned)
```

**Note:** `useAssistantState` uses an internal `getClientState()` function that accesses state via `SYMBOL_GET_STATE`, not via `getState()`. This allows `getState()` to be optional in user APIs.

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
const FooResource = resource((): ScopeOutput<"foo"> => {
  const [state, setState] = tapState({ id, value: "" });
  const emit = tapEmitEvent();

  const updateValue = (newValue: string) => {
    setState({ ...state, value: newValue });
    emit("foo.updated", { id, newValue });
  };

  return {
    state,
    key: id,
    client: {
      getState: () => state,  // optional convention
      updateValue,
    },
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
| `tapEffect()` | `useEffect` | Ref updates in tapClientResource, subscriptions |
| `tapMemo()` | `useMemo` | API proxy creation, computed values, stable returns |
| `tapRef()` | `useRef` | tapClientResource stores latest value for proxy access |
| `tapEffectEvent()` | `useEffectEvent` | Fresh DerivedScope get callback (always latest closure) |
| `tapResource()` | - | Mount single child resource (used in tapClientResource) |
| `tapResources(map, getElement, deps?)` | - | Mount keyed resource list from record (used in useAssistantClient) |
| `tapInlineResource()` | - | Inline resource without separate component (EventManager) |
| `createResource()` | - | Imperative resource handle with subscribe (asStore) |
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
| `tapClientResource(element)` | Wrap element returning `{ state, client }` with stable proxy |
| `tapStoreList(config)` | Dynamic list with add/remove (returns `{ state, client, add }`) |
| `tapLookupResources(map, getElement, deps?)` | List lookup by index/key (returns `{ state, client }`) |
| `tapEmitEvent()` | Get stable emit function for events (auto-captures client stack) |
| `tapAssistantClient()` | Access client in tap resources |
| `registerAssistantScope(config)` | Register default scope initialization or error |

### Exported Types

| Type | Purpose |
|------|---------|
| `ScopeOutput<K>` | Return type for resources: `{ state, client }` |
| `AssistantClient` | Client type with scope fields + subscribe/on |
| `AssistantScopes` | All registered scopes (from AssistantScopeRegistry) |
| `AssistantState` | State type extracted from all scopes |
| `ClientObject` | Base type for client objects |
| `EventManager` | Event manager type with on/emit methods |

## Common Patterns

### Root Scope Resource

```typescript
const FooResource = resource((): ScopeOutput<"foo"> => {
  const [state, setState] = tapState({ value: "initial" });

  return {
    state,
    client: {
      getState: () => state,  // optional convention
      setValue: (v: string) => setState({ value: v }),
    },
  };
});
```

### List Scope with tapStoreList

```typescript
const FooItemResource = resource(
  ({ initialValue, remove }): ScopeOutput<"foo"> => {
    const [state, setState] = tapState({ id: initialValue.id, text: initialValue.text });
    const emit = tapEmitEvent();

    return {
      state,
      client: {
        getState: () => state,
        updateText: (t) => {
          setState({ ...state, text: t });
          // Each foo emits its own scoped event
          emit("foo.updated", { id: state.id, newValue: t });
        },
        remove,
      },
    };
  }
);

const FooListResource = resource((): ScopeOutput<"fooList"> => {
  const foos = tapStoreList({
    initialValues: [{ id: "1", text: "First" }],
    resource: FooItemResource,
    idGenerator: () => `foo-${Date.now()}`,
  });

  const state = tapMemo(() => ({ foos: foos.state }), [foos.state]);

  return {
    state,
    client: {
      getState: () => state,
      foo: foos.client,
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

### Scoped Event Subscription

Each FooProvider creates its own scoped client. Events subscribed within
that scope will only receive events from that specific foo instance:

```typescript
// Inside a component wrapped by FooProvider
const Foo = () => {
  // Only receives "foo.updated" events from THIS foo, not other foos
  useAssistantEvent("foo.updated", (payload) => {
    console.log(`This foo updated: ${payload.id} -> ${payload.newValue}`);
  });

  const aui = useAssistantClient();
  return <button onClick={() => aui.foo().updateText("new")}>Update</button>;
};
```

The event filtering works because:
1. `tapEmitEvent()` captures the client stack when called
2. `useAssistantEvent` compares the listener's scope client with the event's client stack
3. Only events where the clients match at the appropriate index are forwarded

## getState Convention

**Important:** `getState()` is an **optional convention**, not enforced by the store.

- The store does NOT automatically add `getState` to APIs
- If you want `getState()` available, include it in your `client` type and implement it
- `useAssistantState` uses an internal mechanism (`SYMBOL_GET_STATE`) to access state
- Define types separately to avoid duplicating the state type:

```typescript
type FooState = { bar: string };
type FooApi = {
  getState: () => FooState;  // references FooState, no duplication
  updateBar: (bar: string) => void;
};
```

## Key Invariants

1. **ScopeOutput<K> return type** - All scope resources must return `{ state, client }` with client as a nested object
2. **Selector required** - useAssistantState cannot return entire state object (throws if you try)
3. **Source/query metadata** - Derived scopes must specify source and query in DerivedScope config
4. **Event naming** - Events use `"scope.event-name"` format (e.g., `"foo.updated"`)
5. **Scope imports** - Import scope type files before using resources to ensure module augmentation
6. **tapEmitEvent availability** - Only available inside resources wrapped with AssistantTapContext (root scopes)
7. **Key for lists** - List item resources should provide `key` for efficient lookups
8. **getState is optional** - The store doesn't enforce getState; it's a user convention

## Debug Tips

1. `console.log` in useAssistantClient.tsx line 143-145 shows subscription callbacks
2. ProxiedAssistantState throws if you try to return entire state (line 73-77 in useAssistantState.tsx)
3. tapLookupResources throws with lookup details if not found (line 59-63)
4. tapEmitEvent throws if called outside AssistantTapContext (line 28-30 in AssistantTapContext.ts)
5. tapStoreList.add throws if no id provided and no idGenerator configured

## Migration Path (react → store)

When migrating @assistant-ui/react to use this package:

1. **Define scope types** via module augmentation for all scopes (including events)
2. **Implement resources** returning `ScopeOutput<K>` with `{ state, client }` structure
3. **Emit events** using `tapEmitEvent()` in resources (auto-captures client stack)
4. **Create providers** using DerivedScope pattern
5. **Replace hooks** with useAssistantState/useAssistantEvent
6. **Port capabilities** - branching, speech, attachments as scope features

## Comparison with @assistant-ui/react tap-store

The react package has a similar but different pattern using `tapApi`:

| Feature | @assistant-ui/store | @assistant-ui/react tap-store |
|---------|---------------------|------------------------------|
| Resource return | `{ state, client }` | N/A (tapClient takes object directly) |
| Wrapper function | `tapClientResource(element)` | `tapClient(clientObject, options?)` |
| Wrapper input | ResourceElement returning `{ state, client }` | Object with methods |
| Wrapper output | `{ state, client }` with proxy | `{ state, client }` with proxy |
| Lookup return | `{ state, client }` | `{ state, client }` |
| Client property name | `client` | `client` |
| Type annotation | `ScopeOutput<K>` | Direct type annotations |
| getState | Optional convention | Required in type |

**Key difference:** The react package's `tapClient` takes a client object with methods directly (e.g., `tapClient({ doSomething: () => {} })`), while the store package's `tapClientResource` takes a ResourceElement that returns `{ state, client }` structure.

Files to compare:
- Store: `packages/store/src/tapClientResource.ts`
- React: `packages/react/src/utils/tap-store/tap-client.ts`
- React lookup: `packages/react/src/client/util-hooks/tapLookupResources.ts`
