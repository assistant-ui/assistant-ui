---
name: tap
description: Use this skill whenever you write or review code that uses `@assistant-ui/tap` or `@assistant-ui/store` in the assistant-ui monorepo — including resource factories, `tapState`/`tapEffect`/`tapMemo`, `tapClientResource`/`tapClientLookup`/`tapClientList`, `useAui`/`useAuiState`, scope registration via `ScopeRegistry`, or any new package that exposes a store scope. Read this before writing tap or store code to avoid common naming/lifecycle mistakes.
---

# tap & store conventions

`@assistant-ui/tap` is the reactive primitives library. `@assistant-ui/store` bridges tap to React with named, type-safe scopes.

Authoritative docs live in `apps/docs/content/tap-docs/`. This skill is a working summary — read the docs when in doubt.

## Naming conventions (the easy-to-break ones)

- **`tap*` is the hook prefix.** Reserve it for functions that are called **inside a resource body** and follow the rules of hooks: `tapState`, `tapEffect`, `tapMemo`, `tapCallback`, `tapRef`, `tapConst`, `tapEffectEvent`, `tapReducer`, `tapResource`, `tapResources`, `tapResourceRoot`, `tapClientResource`, `tapClientLookup`, `tapClientList`.
- **Resource factories use `*Resource` or a plain noun.** Examples in the codebase: `SpanResource`, `CounterResource`, `MCPManagerResource`. They're created by `resource(fn)` and called from outside resource bodies to produce `ResourceElement`s. **Never** name a resource factory `tapFoo` — that signals "hook" and is wrong.
- **Plain utility functions stay plain.** `defineConnector`, `createOAuthProvider`, `buildHeaders`. No `tap` prefix.

If you find yourself writing `export const tapFoo = resource(...)`, stop — rename to `Foo` or `FooResource`.

## Resources, ResourceElements, instances

```ts
import { resource, tapState } from "@assistant-ui/tap";

// 1. Factory (defined once, at module scope)
const Counter = resource(({ initial = 0 }: { initial?: number }) => {
  const [count, setCount] = tapState(initial);
  return { count, increment: () => setCount((c) => c + 1) };
});

// 2. ResourceElement (call the factory — inert description, no state yet)
const element = Counter({ initial: 10 });

// 3. Instance — one of:
//    - useResource(element) inside React
//    - tapResource(element) inside another resource body
//    - createResourceRoot().render(element) imperatively
//    - useAui({ scope: element }) to mount as a store scope
```

A `ResourceElement` is `{ type, props, key? }`. It's just a description; nothing runs until it's instantiated.

## Rules of tap hooks

Same rules as React hooks. Specifically:

- Call hooks at the **top level** of a resource body, or at the top level of a custom `tap*` helper.
- **Don't** call in conditions, loops, nested functions, `try/catch`, event handlers, or inside callbacks passed to `tapState`/`tapMemo`/`tapEffect`.
- **Setting state during render throws** (unlike React). If you need to derive state from props, use `tapReducerWithDerivedState`.

## State, effects, refs

```ts
const [val, setVal] = tapState(initial);       // setter is stable; setVal in render throws
tapEffect(() => {                              // runs after commit; cleanup on dep change / unmount
  const handle = subscribe();
  return () => handle.close();
}, [deps]);
const sorted = tapMemo(() => sort(items), [items]);
const ref = tapRef<HTMLElement>();             // mutable across renders
const id = tapConst(() => crypto.randomUUID(), []);  // computed once, [] required
const onMsg = tapEffectEvent((m) => setVal(m)); // stable, always sees latest closure
```

Effects run in **call order**, not children-first like React. You can place `tapEffect` calls before or after `tapResource` and they fire in source order. Cleanups run in the same FIFO order on unmount.

## Composition

```ts
const child = tapResource(Child());            // single child; returns child's value directly
const items = tapResources(
  () => list.map((x) => withKey(x.id, Item({ data: x }))),
  [list],
);                                              // dynamic list; every element needs withKey
const handle = tapResourceRoot(Child());        // returns { getValue, subscribe }, no parent re-render
```

`withKey(key, element)` is required for `tapResources`. Same identity rules as React's `key`.

## Store scopes

A scope is a named slot with typed methods. Register via module augmentation:

```ts
import "@assistant-ui/store";

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    counter: {
      methods: {
        getState: () => { count: number };
        increment: () => void;
      };
      // optional:
      meta?: { source: "counterList"; query: { index: number } | { key: string } };
      events?: { "counter.reset": { reason: string } };
    };
  }
}
```

`methods` MUST include `getState()` if the scope exposes state via `useAuiState`. `meta` declares this scope is *derived* from another scope by a query. `events` declares the events the scope can emit.

## Resource → scope binding

A resource fills a scope by returning a value matching the scope's `methods` type. Use `ClientOutput<"name">` for the return type:

```ts
import type { ClientOutput } from "@assistant-ui/store";

export const CounterResource = resource(
  ({ initial = 0 }: { initial?: number }): ClientOutput<"counter"> => {
    const [count, setCount] = tapState(initial);
    const state = tapMemo(() => ({ count }), [count]);
    return {
      getState: () => state,
      increment: () => setCount((c) => c + 1),
    };
  },
);
```

`tapMemo` the state object so identity is stable when nothing changes — `useAuiState` selectors run on every emit and benefit from referential equality.

## Bringing it into React

```tsx
import { useAui, useAuiState, AuiProvider } from "@assistant-ui/store";

function App() {
  const aui = useAui({ counter: CounterResource({ initial: 0 }) });
  return (
    <AuiProvider value={aui}>
      <CounterDisplay />
    </AuiProvider>
  );
}

function CounterDisplay() {
  const count = useAuiState((s) => s.counter.count);          // granular subscription
  const aui = useAui();
  return <button onClick={() => aui.counter().increment()}>{count}</button>;
}
```

- `useAui({ scope: element })` extends the parent store; the new scope is available to children via `AuiProvider`.
- `useAuiState(selector)` re-renders only when the selected slice changes. **The selector must return a primitive or stable value** — returning the proxy itself throws.
- `aui.counter()` returns the methods object (proxied; always calls the latest impl). `aui.counter().increment()` is the standard call form.

## Lists & lookups inside resources

When a resource owns many sub-clients:

```ts
// Static or recomputed-from-array list — no add/remove
const lookup = tapClientLookup(
  () => items.map((it) => withKey(it.id, ItemResource({ data: it }))),
  [items],
);
// lookup.state: ItemState[]
// lookup.get({ key }) or lookup.get({ index }) -> methods (throws on miss)

// Dynamic, owns mutation
const list = tapClientList({
  initialValues: initialItems,
  getKey: (it) => it.id,
  resource: ({ key, getInitialData, remove }) => ItemResource({ ... }),
});
// list.state, list.get(...), list.add(data) — duplicate add() throws
```

`tapClientResource(element)` wraps a single sub-resource and exposes `{ state, methods, key }` — used when you have a 1:1 mapping and want event scoping.

## Derived scopes

When a child scope is "scope X queried by Y from parent scope Z":

```ts
import { Derived } from "@assistant-ui/store";

const aui = useAui({
  message: Derived({
    source: "thread",
    query: { index },
    get: (parent) => parent.thread().message({ index }),
  }),
});
```

The scope's `meta: { source, query }` declaration must match. `get` is called via `tapEffectEvent` internally, so always sees the latest parent.

## Common pitfalls

- Naming a resource factory `tapFoo` (looks like a hook). Use `FooResource` or `Foo`.
- Calling `setState` inside a `tapState` initializer or during render — throws.
- Forgetting `withKey` in `tapResources` — throws.
- Returning the proxy from `useAuiState((s) => s.foo)` — throws. Select a leaf value: `useAuiState((s) => s.foo.bar)`.
- Function calls in dep arrays (e.g. `[a.getState()]`) — biome lints against this. Extract to a variable first.
- Treating storage / adapter resources as needing tap hooks. Resources without reactive state are still valid — `resource()` is just the factory wrapper; the body can be pure.

## Reference paths in this repo

- Tap hook source: `packages/tap/src/`
- Store source: `packages/store/src/`
- Store spec: `packages/store/SPEC.md`
- Tap docs: `apps/docs/content/tap-docs/`
- Store docs: `apps/docs/content/tap-docs/store/`
- Real-world resource example: `packages/react-o11y/src/resources/SpanResource.tsx`
