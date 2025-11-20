# @assistant-ui/store API Specification

## Overview

`@assistant-ui/store` is a React integration layer for tap (Reactive Resources) that provides type-safe, scoped state management through React Context. It uses TypeScript module augmentation to define custom scopes and provides helpers for creating stable, reactive API objects.

## Core Concepts

### Scopes

A **scope** is a type-safe state container with three properties:

- **value**: The API type that consumers interact with (must include a `getState()` method)
- **source**: The parent scope name (or `"root"` for top-level scopes)
- **query**: Lookup parameters used to access this scope from its parent

### ScopeField

A scope field is accessed as a function with metadata:

```typescript
type ScopeField<T> = (() => ScopeValue<T>) & {
  source: string | "root";
  query: Record<string, any>;
};
```

Example usage:

```typescript
const api = aui.foo(); // Call to get API
const source = aui.foo.source; // Access metadata
const query = aui.foo.query; // Access metadata
```

## Module Augmentation

Define custom scopes by augmenting the `AssistantScopes` interface:

```typescript
declare module "@assistant-ui/store" {
  interface AssistantScopes {
    scopeName: {
      value: {
        getState: () => StateType;
        action1: (arg: ArgType) => void;
        action2: () => ResultType;
      };
      source: "parentScopeName" | "root";
      query: QueryType;
    };
  }
}
```

### Scope Definition Properties

#### value

The API object type that consumers will interact with. Must include:

- `getState: () => StateType` - Returns the current state (required for reactivity)
- Additional methods/actions as needed

#### source

The parent scope from which this scope is derived:

- `"root"` - Top-level scope with no parent
- `"parentScopeName"` - Name of parent scope (must match a key in `AssistantScopes`)

#### query

The lookup parameters used to access this scope from its parent:

- `Record<string, never>` - For scopes that don't require lookup parameters
- `{ index: number }` - For index-based lookup
- `{ id: string }` - For ID-based lookup
- Union types like `{ index: number } | { id: string }` for flexible lookup

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
const state = aui.myScope().getState();
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
const parentAui = useAssistantClient();
const derivedClient = useAssistantClient({
  childScope: DerivedScope({
    source: "parent",
    query: { id: "123" },
    get: () => parentAui.parent().child({ id: "123" }),
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

### tapApi

Wraps an API object to make it stable across renders while keeping `getState()` reactive.

#### Signature

```typescript
function tapApi<TApi extends ApiObject & { getState: () => any }>(
  api: TApi,
  options?: { key?: string },
): { key: string | undefined; state: ReturnType<TApi["getState"]>; api: TApi };
```

**Parameters**:

- `api`: API object with `getState()` method and additional actions
- `options.key`: Optional unique identifier for this resource

**Returns**: Object with:

- `key`: The provided key (or undefined)
- `state`: Current state from `getState()`
- `api`: Stable proxy to the API object

**Example**:

```typescript
export const MyResource = resource(({ id }) => {
  const [state, setState] = tapState({ id, value: "initial" });

  const updateValue = (newValue: string) => {
    setState({ ...state, value: newValue });
  };

  return tapApi(
    {
      getState: () => state,
      updateValue,
    },
    { key: id },
  );
});
```

### tapLookupResources

Manages a list of resources with index and key-based lookup capability.

#### Signature

```typescript
function tapLookupResources<TState, TApi extends ApiObject>(
  elements: ResourceElement<{
    key: string | undefined;
    state: TState;
    api: TApi;
  }>[],
): {
  state: TState[];
  api: (lookup: { index: number } | { key: string }) => TApi;
};
```

**Parameters**:

- `elements`: Array of resource elements (typically from resources wrapped with `tapApi`)

**Returns**: Object with:

- `state`: Array of states from all resources
- `api`: Lookup function accepting `{ index: number }` or `{ key: string }`

**Throws**: Error if resource not found for given lookup parameters

**Important**: The API function uses `{ key: string }` for lookups. Consumers should wrap it to rename the key field to their preferred name (e.g., `id`, `toolCallId`).

**Example**:

```typescript
export const ListResource = resource(() => {
  const items = [
    { id: "item-1", initialValue: "First" },
    { id: "item-2", initialValue: "Second" },
  ];

  const lookup = tapLookupResources(
    items.map((item) => ItemResource(item, { key: item.id })),
  );

  return tapApi({
    getState: () => ({ items: lookup.state }),
    // Wrap to rename "key" field to "id"
    item: (selector: { index: number } | { id: string }) => {
      return "id" in selector
        ? lookup.api({ key: selector.id })
        : lookup.api({ index: selector.index });
    },
  }).api;
});

// Usage
const listApi = aui.list();
const firstItem = listApi.item({ index: 0 });
const specificItem = listApi.item({ id: "item-2" });
```

## Type System

### AssistantClient

The main client type providing access to all scopes:

```typescript
type AssistantClient = {
  [K in keyof AssistantScopes]: ScopeField<AssistantScopes[K]>;
};
```

Each property is a `ScopeField` - a function that returns the scope's API, with `source` and `query` metadata attached.

### AssistantScopes

Interface for module augmentation. Define your scopes here:

```typescript
interface AssistantScopes {
  // Augment this interface with your scopes
}
```

### ApiObject

Base type for API objects:

```typescript
interface ApiObject {
  [key: string]: ((...args: any[]) => any) | ApiObject;
}
```

All API objects must be compatible with this type (functions and nested objects only).

## Patterns

### Root Scope Pattern

For top-level scopes that don't depend on other scopes:

```typescript
declare module "@assistant-ui/store" {
  interface AssistantScopes {
    myRoot: {
      value: {
        getState: () => { count: number };
        increment: () => void;
      };
      source: "root";
      query: Record<string, never>;
    };
  }
}

export const MyRootResource = resource(() => {
  const [state, setState] = tapState({ count: 0 });

  return tapApi({
    getState: () => state,
    increment: () => setState({ count: state.count + 1 }),
  });
});

// Usage
const rootClient = useAssistantClient({
  myRoot: MyRootResource(),
});
```

### List Scope Pattern

For managing collections with lookup:

```typescript
declare module "@assistant-ui/store" {
  interface AssistantScopes {
    item: {
      value: {
        getState: () => { id: string; name: string };
        updateName: (name: string) => void;
      };
      source: "itemList";
      query: { index: number } | { id: string };
    };
    itemList: {
      value: {
        getState: () => { items: Array<{ id: string; name: string }> };
        item: (
          lookup: { index: number } | { id: string },
        ) => AssistantScopes["item"]["value"];
      };
      source: "root";
      query: Record<string, never>;
    };
  }
}

export const ItemResource = resource(({ id, initialName }) => {
  const [state, setState] = tapState({ id, name: initialName });

  return tapApi(
    {
      getState: () => state,
      updateName: (name: string) => setState({ ...state, name }),
    },
    { key: id },
  );
});

export const ItemListResource = resource(() => {
  const items = [
    { id: "1", initialName: "First" },
    { id: "2", initialName: "Second" },
  ];

  const lookup = tapLookupResources(
    items.map((item) => ItemResource(item, { key: item.id })),
  );

  return tapApi({
    getState: () => ({ items: lookup.state }),
    // Wrap to rename "key" field to "id"
    item: (selector: { index: number } | { id: string }) => {
      return "id" in selector
        ? lookup.api({ key: selector.id })
        : lookup.api({ index: selector.index });
    },
  }).api;
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
  const parentAui = useAssistantClient();

  const aui = useAssistantClient({
    item: DerivedScope({
      source: "itemList",
      query: { index },
      get: () => parentAui.itemList().item({ index }),
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
  const aui = useAssistantClient();
  const listState = aui.itemList().getState();

  return (
    <>
      {listState.items.map((_, index) => (
        <ItemProvider key={index} index={index}>
          <components.Item />
        </ItemProvider>
      ))}
    </>
  );
};
```

## Best Practices

### 1. Always Use tapApi

Wrap all scope resources with `tapApi` to ensure:

- API stability across renders
- Proper reactivity via `getState()`
- Consistent structure with `{ key, state, api }`

### 2. Provide Keys for List Items

When using `tapApi` for list items, always provide a unique `key`:

```typescript
return tapApi(api, { key: item.id });
```

### 3. Extract .api for List Resources

When returning from list resources using `tapApi`, extract just the `.api`:

```typescript
return tapApi({
  getState: () => ({ items: lookup.state }),
  item: lookup.api,
}).api; // ← Extract .api
```

### 4. Use Module Augmentation Raw

Don't export or import `ScopeDefinition`. Implement scope definitions directly:

```typescript
declare module "@assistant-ui/store" {
  interface AssistantScopes {
    myScope: {
      value: {
        /* ... */
      };
      source: "root";
      query: Record<string, never>;
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
    get: () => parentAui.itemList().item({ index }),
  }),
});
```
