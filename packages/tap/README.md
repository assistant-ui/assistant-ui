# `@assistant-ui/tap`

[![npm version](https://img.shields.io/npm/v/@assistant-ui/tap)](https://www.npmjs.com/package/@assistant-ui/tap)
[![npm downloads](https://img.shields.io/npm/dm/@assistant-ui/tap)](https://www.npmjs.com/package/@assistant-ui/tap)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@assistant-ui/tap)](https://bundlephobia.com/package/@assistant-ui/tap)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

React's hooks, headless. Write a **resource** the same way you write a component, with the same hooks (`useState`, `useEffect`, `useMemo`, ...) imported from `"react"` and the same rules, except a resource returns a plain value instead of JSX. It runs inside a React component, inside another resource, or standalone with no React tree at all.

`tap` powers the runtime layer of assistant-ui. Most users do not install it directly; reach for `@assistant-ui/react` instead.

## Installation

```bash
npm install @assistant-ui/tap
```

## Usage

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

const counter = createTapRoot(() => useResource(Counter({ incrementBy: 2 })));

const unsubscribe = counter.subscribe(() => {
  console.log("counter updated:", counter.getValue().count);
});

counter.getValue().increment();
```

In React, host a resource with `useResource`:

```tsx
import { useResource } from "@assistant-ui/tap";

function CounterButton() {
  const { count, increment } = useResource(Counter({ incrementBy: 1 }));
  return <button onClick={increment}>{count}</button>;
}
```

## Hooks

Inside a resource you use React's hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `use`, ...) imported from `"react"`. tap adds `useResource` / `useResources` / `useTapRoot` for composition and `createResourceContext` / `withContextProvider` for context.

Full API reference at [assistant-ui.com/tap/docs](https://www.assistant-ui.com/tap/docs).

## License

MIT
