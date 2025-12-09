# @assistant-ui/store - Agent Documentation

This document provides comprehensive context for AI agents working on the `@assistant-ui/store` package.

## Package Overview

**Purpose:** Low-level, tap-based state management infrastructure for assistant-ui.

**Status:** Pre-release (v0.0.1) - being developed as the foundation for migrating `@assistant-ui/react`.

**Key Insight:** This package provides **generic primitives only** - no domain-specific chat/assistant logic. The react package contains all actual functionality (threads, messages, branching, speech, etc.).

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
| **ScopeMeta** | Combines source and query as a typed pair |

## File Map

```
packages/store/src/
├── index.ts                 # Public exports
├── types.ts                 # Core types: ScopeDefinition, AssistantClient, AssistantState
├── AssistantContext.tsx     # React Context provider + useAssistantContextValue
├── useAssistantClient.tsx   # Main hook - Root/DerivedScopeResource processing
├── useAssistantState.tsx    # ProxiedAssistantState + useSyncExternalStore
├── useAssistantEvent.ts     # Event subscription hook
├── AssistantIf.tsx          # Conditional rendering component
├── EventContext.ts          # EventManager resource + event types
├── DerivedScope.ts          # DerivedScope helper (just returns config)
├── ScopeRegistry.ts         # registerAssistantScope for defaults
├── StoreContext.ts          # Internal tap context (events + parent)
├── asStore.ts               # Convert ResourceElement → Store interface
├── tapApi.ts                # ReadonlyApiHandler proxy for stable APIs
├── tapLookupResources.ts    # List lookup by index/key
├── tapStoreList.ts          # Dynamic list with add/remove
└── utils/splitScopes.ts     # Separate root from derived scopes
```

## Key Implementation Details

### 1. Scope Type Definition (types.ts)

```typescript
type ScopeMeta<TSource, TQuery> = {
  source: TSource;     // Parent scope name or "root"
  query: TQuery;       // Lookup parameters
};

type ScopeDefinition<TValue, TMeta, TEvents> = {
  value: TValue;       // API type (must have getState())
  meta: TMeta;         // Source/query as a pair (enables discriminated unions)
  events: TEvents;     // Events this scope can emit
};
```

### 2. Module Augmentation Pattern

Scopes are registered via TypeScript declaration merging. The `meta` field combines `source` and `query` as a pair, enabling discriminated unions when a scope can have multiple sources:

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
    // Derived scope with multiple sources (discriminated union)
    bar: {
      value: { getState: () => State };
      meta:
        | { source: "fooList"; query: { index: number } }
        | { source: "barList"; query: { id: string } };
      events: Record<string, never>;
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
  │           ├─► Creates EventManager
  │           ├─► withStoreContextProvider({ events, parent })
  │           └─► tapResources(RootScopeResource for each scope)
  │                 └─► asStore(element) → Store interface
  │
  ├─► useDerivedScopes(derivedScopes, parent)
  │     └─► DerivedScopesResource
  │           └─► tapResources(DerivedScopeResource for each scope)
  │                 └─► tapEffectEvent(get) for fresh callbacks
  │
  └─► Merge: { ...baseClient, ...rootFields, ...derivedFields }
```

### 4. tapApi Pattern (tapApi.ts)

Creates stable API proxy while keeping getState() reactive:

```typescript
tapApi(api, options?)
  │
  ├─► tapRef(api) - store latest api
  ├─► tapEffect - update ref on changes
  ├─► tapMemo - create ReadonlyApiHandler proxy (stable)
  └─► Return: { key, state, api: proxy }
```

The proxy delegates all property access to `ref.current`, so API stays stable but always returns fresh values.

### 5. useAssistantState (useAssistantState.tsx)

Uses `useSyncExternalStore` with a `ProxiedAssistantState` that lazily accesses scopes:

```typescript
useAssistantState(selector)
  │
  ├─► ProxiedAssistantState.create(client)
  │     └─► Proxy that intercepts property access
  │           └─► client[prop]().getState()
  │
  └─► useSyncExternalStore(client.subscribe, () => selector(proxied))
```

**Limitation:** Cannot return entire state - must use selector that extracts specific values.

### 6. Event System (EventContext.ts)

**Events are defined per-scope** in the `AssistantScopeRegistry` augmentation. The event map is automatically derived from all scope definitions.

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

// EventManager handles pub/sub
EventManager = resource(() => {
  const listeners = new Map<event, Set<callback>>();
  return {
    on(event, callback) → unsubscribe,
    emit(event, payload) → queueMicrotask → notify listeners + wildcards
  };
});
```

**Emitting events from resources:**
```typescript
const FooResource = resource(({ id }) => {
  const { emit } = tapStoreContext();

  const updateValue = (newValue: string) => {
    setState({ value: newValue });
    emit("foo.updated", { id, newValue });
  };
});
```

**Subscribing to events in components:**
```typescript
// Subscribe to specific event
useAssistantEvent("foo.updated", (payload) => {
  console.log(`Foo ${payload.id} updated to ${payload.newValue}`);
});

// Subscribe to all events (wildcard)
useAssistantEvent("*", (data) => {
  console.log(`Event: ${data.event}`, data.payload);
});
```

Events use dot notation: `"scope.event-name"` → scope: "scope", event: "event-name"

## tap Primitives Reference

The store is built on `@assistant-ui/tap`:

| tap | React | Usage in store |
|-----|-------|----------------|
| `resource()` | Component | Creates scope resources |
| `tapState()` | `useState` | Scope state |
| `tapEffect()` | `useEffect` | Ref updates, subscriptions |
| `tapMemo()` | `useMemo` | API proxy, computed values |
| `tapRef()` | `useRef` | tapApi ref storage |
| `tapEffectEvent()` | `useEffectEvent` | Fresh DerivedScope get callback |
| `tapResource()` | - | Mount single child resource |
| `tapResources()` | - | Mount keyed resource list |
| `tapInlineResource()` | - | Inline resource (EventManager) |
| `createResource()` | - | Imperative resource handle (asStore) |
| `createContext/tapContext` | Context | StoreContext |
| `withContextProvider` | Provider | StoreContext provider |

## Public API Summary

### Hooks

| Hook | Purpose |
|------|---------|
| `useAssistantClient()` | Get client from context |
| `useAssistantClient(scopes)` | Create/extend client with scopes |
| `useAssistantState(selector)` | Subscribe to state with selector |
| `useAssistantEvent(selector, callback)` | Subscribe to events |

### Components

| Component | Purpose |
|-----------|---------|
| `AssistantProvider` | Provide client via context |
| `AssistantIf` | Conditional rendering based on state |

### Resource Utilities

| Utility | Purpose |
|---------|---------|
| `tapApi(api, opts?)` | Create stable API with reactive getState |
| `DerivedScope(config)` | Define derived scope with source/query |
| `tapStoreList(config)` | Dynamic list with add/remove |
| `tapLookupResources(elements)` | List lookup by index/key |
| `tapStoreContext()` | Access events/parent in tap resources |
| `registerAssistantScope(config)` | Register default scope initialization |

## Common Patterns

### Root Scope Resource

```typescript
const FooResource = resource(() => {
  const [state, setState] = tapState({ value: "initial" });

  return tapApi({
    getState: () => state,
    setValue: (v: string) => setState({ value: v }),
  });
});
```

### List Scope with tapStoreList

```typescript
const FooListResource = resource(() => {
  const foos = tapStoreList({
    initialValues: [{ id: "1", text: "First" }],
    resource: FooItemResource,
    idGenerator: () => `foo-${Date.now()}`,
  });

  return tapApi({
    getState: () => ({ foos: foos.state }),
    foo: foos.api,
    addFoo: foos.add,
  });
});
```

### Derived Scope Provider

```typescript
const FooProvider = ({ index, children }) => {
  const client = useAssistantClient({
    foo: DerivedScope({
      source: "fooList",
      query: { index },
      get: (client) => client.fooList().foo({ index }),
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
- `lib/store/foo-store.tsx` - FooItemResource, FooListResource, FooProvider, FooList with event emission
- `lib/example-app.tsx` - Full usage with useAssistantClient, useAssistantState, useAssistantEvent, and EventLog component

### Key Invariants

1. **tapApi required** - All scope resources should use tapApi for stable APIs
2. **Selector required** - useAssistantState cannot return entire state object
3. **Source/query metadata** - Derived scopes must specify source and query
4. **Event naming** - Events use `"scope.event-name"` format
5. **Scope imports** - Import scope type files before using resources (e.g., `import "./foo-scope"` at top of store files)

### Debug Tips

1. `console.log` in useAssistantClient.tsx:119 shows subscription callbacks
2. ProxiedAssistantState throws if you try to return entire state
3. tapLookupResources throws with lookup details if not found

## Migration Path (react → store)

When migrating @assistant-ui/react to use this package:

1. **Define scope types** via module augmentation for all 9 scopes (including events per scope)
2. **Implement resources** using tap primitives (replace runtime classes)
3. **Emit events** using `tapStoreContext().emit()` in resources
4. **Create providers** using DerivedScope pattern
5. **Replace hooks** with useAssistantState/useAssistantEvent
6. **Port capabilities** - branching, speech, attachments as scope features
