# @assistant-ui/store Specification

React integration for tap. Type-safe client-based state via module augmentation.

## Types

### ClientRegistry
```typescript
declare module "@assistant-ui/store" {
  interface ClientRegistry {
    name: {
      state: StateType;
      methods: MethodsType;
      meta?: { source: ClientNames; query: QueryType };
      events?: { "name.event": PayloadType };
    };
  }
}
```

### Core Types
```typescript
type ClientOutput<K> = { state: ClientSchemas[K]["state"]; methods: ClientSchemas[K]["methods"] };
type ClientOutputOf<TState, TMethods> = { state: TState; methods: TMethods };
type ClientMethods = { [key: string]: (...args: any[]) => any };
type AssistantClientAccessor<K> = (() => Methods<K>) & ({ source; query } | { source: "root"; query: {} } | { source: null; query: null });
type AssistantClient = { [K]: AssistantClientAccessor<K>; subscribe(cb): Unsubscribe; on(selector, cb): Unsubscribe };
type AssistantState = { [K]: ClientSchemas[K]["state"] };
```

## API

### useAssistantClient
```typescript
useAssistantClient(): AssistantClient;
useAssistantClient(clients: { [K]?: ClientElement<K> | DerivedElement<K> }): AssistantClient;
```
Flow: splitClients → gather default peers → mount root clients → create derived accessors → merge with parent.

### useAssistantState
```typescript
useAssistantState<T>(selector: (state: AssistantState) => T): T;
```
`useSyncExternalStore` with proxied state. **Throws** if selector returns proxy (must return specific value).

### useAssistantEvent
```typescript
useAssistantEvent<E>(selector: E | { scope: EventScope<E>; event: E }, callback: (payload) => void): void;
```
Selectors: `"client.event"` | `{ scope: "parent", event }` | `{ scope: "*", event }`. Wildcard `"*"` receives all.

### AssistantProvider / AssistantIf
```typescript
<AssistantProvider client={client}>{children}</AssistantProvider>
<AssistantIf condition={(state) => boolean}>{children}</AssistantIf>
```

### Derived
```typescript
Derived<K>({ source, query, get: (client) => methods });
Derived<K>({ getMeta: (client) => { source, query }, get });
```
Returns marker element. `get` uses `tapEffectEvent` - always calls latest closure.

### attachDefaultPeers
```typescript
attachDefaultPeers(resource, { [K]: ClientElement<K> | DerivedElement<K> }): void;
```
Applied if scope not in parent, user input, or previous peers. First wins; throws on duplicate attach.

### tapAssistantClientRef / tapAssistantEmit
```typescript
tapAssistantClientRef(): { current: AssistantClient };
tapAssistantEmit(): <E>(event: E, payload) => void;  // Stable via tapEffectEvent
```

### tapClientResource
```typescript
tapClientResource(element: ResourceElement<ClientOutputOf<TState, TMethods>>): ClientOutputOf<TState, TMethods>;
```
Wraps resource element to create stable client proxy. Adds client to stack for event scoping. Use for 1:1 client mappings.

### tapClientLookup
```typescript
tapClientLookup<TState, TMethods, M extends Record<string|number|symbol, any>>(
  map: M,
  getElement: (t: M[keyof M], key: keyof M) => ResourceElement<ClientOutputOf<TState, TMethods>>,
  getElementDeps: any[]
): { state: TState[]; get: (lookup: { index: number } | { key: keyof M }) => TMethods };
```
Wraps each element with `tapClientResource`. Throws on lookup miss.

### tapClientList
```typescript
tapClientList<TData, TState, TMethods extends ClientMethods>({
  initialValues: TData[];
  getKey: (data: TData) => string;
  resource: ContravariantResource<ClientOutputOf<TState, TMethods>, ResourceProps<TData>>;
}): { state: TState[]; get: (lookup: { index: number } | { key: string }) => TMethods; add: (data: TData) => void };

type ResourceProps<TData> = { key: string; getInitialData: () => TData; remove: () => void };
```
Wraps tapClientLookup. `getInitialData` may only be called once. Throws on duplicate key add.

## Events

```typescript
type AssistantEventName = keyof ClientEventMap | "*";
type AssistantEventScope<E> = "*" | EventSource<E> | AncestorsOf<EventSource<E>>;
type AssistantEventSelector<E> = E | { scope: Scope<E>; event: E };
```
Flow: `tapAssistantEmit` captures client stack → `emit` queues via microtask → NotificationManager notifies → scope filtering.

## Implementation

| Component | Behavior |
|-----------|----------|
| **tapClientResource** | Mounts element → stable proxy via `tapMemo` → delegates to ref → `SYMBOL_GET_OUTPUT` for internal access |
| **ProxiedState** | Proxy intercepts `state.foo` → `aui.foo()` → `SYMBOL_GET_OUTPUT` |
| **Client Stack** | Context stack per level. Emit captures stack. Listeners filter by matching stack |
| **NotificationManager** | Handles events (`on`/`emit`) and state subscriptions (`subscribe`/`notifySubscribers`) |
| **splitClients** | Separate root/derived → gather `getDefaultPeers` → filter by existence |

## Design

| Audience | API Surface |
|----------|-------------|
| Users | `useAssistantClient`, `useAssistantState`, `useAssistantEvent`, `AssistantProvider`, `AssistantIf`, `Derived` |
| Authors | Above + `tap*`, `attachDefaultPeers`, `ClientOutput`, `ClientRegistry` |
| Internal | `utils/*` |

**Terminology**: Client (React Query pattern), methods (not actions), meta (optional source/query), events (optional).

## Invariants

1. `ClientRegistry` must have ≥1 client (compile error otherwise)
2. Resources return `{ state, methods }` matching `ClientOutput<K>`
3. Events: `"clientName.eventName"` format
4. `meta.source` must be valid `ClientNames`
5. `useAssistantState` selector cannot return whole state
6. Default peers: first definition wins, no override
