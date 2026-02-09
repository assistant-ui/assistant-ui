# @assistant-ui/store

Tap-based state management with React Context integration.

## Quick Start

```typescript
import { resource, tapState } from "@assistant-ui/tap";
import { useAui, useAuiState, AuiProvider, type ClientOutput } from "@assistant-ui/store";

// 1. Define client type
declare module "@assistant-ui/store" {
  interface ClientRegistry {
    counter: { state: { count: number }; methods: { increment: () => void } };
  }
}

// 2. Create resource
const CounterClient = resource((): ClientOutput<"counter"> => {
  const [state, setState] = tapState({ count: 0 });
  return { state, methods: { increment: () => setState({ count: state.count + 1 }) } };
});

// 3. Use in React
function App() {
  const aui = useAui({ counter: CounterClient() });
  return <AuiProvider value={aui}><Counter /></AuiProvider>;
}

function Counter() {
  const count = useAuiState((s) => s.counter.count);
  const aui = useAui();
  return <button onClick={() => aui.counter().increment()}>{count}</button>;
}
```

## Concepts

**Clients**: Named state containers registered via module augmentation.
```typescript
declare module "@assistant-ui/store" {
  interface ClientRegistry {
    myClient: {
      state: MyState;
      methods: MyMethods;
      meta?: { source: "parent"; query: { id: string } };
      events?: { "myClient.updated": { id: string } };
    };
  }
}
```

**Derived Clients**: Access nested clients from parents.
```typescript
useAui({
  item: Derived({ source: "list", query: { index: 0 }, get: (aui) => aui.list().item({ index: 0 }) }),
});
```

**Events**:
```typescript
const emit = tapAssistantEmit();
emit("myClient.updated", { id: "123" });

useAuiEvent("myClient.updated", (p) => console.log(p.id));
```

## API

| Hook/Component | Description |
|----------------|-------------|
| `useAui()` | Get client from context |
| `useAui(clients)` | Create/extend client |
| `useAuiState(selector)` | Subscribe to state |
| `useAuiEvent(event, cb)` | Subscribe to events |
| `AuiProvider` | Provide client to tree |
| `AuiIf` | Conditional rendering |

| Tap Utility | Description |
|-------------|-------------|
| `tapAssistantClientRef()` | Access client ref in resources |
| `tapAssistantEmit()` | Emit events from resources |
| `tapClientResource(element)` | Wrap resource for event scoping (1:1 mappings) |
| `tapClientLookup(map, fn, deps)` | Lookup by `{index}` or `{key}` |
| `tapClientList(config)` | Dynamic list with add/remove |
| `attachDefaultPeers(resource, peers)` | Attach default peers |

| Type | Description |
|------|-------------|
| `ClientOutput<K>` | Resource return type: `{ state, methods }` |
| `ClientRegistry` | Module augmentation interface |
| `AssistantClient` | Full client type |
