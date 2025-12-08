# @assistant-ui/store API Specification

## Overview

`@assistant-ui/store` is a React integration layer for tap (Reactive Resources) that provides type-safe, scoped state management through React Context. It uses TypeScript module augmentation to define custom scopes and provides helpers for creating stable, reactive API objects.

This package provides generic primitives only - no domain-specific chat/assistant logic. See `@assistant-ui/react` for the actual assistant-ui functionality.

## Core Concepts

### Scopes

A **scope** is a type-safe state container with four properties:

- **state**: The state type for this scope
- **client**: The client type that consumers interact with (methods)
- **source**: The parent scope name (or `"root"` for top-level scopes)
- **query**: Lookup parameters used to access this scope from its parent

### ScopeOutput<K>

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

### ScopeField

A scope field is accessed as a function with metadata:

```typescript
type ScopeField<T> = (() => T["client"]) & {
  source: string | "root";
  query: Record<string, any>;
};
```

Example usage:

```typescript
const fooClient = aui.foo(); // Call to get client
const source = aui.foo.source; // Access metadata
const query = aui.foo.query; // Access metadata
```

## Module Augmentation

Define custom scopes by augmenting the `AssistantScopeRegistry` interface.

**Recommended pattern:** Define types separately to avoid duplication:

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
    // Minimal scope - just state and client
    simple: {
      state: FooState;
      client: FooApi;
    };
    // Full scope with meta and events
    foo: {
      state: FooState;
      client: FooApi;
      meta: FooMeta;
      events: FooEvents;
    };
  }
}
```

**Note:** `meta` and `events` are optional fields:
- Omit `meta` for scopes that don't need source/query tracking
- Omit `events` for scopes that don't emit events

### Scope Definition Properties

#### state

The state type for this scope. This is the data that `useAssistantState` can select from.

#### client

The client object type that consumers will interact with. Can include any methods.

**Note:** `getState()` is an optional convention. If you want it available, include it in your client type and implement it in your resource.

#### meta (optional)

The `meta` field is optional. Include it only for derived scopes that need source/query tracking.

##### meta.source

The parent scope from which this scope is derived:

- `"root"` - Top-level scope with no parent
- `"parentScopeName"` - Name of parent scope (must match a key in `AssistantScopeRegistry`)

##### meta.query

The lookup parameters used to access this scope from its parent:

- `Record<string, never>` - For scopes that don't require lookup parameters
- `{ index: number }` - For index-based lookup
- `{ id: string }` - For ID-based lookup
- Union types like `{ index: number } | { id: string }` for flexible lookup

#### events (optional)

The `events` field is optional. Include it only for scopes that emit events.

```typescript
events: {
  "scopeName.eventName": { /* payload type */ };
};
```

Event names follow the convention `"scopeName.eventName"` (e.g., `"foo.updated"`).

## API Reference

### useAssistantClient

The primary hook for accessing and creating assistant clients.

#### Signature 1: Access Context

```typescript
function useAssistantClient(): AssistantClient;
```

Retrieves the current `AssistantClient` from React Context.

**Returns**: `AssistantClient` with all defined scopes as `ScopeField` functions. If called outside an `AssistantProvider`, returns an empty client (all scope access will fail).

**Example**:

```typescript
const aui = useAssistantClient();
const state = aui.myScope().getState();  // if getState is in your client
aui.myScope().someAction();
```

#### Signature 2: Create/Extend Client

```typescript
function useAssistantClient(scopes: ScopesInput): AssistantClient;
```

Creates a new `AssistantClient` with the specified scopes, optionally extending a parent client.

**Parameters**:

- `scopes`: Object mapping scope names to resource elements. Supports multiple scopes.

**Returns**: New `AssistantClient` instance with the provided scopes (merged with context client if available)

**Example**:

```typescript
// Create root client with multiple scopes
const rootClient = useAssistantClient({
  myScope: MyResource(),
  anotherScope: AnotherResource(),
});

// Derived client extending parent using DerivedScope
const derivedClient = useAssistantClient({
  childScope: DerivedScope({
    source: "parent",
    query: { id: "123" },
    get: (aui) => aui.parent().child({ id: "123" }),
  }),
});
```

### AssistantProvider

React Context provider for making an `AssistantClient` available to child components.

#### Props

```typescript
interface AssistantProviderProps {
  client: AssistantClient;
  children: React.ReactNode;
}
```

**Example**:

```typescript
<AssistantProvider client={rootClient}>
  <YourApp />
</AssistantProvider>
```

### tapLookupResources

Manages a list of resources with index and key-based lookup capability.
Uses `tapClientResources` internally to create stable API proxies for each element.

#### Signature

```typescript
function tapLookupResources<TState, TApi extends ClientObject, T, K extends string | number>(
  map: Record<K, T>,
  getElement: (t: T, key: K) => ResourceElement<ScopeOutputOf<TState, TApi>>,
  getElementDeps?: any[],
): {
  state: TState[];
  client: (lookup: { index: number } | { key: K }) => TApi;
};
```

**Parameters**:

- `map`: Record/object where keys identify each resource instance
- `getElement`: Function receiving value and key, returning a ResourceElement with `{ state, client }`
- `getElementDeps`: Optional dependency array for memoizing the getElement function

**Returns**: Object with:

- `state`: Array of states from all resources (in iteration order)
- `client`: Lookup function accepting `{ index: number }` or `{ key: K }`

**Throws**: Error with lookup details if resource not found for given parameters

**Important**: The lookup function uses `{ key: K }` for key-based lookups. Consumers should wrap it to rename the key field to their preferred name (e.g., `id`, `toolCallId`).

**Example**:

```typescript
const FooItemResource = resource(
  ({ initialValue, remove }): ScopeOutput<"foo"> => {
    const [state, setState] = tapState({ id: initialValue.id, bar: initialValue.bar });
    return {
      state,
        // Key used for lookup
      client: { getState: () => state, updateBar, remove },
    };
  }
);

const FooListResource = resource((): ScopeOutput<"fooList"> => {
  const itemsMap = {
    "item-1": { id: "item-1", bar: "First" },
    "item-2": { id: "item-2", bar: "Second" },
  };

  const lookup = tapLookupResources(
    itemsMap,
    (item) => FooItemResource({ initialValue: item, remove: () => {} }),
  );

  const state = tapMemo(() => ({ items: lookup.state }), [lookup.state]);

  return {
    state,
    client: {
      getState: () => state,
      // Wrap to rename "key" field to "id" for consumer API
      item: (selector: { index: number } | { id: string }) => {
        return "id" in selector
          ? lookup.client({ key: selector.id })
          : lookup.client({ index: selector.index });
      },
    },
  };
});
```

### tapStoreList

Higher-level helper for managing dynamic lists with add/remove functionality.
Uses `tapLookupResources` internally and manages the list state with `tapState`.

#### Signature

```typescript
function tapStoreList<TProps extends { id: string }, TState, TApi extends ClientObject>(
  config: TapStoreListConfig<TProps, TState, TApi>,
): {
  state: TState[];
  client: (lookup: { index: number } | { id: string }) => TApi;
  add: (id?: string) => void;
};
```

**Config properties**:

- `initialValues`: Array of initial item props (must have `id` field)
- `resource`: Resource function receiving `{ initialValue, remove }` and returning `{ state, client }`
- `idGenerator`: Optional function to generate IDs for new items

**Returns**: Object with:

- `state`: Array of states from all resources
- `client`: Lookup function accepting `{ index: number }` or `{ id: string }` (note: uses `id` not `key`)
- `add`: Function to add new items (uses idGenerator if no id provided)

**Throws**: Error if `add()` called without id and no idGenerator configured

**Note**: Unlike `tapLookupResources` which uses `{ key: string }`, `tapStoreList` uses `{ id: string }` for lookups (it translates internally).

**Example**:

```typescript
const foos = tapStoreList({
  initialValues: [
    { id: "foo-1", initialBar: "First" },
    { id: "foo-2", initialBar: "Second" },
  ],
  resource: FooItemResource,
  idGenerator: () => `foo-${Date.now()}`,
});

// Access state
const allFoos = foos.state;

// Lookup (uses { id } not { key })
const firstFoo = foos.client({ index: 0 });
const byId = foos.client({ id: "foo-1" });

// Add new item
foos.add(); // Uses idGenerator
foos.add("custom-id"); // Uses provided id
```

## Type System

### ScopeOutput<K>

The object type that resources return:

```typescript
type ScopeOutput<K extends keyof AssistantScopes> = {
  
  state: AssistantScopes[K]["state"];
  client: AssistantScopes[K]["client"];
};
```

### AssistantClient

The main client type providing access to all scopes:

```typescript
type AssistantClient = {
  [K in keyof AssistantScopes]: ScopeField<AssistantScopes[K]>;
} & {
  subscribe(listener: () => void): Unsubscribe;
  on<TEvent extends AssistantEvent>(
    selector: AssistantEventSelector<TEvent>,
    callback: AssistantEventCallback<TEvent>,
  ): Unsubscribe;
};
```

Each scope property is a `ScopeField` - a function that returns the scope's API, with `source` and `query` metadata attached. The client also provides:

- `subscribe`: Subscribe to state changes across all scopes
- `on`: Subscribe to events (used by `useAssistantEvent` internally)

### AssistantScopeRegistry

Interface for module augmentation. Define your scopes here:

```typescript
interface AssistantScopeRegistry {
  // Augment this interface with your scopes
}
```

### ClientObject

Base type for client objects:

```typescript
interface ClientObject {
  [key: string]: (...args: any[]) => any;
}
```

All client objects must be compatible with this type (functions only).

## Patterns

### Root Scope Pattern

For top-level scopes that don't depend on other scopes:

```typescript
type MyRootState = { count: number };
type MyRootApi = {
  getState: () => MyRootState;
  increment: () => void;
};

declare module "@assistant-ui/store" {
  interface AssistantScopeRegistry {
    // meta and events are optional for simple scopes
    myRoot: {
      state: MyRootState;
      client: MyRootApi;
    };
  }
}

export const MyRootResource = resource((): ScopeOutput<"myRoot"> => {
  const [state, setState] = tapState({ count: 0 });

  return {
    state,
    client: {
      getState: () => state,
      increment: () => setState({ count: state.count + 1 }),
    },
  };
});

// Usage
const rootClient = useAssistantClient({
  myRoot: MyRootResource(),
});
```

### List Scope Pattern

For managing collections with lookup:

```typescript
type ItemState = { id: string; name: string };
type ItemQuery = { index: number } | { id: string };
type ItemApi = {
  getState: () => ItemState;
  updateName: (name: string) => void;
  remove: () => void;
};

type ItemListState = { items: ItemState[] };
type ItemListApi = {
  getState: () => ItemListState;
  item: (lookup: ItemQuery) => ItemApi;
  addItem: (id?: string) => void;
};

declare module "@assistant-ui/store" {
  interface AssistantScopeRegistry {
    // Derived scope - meta is needed for source/query tracking
    item: {
      state: ItemState;
      client: ItemApi;
      meta: { source: "itemList"; query: ItemQuery };
    };
    // Root scope - meta and events are optional
    itemList: {
      state: ItemListState;
      client: ItemListApi;
    };
  }
}

export const ItemResource = resource(
  ({ initialValue: { id, initialName }, remove }): ScopeOutput<"item"> => {
    const [state, setState] = tapState({ id, name: initialName });

    return {
      state,
      
      client: {
        getState: () => state,
        updateName: (name: string) => setState({ ...state, name }),
        remove,
      },
    };
  }
);

export const ItemListResource = resource((): ScopeOutput<"itemList"> => {
  const items = tapStoreList({
    initialValues: [
      { id: "1", initialName: "First" },
      { id: "2", initialName: "Second" },
    ],
    resource: ItemResource,
    idGenerator: () => `item-${Date.now()}`,
  });

  const state = tapMemo(() => ({ items: items.state }), [items.state]);

  return {
    state,
    client: {
      getState: () => state,
      item: items.client,
      addItem: items.add,
    },
  };
});
```

### Provider Pattern

For scoped access to specific list items:

```typescript
export const ItemProvider = ({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) => {
  const aui = useAssistantClient({
    item: DerivedScope({
      source: "itemList",
      query: { index },
      get: (aui) => aui.itemList().item({ index }),
    }),
  });

  return <AssistantProvider client={aui}>{children}</AssistantProvider>;
};

// Usage
<ItemProvider index={0}>
  <ItemComponent /> {/* Can access aui.item() */}
</ItemProvider>
```

### Mapping Component Pattern

For rendering lists with scoped providers:

```typescript
export const ItemList = ({
  components
}: {
  components: { Item: React.ComponentType }
}) => {
  const listState = useAssistantState(({ itemList }) => itemList.items.length);

  return (
    <>
      {Array.from({ length: listState }, (_, index) => (
        <ItemProvider key={index} index={index}>
          <components.Item />
        </ItemProvider>
      ))}
    </>
  );
};
```

## Best Practices

### 1. Use ScopeOutput<K> Return Type

Annotate resource return types with `ScopeOutput<K>` for type safety:

```typescript
const MyResource = resource((): ScopeOutput<"myScope"> => {
  // ...
  return {
    state,
    key,
    client: { action1, action2 },
  };
});
```

### 2. Define Types Separately

To avoid duplicating state types in both `state` and `client.getState`, define types separately:

```typescript
type FooState = { bar: string };
type FooApi = {
  getState: () => FooState;  // references FooState
  updateBar: (bar: string) => void;
};

declare module "@assistant-ui/store" {
  interface AssistantScopeRegistry {
    foo: {
      state: FooState;
      client: FooApi;
      // ...
    };
  }
}
```

### 3. Provide Keys for List Items

When creating list item resources, always provide a unique `key`:

```typescript
return { state,  client: { ... } };
```

### 4. Use Module Augmentation for Type Definitions

Don't export or import `ScopeDefinition`. Implement scope definitions directly:

```typescript
declare module "@assistant-ui/store" {
  interface AssistantScopeRegistry {
    // Only state and client are required; meta and events are optional
    myScope: {
      state: { /* ... */ };
      client: { /* ... */ };
    };
  }
}
```

### 5. Separate Store from UI

Keep store logic (scopes, resources, providers) separate from presentation components:

- Store logic: Type definitions, resources, minimal mapping components
- UI logic: Styled components, layout, user interactions

### 6. Use DerivedScope for Scoped Access

When accessing nested scopes (like list items), use `DerivedScope`:

```typescript
const aui = useAssistantClient({
  item: DerivedScope({
    source: "itemList",
    query: { index },
    get: (aui) => aui.itemList().item({ index }),
  }),
});
```

### 7. Use tapMemo for Computed State

When composing state from multiple sources, use `tapMemo`:

```typescript
const state = tapMemo(() => ({
  items: lookup.state,
  count: lookup.state.length,
}), [lookup.state]);
```

### 8. Register Scopes for Error Handling

Use `registerAssistantScope` to provide helpful error messages when scopes aren't configured:

```typescript
registerAssistantScope({
  name: "myScope",
  defaultInitialize: { error: "MyScope is not configured" },
});
```

### 9. Emit Events via tapEmitEvent

When emitting events from resources, use `tapEmitEvent()` to get a stable emit function that automatically captures the client stack:

```typescript
const MyResource = resource((): ScopeOutput<"myScope"> => {
  const emit = tapEmitEvent();

  const doSomething = () => {
    // ... do work ...
    emit("myScope.updated", { id: "123" });
  };

  return { state, client: { doSomething } };
});
```

The `tapEmitEvent()` function:
- Returns a stable function reference (wrapped with `tapEffectEvent`)
- Automatically captures the current client stack at call time
- Events are filtered based on client hierarchy when subscribed to with `client.on()` or `useAssistantEvent`
