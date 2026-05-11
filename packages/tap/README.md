# `@assistant-ui/tap`

[![npm version](https://img.shields.io/npm/v/@assistant-ui/tap)](https://www.npmjs.com/package/@assistant-ui/tap)
[![npm downloads](https://img.shields.io/npm/dm/@assistant-ui/tap)](https://www.npmjs.com/package/@assistant-ui/tap)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@assistant-ui/tap)](https://bundlephobia.com/package/@assistant-ui/tap)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Reactive primitives that bring React's hook mental model outside of components. The core has zero runtime dependencies and works in vanilla JS, on a server, or in React via the optional `/react` sub-path. Define self-contained units of state and effects (Resources) using `tapState`, `tapEffect`, `tapMemo`, and friends, and consume them via `useResource`.

`tap` powers the runtime layer of assistant-ui. Most users do not install it directly; reach for `@assistant-ui/react` instead.

## Installation

```bash
npm install @assistant-ui/tap
```

## Usage

```typescript
import { resource, tapState, tapEffect, createResourceRoot } from "@assistant-ui/tap";

const Counter = resource(({ incrementBy = 1 }: { incrementBy?: number }) => {
  const [count, setCount] = tapState(0);

  tapEffect(() => {
    console.log("count:", count);
  }, [count]);

  return {
    count,
    increment: () => setCount((c) => c + incrementBy),
  };
});

const root = createResourceRoot();
const counter = root.render(Counter({ incrementBy: 2 }));

const unsubscribe = counter.subscribe(() => {
  console.log("counter updated:", counter.getValue().count);
});

counter.getValue().increment();
```

In React, use the `useResource` hook from the `/react` sub-path:

```tsx
import { useResource } from "@assistant-ui/tap/react";

function CounterButton() {
  const { count, increment } = useResource(Counter({ incrementBy: 1 }));
  return <button onClick={increment}>{count}</button>;
}
```

## Hooks

`tapState`, `tapEffect`, `tapMemo`, `tapCallback`, `tapRef` mirror their React counterparts. Additional primitives include `tapResource` and `tapResources` for composition, plus `createResourceContext` / `tap` / `withContextProvider` for context.

Full API reference at [assistant-ui.com/tap/docs](https://www.assistant-ui.com/tap/docs).

## License

MIT
