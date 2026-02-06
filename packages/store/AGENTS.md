# @assistant-ui/store - Agent Guide

Low-level, tap-based state management for assistant-ui. Generic primitives only - no chat/assistant domain logic.

## Architecture

Built on `@assistant-ui/tap`. Client-based state containers with type-safe definitions via module augmentation. React Context integration. Event system for cross-client communication.

## File Map

```
src/
├── index.ts                         # Public exports
├── types/client.ts                  # ClientRegistry, ClientOutput, AssistantClient
├── types/events.ts                  # Event types
├── useAui.tsx                       # Main hook
├── useAuiState.tsx                  # State subscription
├── useAuiEvent.ts                   # Event subscription
├── AuiIf.tsx                        # Conditional render
├── Derived.ts                       # Derived client marker
├── attachDefaultPeers.ts            # Default peer attachment
├── tapClientResource.ts             # Client proxy wrapper for event scoping
├── tapClientLookup.ts               # Index/key lookup: {state[], get()}
├── tapClientList.ts                 # Dynamic lists: {state[], get(), add()}
└── utils/                           # Internal implementation
```

## API by Audience

### End Users
```
useAui()         useAuiState(selector)
useAuiEvent(event,cb)  AuiProvider  AuiIf  Derived()
```

### Library Authors
Above plus:
```
tapAssistantClientRef()      tapAssistantEmit()
tapClientResource(element)   tapClientLookup(getElements, deps)
tapClientList({ initialValues, getKey, resource })
attachDefaultPeers()         ClientOutput<K>  ClientRegistry
```

## Patterns

### Client Definition
```typescript
declare module "@assistant-ui/store" {
  interface ClientRegistry {
    foo: { methods: { getState: () => { bar: string }; update: (b: string) => void } };
  }
}
```

### Resource
```typescript
const FooClient = resource((): ClientOutput<"foo"> => {
  const [state, setState] = tapState({ bar: "" });
  return { getState: () => state, update: (b) => setState({ bar: b }) };
});
```

### List Resource
```typescript
// Item resource receives { key, getInitialData, remove }
const ItemClient = resource((props: tapClientList.ResourceProps<Data>): ClientOutput<"item"> => {
  const data = props.getInitialData();
  const [state, setState] = tapState({ id: props.key, value: data.value });
  return { getState: () => state, update, remove: props.remove };
});

// List using tapClientList
const list = tapClientList({
  initialValues: [{ id: "1", value: "foo" }],
  getKey: (d) => d.id,
  resource: ItemClient,
});
// Returns: { state: State[], get: (lookup) => Methods, add: (data) => void }
```

### useAui Flow
```
splitClients → gather default peers → mount root clients → create derived accessors → merge
```

## Invariants

1. Resources return methods (including `getState()`) as `ClientOutput<K>`
2. `useAuiState` requires selector (throws if returning whole state)
3. Event names: `"clientName.eventName"`
4. Derived needs `source`, `query`, `get` (or `getMeta`)
5. Default peers: first definition wins

## Design

**Progressive disclosure**: Simple hooks for users, tap utilities for library authors, internals in utils/.

**Terminology**: "Client" (like React Query), "methods" (not "actions"), "meta" (optional source/query), "events" (optional).
