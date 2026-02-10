# @assistant-ui/store Specification

React integration for tap. Type-safe client-based state via module augmentation.

## Types

### ScopeRegistry
```typescript
declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    name: {
      methods: MethodsType; // must include getState(): StateType
      meta?: { source: ClientNames; query: QueryType };
      events?: { "name.event": PayloadType };
    };
  }
}
```

### Core Types
```typescript
type ClientOutput<K> = ClientSchemas[K]["methods"] & ClientMethods;
type ClientMethods = { [key: string]: (...args: any[]) => any };
type AssistantClientAccessor<K> = (() => Methods<K>) & ({ source; query } | { source: "root"; query: {} } | { source: null; query: null });
type AssistantClient = { [K]: AssistantClientAccessor<K>; subscribe(cb): Unsubscribe; on(selector, cb): Unsubscribe };
type AssistantState = { [K]: ReturnType<ClientSchemas[K]["methods"]["getState"]> };
```

## API

### useAui
```typescript
useAui(): AssistantClient;
useAui(clients: { [K]?: ClientElement<K> | DerivedElement<K> }): AssistantClient;
```
Flow: splitClients → apply transformScopes → mount root clients → create derived accessors → merge with parent.

### useAuiState
```typescript
useAuiState<T>(selector: (state: AssistantState) => T): T;
```
`useSyncExternalStore` with proxied state. **Throws** if selector returns proxy (must return specific value).

### useAuiEvent
```typescript
useAuiEvent<E>(selector: E | { scope: EventScope<E>; event: E }, callback: (payload) => void): void;
```
Selectors: `"client.event"` | `{ scope: "parent", event }` | `{ scope: "*", event }`. Wildcard `"*"` receives all.

### AuiProvider / AuiIf
```typescript
<AuiProvider value={aui}>{children}</AuiProvider>
<AuiIf condition={(state) => boolean}>{children}</AuiIf>
```

### Derived
```typescript
Derived<K>({ source, query, get: (client) => methods });
Derived<K>({ getMeta: (client) => { source, query }, get });
```
Returns marker element. `get` uses `tapEffectEvent` - always calls latest closure.

### attachTransformScopes
```typescript
attachTransformScopes(resource, (scopes, parent) => newScopes): void;
```
Attaches a function that receives the current scopes config and the parent `AssistantClient`, and returns a new scopes config. The transform can inspect `parent[key].source` to check whether a scope exists in parent context (`null` = not provided). Transforms are collected from root elements and run iteratively (new root elements added by transforms are also processed). Single transform per resource; throws on duplicate attach.

### tapAssistantClientRef / tapAssistantEmit
```typescript
tapAssistantClientRef(): { current: AssistantClient };
tapAssistantEmit(): <E>(event: E, payload) => void;  // Stable via tapEffectEvent
```

### tapClientResource
```typescript
tapClientResource(element: ResourceElement<TMethods>): { state: InferClientState<TMethods>; methods: TMethods; key: string | number | undefined };
```
Wraps resource element to create stable client proxy. Adds client to stack for event scoping. Use for 1:1 client mappings. State is inferred from the `getState()` method if present.

### tapClientLookup
```typescript
tapClientLookup<TMethods extends ClientMethods>(
  getElements: () => readonly ResourceElement<TMethods>[],
  getElementsDeps: readonly unknown[]
): { state: InferClientState<TMethods>[]; get: (lookup: { index: number } | { key: string }) => TMethods };
```
Wraps each element with `tapClientResource`. Throws on lookup miss.

### tapClientList
```typescript
tapClientList<TData, TMethods extends ClientMethods>({
  initialValues: TData[];
  getKey: (data: TData) => string;
  resource: ContravariantResource<TMethods, ResourceProps<TData>>;
}): { state: InferClientState<TMethods>[]; get: (lookup: { index: number } | { key: string }) => TMethods; add: (data: TData) => void };

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
| **splitClients** | Separate root/derived → collect and run `transformScopes` iteratively → filter parent-provided scopes |

## Design

| Audience | API Surface |
|----------|-------------|
| Users | `useAui`, `useAuiState`, `useAuiEvent`, `AuiProvider`, `AuiIf`, `Derived` |
| Authors | Above + `tap*`, `attachTransformScopes`, `ClientOutput`, `ScopeRegistry` |
| Internal | `utils/*` |

**Terminology**: Client (React Query pattern), methods (not actions), meta (optional source/query), events (optional).

## Invariants

1. `ScopeRegistry` must have ≥1 client (compile error otherwise)
2. Resources return methods object matching `ClientOutput<K>` (with `getState()` for state access)
3. Events: `"clientName.eventName"` format
4. `meta.source` must be valid `ClientNames`
5. `useAuiState` selector cannot return whole state
6. Single transformScopes per resource; transform receives `(scopes, parent)` to inspect parent context
