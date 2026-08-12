# `@assistant-ui/tap`

[![npm version](https://img.shields.io/npm/v/@assistant-ui/tap)](https://www.npmjs.com/package/@assistant-ui/tap)
[![npm downloads](https://img.shields.io/npm/dm/@assistant-ui/tap)](https://www.npmjs.com/package/@assistant-ui/tap)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@assistant-ui/tap)](https://bundlephobia.com/package/@assistant-ui/tap)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

A separate implementation of React's hook-dispatch engine. You write hooks with the same primitives (`useState`, `useEffect`, `useMemo`, ...) imported from `"react"` and the same rules — tap supplies its own dispatcher underneath, so the hooks no longer depend on a React tree to run.

That unlocks two use cases:

1. **Standalone hooks** — use React hooks to power an external store, outside your UI tree or outside React entirely.
2. **Resources** — render hooks dynamically inside React, changing the number and type of hooks a component renders.

`tap` powers the runtime layer of assistant-ui.

## Installation

```bash
npm install @assistant-ui/tap
```

## Standalone hooks

Use React hooks to power an external store. `createTapRoot` hosts a hook with no React tree at all, drives its render/effect lifecycle, and exposes the result as a subscribable store:

```typescript
import { resource, createTapRoot, useResource } from "@assistant-ui/tap";
import { useState, useEffect } from "react";

const useCounter = ({ incrementBy = 1 }: { incrementBy?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("count:", count);
  }, [count]);

  return {
    count,
    increment: () => setCount((c) => c + incrementBy),
  };
};

const Counter = resource(useCounter);

const counter = createTapRoot(function CounterRoot() {
  return useResource(Counter({ incrementBy: 2 }));
});

const unsubscribe = counter.subscribe(() => {
  console.log("counter updated:", counter.getValue().count);
});

counter.getValue().increment();
```

Libraries built on this:

- [`tap-vue`](https://www.npmjs.com/package/tap-vue) — use React hooks in Vue
- [`jotai-tap`](https://www.npmjs.com/package/jotai-tap) — use React hooks to power Jotai atoms
- [`@assistant-ui/store`](https://www.npmjs.com/package/@assistant-ui/store) — the state layer of assistant-ui, a client tree powered by hooks

## Resources

A **resource** is written like a component — same hooks, same rules — except it returns a plain value instead of JSX. Each resource is its own hook boundary, so a component can change the number and type of hooks it renders between renders. That unlocks what the rules of hooks normally forbid:

- **Conditionally rendering hooks** — mount a resource only when a condition holds
- **Rendering hooks in a list** — one resource per item, keyed like elements
- **Safely consuming hooks from props** — accept a resource element as a prop and mount it

Host a single resource with `useResource`:

```tsx
import { useResource } from "@assistant-ui/tap";

function CounterButton() {
  const { count, increment } = useResource(Counter({ incrementBy: 1 }));
  return <button onClick={increment}>{count}</button>;
}
```

Render a dynamic list of hooks with `useResources`:

```tsx
import { useResources, withKey } from "@assistant-ui/tap";

function Counters({ ids }: { ids: string[] }) {
  const counters = useResources(
    ids.map((id) => withKey(id, Counter({ incrementBy: 1 }))),
  );
  return <div>{counters.map((c) => c.count).join(", ")}</div>;
}
```

## Hooks

Inside a resource you use React's hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `use`, ...) imported from `"react"`. tap adds `useResource` / `useResources` / `useTapRoot` for composition and `useContextProvider` for context.

Full API reference at [assistant-ui.com/tap/docs](https://www.assistant-ui.com/tap/docs).

## License

MIT
