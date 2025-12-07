# @assistant-ui/store

Tap-based state management for assistant-ui with React Context integration.

## Overview

The store package provides a bridge between tap Resources and React Components via React Context. It implements a scope-based system where you can define custom scopes using TypeScript module augmentation.

## Key Concepts

### Scopes

A **scope** defines a piece of state in your application. Each scope has:

- **state**: The state type for this scope
- **api**: The API type (methods that operate on the state)
- **source**: Where this scope comes from (`"root"` for top-level, or name of parent scope)
- **query**: Parameters needed to access this scope (e.g., `{ index: number }`)

### ScopeOutput<K>

Resources return an object typed as `ScopeOutput<K>` with `state`, optional `key`, and `api`:

```typescript
const FooResource = resource((): ScopeOutput<"foo"> => {
  const [state, setState] = tapState({ bar: "hello" });
  return {
    state,
    key: "foo-1",
    api: {
      getState: () => state,  // optional convention
      updateBar: (b) => setState({ bar: b })
    }
  };
});
```

### Module Augmentation

Define custom scopes by extending the `AssistantScopeRegistry` interface:

```typescript
// Define all types separately
type FooState = { bar: string };
type FooApi = {
  getState: () => FooState;  // optional convention
  updateBar: (newBar: string) => void;
};
type FooMeta = { source: "fooList"; query: { index: number } };
type FooEvents = {
  "foo.updated": { id: string; newValue: string };
};

declare module "@assistant-ui/store" {
  interface AssistantScopeRegistry {
    // Minimal scope - just state and api (meta and events are optional)
    simple: {
      state: FooState;
      api: FooApi;
    };
    // Full scope with all fields
    foo: {
      state: FooState;
      api: FooApi;
      meta: FooMeta;
      events: FooEvents;
    };
  }
}
```

**Note:** `meta` and `events` are optional. Only include them if your scope needs source/query metadata or emits events.

## Usage

### 1. Define a Scope

```typescript
// foo-scope.ts
import { resource, tapState } from "@assistant-ui/tap";
import { registerAssistantScope, type ScopeOutput } from "@assistant-ui/store";

// Define types separately to avoid duplication
type FooState = { bar: string };
type FooApi = {
  getState: () => FooState;
  updateBar: (newBar: string) => void;
};

// Define the scope type via module augmentation
// Note: meta and events are optional
declare module "@assistant-ui/store" {
  interface AssistantScopeRegistry {
    foo: {
      state: FooState;
      api: FooApi;
    };
  }
}

registerAssistantScope({ name: "foo", defaultInitialize: { error: "Foo not configured" } });

// Create the resource - returns { state, key?, api }
export const FooResource = resource((): ScopeOutput<"foo"> => {
  const [state, setState] = tapState<FooState>({ bar: "Hello, World!" });

  const updateBar = (newBar: string) => {
    setState({ bar: newBar });
  };

  return {
    state,
    api: {
      getState: () => state,
      updateBar,
    },
  };
});
```

### 2. Use in React Component

```typescript
import { useAssistantClient } from "@assistant-ui/store";
import { FooResource } from "./foo-scope";

function MyComponent() {
  // Create a client with the foo scope
  const client = useAssistantClient({
    foo: FooResource(),
  });

  // Access the state (if getState is in your api)
  const fooState = client.foo().getState();
  console.log(fooState.bar); // "Hello, World!"

  // Call methods
  const handleClick = () => {
    client.foo().updateBar("New value!");
  };

  return <div onClick={handleClick}>{fooState.bar}</div>;
}
```

### 3. Use with Provider (Optional)

```typescript
import { AssistantProvider, useAssistantClient } from "@assistant-ui/store";
import { FooResource } from "./foo-scope";

function App() {
  const client = useAssistantClient({
    foo: FooResource(),
  });

  return (
    <AssistantProvider client={client}>
      <MyComponent />
    </AssistantProvider>
  );
}

function MyComponent() {
  // Access client from context
  const client = useAssistantClient();
  const fooState = client.foo().getState();

  return <div>{fooState.bar}</div>;
}
```

### 4. Derived Scopes

Create scopes that depend on other scopes:

```typescript
import { DerivedScope } from "@assistant-ui/store";

function MyComponent() {
  const client = useAssistantClient({
    foo: FooResource(),
    message: DerivedScope({
      source: "thread",
      query: { index: 0 },
      get: (aui) => aui.thread().message({ index: 0 }),
    }),
  });

  return <div>{client.message().getState().content}</div>;
}
```

## API

### `useAssistantClient()`

Returns the AssistantClient from context.

```typescript
const client = useAssistantClient();
```

### `useAssistantClient(scopes)`

Creates a new AssistantClient with the provided scopes, merging with any client from context.

```typescript
const client = useAssistantClient({
  foo: FooResource(),
});
```

### `useAssistantState(selector)`

Subscribes to state changes with a selector. Must return a specific value, not the entire state.

```typescript
const barValue = useAssistantState(({ foo }) => foo.bar);
```

### `useAssistantEvent(selector, callback)`

Subscribes to events emitted by scopes.

```typescript
useAssistantEvent("foo.updated", (payload) => {
  console.log(`Foo updated: ${payload.newValue}`);
});
```

### `AssistantProvider`

Provides an AssistantClient via React Context.

```typescript
<AssistantProvider client={client}>
  {children}
</AssistantProvider>
```

### `DerivedScope(config)`

Creates a derived scope field that memoizes based on source and query.

```typescript
DerivedScope({
  source: "thread",
  query: { index: 0 },
  get: (aui) => aui.thread().message({ index: 0 }),
});
```

### `tapStoreContext()`

Access the store context inside tap resources (provides `events` and `parent` client).

```typescript
const { events } = tapStoreContext();
events.emit("foo.updated", { id: "123", newValue: "hello" });
```

## Advanced: List Management with tapStoreList

For managing dynamic lists of items:

```typescript
import { resource, tapState, tapMemo } from "@assistant-ui/tap";
import { tapStoreList, tapStoreContext, type ScopeOutput } from "@assistant-ui/store";

// Define item resource - returns { state, key?, api }
const FooItemResource = resource(
  ({ initialValue: { id, initialBar }, remove }): ScopeOutput<"foo"> => {
    const { events } = tapStoreContext();
    const [state, setState] = tapState({ id, bar: initialBar });

    const updateBar = (newBar: string) => {
      setState({ ...state, bar: newBar });
      events.emit("foo.updated", { id, newValue: newBar });
    };

    return {
      state,
      key: id,
      api: {
        getState: () => state,
        updateBar,
        remove,
      },
    };
  },
);

// Define list resource
const FooListResource = resource((): ScopeOutput<"fooList"> => {
  const { events } = tapStoreContext();

  const foos = tapStoreList({
    initialValues: [
      { id: "foo-1", initialBar: "First" },
      { id: "foo-2", initialBar: "Second" },
    ],
    resource: FooItemResource,
    idGenerator: () => `foo-${Date.now()}`,
  });

  const addFoo = (id?: string) => {
    foos.add(id);  // Uses idGenerator if id not provided
  };

  const state = tapMemo(() => ({ foos: foos.state }), [foos.state]);

  return {
    state,
    api: {
      getState: () => state,
      foo: foos.api,
      addFoo,
    },
  };
});
```

### Provider Pattern

Create providers to scope access to specific list items:

```typescript
const FooProvider = ({ index, children }) => {
  const aui = useAssistantClient({
    foo: DerivedScope({
      source: "fooList",
      query: { index },
      get: (aui) => aui.fooList().foo({ index }),
    }),
  });

  return <AssistantProvider client={aui}>{children}</AssistantProvider>;
};

// Render list
const FooList = ({ components }) => {
  const listLength = useAssistantState(({ fooList }) => fooList.foos.length);

  return (
    <>
      {Array.from({ length: listLength }, (_, index) => (
        <FooProvider key={index} index={index}>
          <components.Foo />
        </FooProvider>
      ))}
    </>
  );
};
```

## Examples

See the [store-example](../../examples/store-example) Next.js app for a complete working example including:

- Basic scope definition with `ScopeOutput<K>`
- List management with `tapStoreList`
- Provider pattern for scoped access
- Component composition
- Tailwind CSS styling

## How It Works

The store is implemented using tap resources:

1. Each scope is a tap resource that returns `{ state, key?, api }`
2. Resources are wrapped with `tapApiResource` to create stable API proxies
3. `useAssistantClient` creates a resource that composes all provided scopes
4. Root scopes are wrapped with a store context providing `events` and `parent` access
5. The React Context provides the client to child components
6. Scopes can be extended/overridden by calling `useAssistantClient` with new scope definitions
7. Events are emitted via `tapStoreContext().events.emit()` and subscribed via `useAssistantEvent`

This design allows for:

- Type-safe scope definitions via module augmentation
- Automatic cleanup of resources when components unmount
- Composable scope hierarchy (root → derived scopes)
- Full TypeScript inference for state and APIs
- Zero runtime overhead for scopes that aren't used
- Decoupled event-driven communication between scopes

## getState Convention

The `getState()` method is an **optional convention** - the store does not enforce it. If you want `getState()` available in your API, include it in your `api` type and implement it in your resource:

```typescript
type FooApi = {
  getState: () => FooState;  // optional - add if you want it
  updateBar: (bar: string) => void;
};

// In resource:
return {
  state,
  api: {
    getState: () => state,  // implement it yourself
    updateBar,
  },
};
```

The internal `useAssistantState` hook accesses state through an internal mechanism and does not require `getState()` to be defined.
