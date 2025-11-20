# @assistant-ui/store

Tap-based state management for assistant-ui with React Context integration.

## Overview

The store package provides a bridge between tap Resources and React Components via React Context. It implements a scope-based system where you can define custom scopes using TypeScript module augmentation.

## Key Concepts

### Scopes

A **scope** defines a piece of state in your application. Each scope has:

- **value**: The state type (e.g., `{ bar: string }`)
- **source**: Where this scope comes from (`"root"` for top-level, or name of parent scope)
- **query**: Parameters needed to access this scope (e.g., `{ type: "index", index: number }`)

### Module Augmentation

Define custom scopes by extending the `AssistantScopes` interface:

```typescript
import type { ScopeDefinition } from "@assistant-ui/store";

declare module "@assistant-ui/store" {
  interface AssistantScopes {
    foo: ScopeDefinition<{ bar: string }, "root", {}>;
  }
}
```

## Usage

### 1. Define a Scope

```typescript
// foo-scope.ts
import { resource, tapState } from "@assistant-ui/tap";
import { tapApi } from "@assistant-ui/store";

// Define the scope type via module augmentation
// Implement the scope definition raw (no need to import ScopeDefinition)
declare module "@assistant-ui/store" {
  interface AssistantScopes {
    foo: {
      value: {
        getState: () => { bar: string };
        updateBar: (newBar: string) => void;
      };
      source: "root";
      query: Record<string, never>;
    };
  }
}

// Create the resource
export const FooResource = resource(() => {
  const [state, setState] = tapState<{ bar: string }>({ bar: "Hello, World!" });

  const updateBar = (newBar: string) => {
    setState({ bar: newBar });
  };

  // Use tapApi to wrap the API for stability and reactivity
  return tapApi({
    getState: () => state,
    updateBar,
  });
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

  // Access the state
  const fooState = client.foo.getState();
  console.log(fooState.bar); // "Hello, World!"

  // Call actions
  const handleClick = () => {
    client.foo.updateBar("New value!");
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
    foo: FooResource,
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
  const fooState = client.foo.getState();

  return <div>{fooState.bar}</div>;
}
```

### 4. Derived Scopes

Create scopes that depend on other scopes:

```typescript
import { DerivedScope } from "@assistant-ui/store";

function MyComponent() {
  const client = useAssistantClient({
    foo: FooResource,
    message: DerivedScope({
      source: "thread",
      query: { type: "index", index: 0 },
      get: () => messageApi,
    }),
  });

  return <div>{client.message.getState().content}</div>;
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
  foo: FooResource,
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
  query: { type: "index", index: 0 },
  get: () => messageApi,
});
```

## Advanced: List Management with tapLookupResources

For managing lists of items, use `tapLookupResources`:

```typescript
import { tapLookupResources, tapApi } from "@assistant-ui/store";

// Define item resource
const FooItemResource = resource(
  ({ id, initialBar }: { id: string; initialBar: string }) => {
    const [state, setState] = tapState({ id, bar: initialBar });

    return {
      key: id,
      state,
      api: tapApi({
        getState: () => state,
        updateBar: (newBar: string) => setState({ ...state, bar: newBar }),
      }),
    };
  },
);

// Define list resource
const FooListResource = resource(() => {
  const items = [
    { id: "foo-1", initialBar: "First" },
    { id: "foo-2", initialBar: "Second" },
  ];

  const foos = tapLookupResources(
    items.map((item) => FooItemResource(item, { key: item.id })),
  );

  return tapApi({
    getState: () => ({ foos: foos.state }),
    // Wrap to rename "key" field to "id"
    foo: (lookup: { index: number } | { id: string }) => {
      return "id" in lookup
        ? foos.api({ key: lookup.id })
        : foos.api({ index: lookup.index });
    },
  }).api;
});
```

### Provider Pattern

Create providers to scope access to specific list items:

```typescript
const FooProvider = ({ index, children }) => {
  const parentAui = useAssistantClient();

  const aui = useAssistantClient({
    foo: DerivedScope({
      source: "fooList",
      query: { index },
      get: () => parentAui.fooList().foo({ index }),
    }),
  });

  return <AssistantProvider client={aui}>{children}</AssistantProvider>;
};

// Render list
const FooList = ({ components }) => {
  const aui = useAssistantClient();
  const { foos } = aui.fooList().getState();

  return (
    <div>
      {foos.map((_, index) => (
        <FooProvider key={index} index={index}>
          <components.Foo />
        </FooProvider>
      ))}
    </div>
  );
};
```

## Examples

See the [store-example](../store-example) Next.js app for a complete working example including:

- Basic scope definition with `tapApi`
- List management with `tapLookupResources`
- Provider pattern for scoped access
- Component composition
- Tailwind CSS styling

## How It Works

The store is implemented using tap resources:

1. Each scope is a tap resource that manages its own state
2. `useAssistantClient` creates a resource that composes all provided scopes
3. The React Context provides the client to child components
4. Scopes can be extended/overridden by calling `useAssistantClient` with new scope definitions

This design allows for:

- ✅ Type-safe scope definitions via module augmentation
- ✅ Automatic cleanup of resources when components unmount
- ✅ Composable scope hierarchy (root → derived scopes)
- ✅ Full TypeScript inference for state and APIs
- ✅ Zero runtime overhead for scopes that aren't used
