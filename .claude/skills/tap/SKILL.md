---
name: tap
description: Use this skill whenever you write or review code that uses `@assistant-ui/tap` or `@assistant-ui/store` in the assistant-ui monorepo — tap hooks, resource factories, `tapClientResource`/`tapClientLookup`/`tapClientList`, `useAui`/`useAuiState`/`useAuiEvent`, `ScopeRegistry`, `Derived` child scopes, `attachTransformScopes`, `tapAssistantClientRef`/`tapAssistantEmit`, or any new package exposing a store scope. Read first to avoid the recurring mistakes catalogued below.
---

# tap & store cheat sheet

Authoritative docs: `apps/docs/content/tap-docs/` (and `.../store/`). This is a working summary, not a replacement.

## Naming

- **`tap*`** = a hook called inside a resource body, follows rules of hooks. Examples: `tapState`, `tapEffect`, `tapMemo`, `tapCallback`, `tapRef`, `tapConst`, `tapEffectEvent`, `tapReducer`, `tapReducerWithDerivedState`, `tapResource`, `tapResources`, `tapResourceRoot`, `tapClientResource`, `tapClientLookup`, `tapClientList`, `tapAssistantClientRef`, `tapAssistantEmit`, `tap` (context reader).
- **`*Resource` / `Foo`** = resource factory produced by `resource(fn)`, called *outside* resource bodies (`SpanResource`, `CounterResource`, `MCPManagerResource`). Never name a factory `tapFoo` — that signals "hook".
- Plain utilities have no prefix (`defineConnector`, `createOAuthProvider`).

## Resources

```ts
import { resource, tapState } from "@assistant-ui/tap";

const Counter = resource(({ initial = 0 }) => {
  const [count, setCount] = tapState(initial);
  return { count, increment: () => setCount((c) => c + 1) };
});

const element = Counter({ initial: 10 });   // ResourceElement = { type, props, key? }, inert
```

Instantiate via: `useResource(element)` in React, `tapResource(element)` inside another resource body, `createResourceRoot().render(element)` imperatively, or `useAui({ scope: element })` as a store scope.

## Hook rules

- Top level of resource body or a custom `tap*` helper only.
- Not in conditions, loops, nested functions, event handlers, `try/catch`, or callbacks passed to `tapState`/`tapMemo`/`tapEffect`.
- **`setState` during render throws** (unlike React). For derive-from-props use `tapReducerWithDerivedState`.

## Trees & re-renders

`tapResource` returns child values to the parent, so **the entire tree re-renders from the root** when any resource updates. `tapResourceRoot` breaks the chain (subtree boundary, used inside Store). Tap batches updates via microtasks; >50 update flushes throws.

Effects run in **call order** (not children-first like React). Cleanups run FIFO on unmount.

# `@assistant-ui/store`

A **scope** = named slot with typed methods (+ optional state + events). Multiple scopes compose under `<AuiProvider>`.

## Registering & implementing

```ts
import "@assistant-ui/store";
declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    counter: {
      methods: { getState: () => { count: number }; increment: () => void };
      meta?: { source: "counterList"; query: { id: string } };   // for derived child scopes
      events?: { "counter.reset": { reason: string } };           // typed events
    };
  }
}
```

```ts
import type { ClientOutput } from "@assistant-ui/store";

export const CounterResource = resource((): ClientOutput<"counter"> => {
  const [count, setCount] = tapState(0);
  const state = tapMemo(() => ({ count }), [count]);    // ✅ stabilize identity
  return { getState: () => state, increment: () => setCount((c) => c + 1) };
});
```

Always `tapMemo` the `getState` object — Store detects changes via `Object.is`, an inline literal looks new every render.

## `useAui()` — the resolution rule

`useAui()` returns a stable `AssistantClient`; it does **not** subscribe. `aui.counter` is an *accessor*; calling `aui.counter()` resolves to the scope's methods.

**Never resolve scope methods during render.** A snapshot taken in the render body goes stale when a derived scope retargets. The pattern is always:

```tsx
function MessageActions() {
  const aui = useAui();                                       // ✅ in body
  return <button onClick={() => aui.counter().increment()} />; // ✅ resolved in callback
}

// ❌ Don't do these:
// const count = aui.counter().getState().count;     (read during render)
// const counter = aui.counter();                    (cached scope during render)
// <button onClick={() => counter.increment()}>      (uses the stale cache)
```

For render-time state reads, use `useAuiState` (which subscribes). For imperative reads in effects/handlers, `aui.counter().getState()` is fine.

Check existence with `aui.counter.source !== null` (it's `null` when no ancestor provides the scope; calling `aui.counter()` then throws).

## `useAuiState` — render-time reads

```tsx
const count = useAuiState((s) => s.counter.count);
```

- `s.counter` = that scope's `getState()` return.
- Return is compared by `Object.is`. **Never return a fresh object/array** from the selector — infinite re-render. Use one `useAuiState` call per leaf value.
- Selecting wide state slices re-renders on any field change. Select the leaf you actually use.
- Selecting on a missing scope throws — gate with `aui.foo.source !== null` if conditional.

## React composition

```tsx
function App() {
  const aui = useAui({ counter: CounterResource({ initial: 0 }) });
  return <AuiProvider value={aui}><CounterDisplay /></AuiProvider>;
}
```

Each level can extend with another `useAui({ ... })`; children see the merged store.

## Lists inside a resource

```ts
// Recomputed from an array — no add/remove
const lookup = tapClientLookup(
  () => items.map((it) => withKey(it.id, ItemResource({ data: it }))),
  [items],
);
// lookup.state: ItemState[]; lookup.get({key} | {index}) -> methods (throws on miss)

// Dynamic, owns mutation
const list = tapClientList({
  initialValues: initialItems,
  getKey: (it) => it.id,
  resource: ({ key, getInitialData, remove }) => ItemResource({ ... }),
});  // list.state, list.get, list.add — duplicate key throws
```

`tapClientResource(element)` is the single-child variant: `{ state, methods, key }`, adds to event-scoping stack.

## Derived child scopes

```ts
import { Derived } from "@assistant-ui/store";

useAui({
  message: Derived({
    source: "thread",
    query: { index },
    get: (parent) => parent.thread().message({ index }),
  }),
});
```

The scope's `meta: { source, query }` must match. `get` is wrapped in `tapEffectEvent` internally — always sees the latest parent.

## Rendering lists in React

Three-step pattern (used by every assistant-ui list primitive). Subscribe to **length**, memoize the array, defer per-item reads with `RenderChildrenWithAccessor`:

```tsx
import { useAuiState, RenderChildrenWithAccessor } from "@assistant-ui/store";

const length = useAuiState((s) => s.todoList.todos.length);
return useMemo(() => Array.from({ length }, (_, index) => (
  <TodoProvider key={index} index={index}>
    <RenderChildrenWithAccessor
      getItemState={(aui) => aui.todoList().todo({ index }).getState()}
    >
      {(getItem) => children({ get todo() { return getItem(); } })}
    </RenderChildrenWithAccessor>
  </TodoProvider>
)), [length, children]);
```

Length-only subscription = re-render on add/remove only. Lazy `getItem` = no subscription if consumer doesn't read. Propless-component children get auto-memoized.

## Events

```ts
// declare on the scope
events: { "counter.incremented": { newCount: number }; "counter.reset": undefined };

// emit (in a resource)
const emit = tapAssistantEmit();
emit("counter.incremented", { newCount });   // delivered via microtask

// subscribe (in a component)
useAuiEvent("counter.incremented", ({ newCount }) => toast(`Count: ${newCount}`));
```

Scoping selectors:

| Listen for… | Selector |
| --- | --- |
| Events from your own scope | `"scope.event"` |
| Events from any child below | `{ scope: "yourScope", event: "child.event" }` |
| Events from a sibling | Listen at a mutual parent + filter by payload |
| Events from anywhere | `{ scope: "*", event: "scope.event" }` |
| All events (debugging) | `"*"` (payload becomes `{ event, payload }`) |

`{ scope }` must be in your context, else throws.

## Sibling scopes

Two patterns, often paired:

```ts
// Runtime access to a sibling (in effects/methods — NOT in render body)
const clientRef = tapAssistantClientRef();
tapEffect(() => {
  const unsub = clientRef.current!.modelContext().register({ ... });
  return () => unsub();
}, [clientRef]);

// Guarantee the sibling exists at mount
attachTransformScopes(ToolsResource, (scopes, parent) => {
  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContextResource();   // only add if not provided above
  }
});
```

Transforms apply iteratively; new root scopes trigger their own transforms. One transform per resource (duplicate attach throws).

## Recurring pitfalls

- **Resolving scope during render** (`aui.x().getState()` in body, caching `const x = aui.x()`). The pattern is `const aui = useAui();` + `aui.x()` *inside* the callback. Bug shows up when a derived scope retargets.
- **`useAuiState` selector returns fresh object/array** → infinite re-render. One call per leaf value.
- **Naming a resource factory `tapFoo`** — signals "hook", is wrong.
- **`setState` in `tapState` initializer or during render** — throws.
- **Forgetting `withKey`** in `tapResources` / `tapClientLookup` / `tapClientList` — throws.
- **Function calls in dep arrays** (`[a.getState()]`). Extract first. Oxlint's `react-hooks/exhaustive-deps` does not know tap hook names, so this is no longer linted automatically — review by hand.
- **Wide `useAuiState` selectors** (`(s) => s.foo`) — re-renders on every field change.
- **Reading `tapAssistantClientRef().current` during render** — null until siblings mount. Use in effects only.
- **Forgetting `tapMemo` on the `getState` object** — every consumer re-renders every emit.
- **Treating stateless adapter resources as needing tap hooks** — `resource()` body can be pure; that's fine.

## Pointers

- Tap hooks: `packages/tap/src/`
- Store: `packages/store/src/`, spec at `packages/store/SPEC.md`
- Docs: `apps/docs/content/tap-docs/` (+ `/store/`)
- Real example: `packages/react-o11y/src/resources/SpanResource.tsx`
