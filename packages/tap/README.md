# `@assistant-ui/tap`

[![npm version](https://img.shields.io/npm/v/@assistant-ui/tap)](https://www.npmjs.com/package/@assistant-ui/tap)
[![npm downloads](https://img.shields.io/npm/dm/@assistant-ui/tap)](https://www.npmjs.com/package/@assistant-ui/tap)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@assistant-ui/tap)](https://bundlephobia.com/package/@assistant-ui/tap)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

A separate implementation of React's hook-dispatch engine, unlocking two use cases:

1. **Standalone hooks** — use React hooks to power an external store, outside your UI tree or outside React entirely.
2. **Resources** — render hooks dynamically inside React: conditionally, in a list, or from props.

You write hooks with the same primitives (`useState`, `useEffect`, `useMemo`, ...) imported from `"react"` and the same rules — tap supplies its own dispatcher underneath, so the hooks no longer depend on a React tree to run.

Documentation: [assistant-ui.com/tap](https://www.assistant-ui.com/tap)

## Installation

```bash
npm install @assistant-ui/tap
```

## Built on tap

### [`tap-vue`](https://www.npmjs.com/package/tap-vue) — React hooks in Vue

`toComposable(hook)` turns a React hook into a Vue composable. tap runs the hook — state, effects, cleanup — and tap-vue bridges the result into Vue's reactivity as a `ShallowRef`.

```ts
import { useState } from "react";
import { toComposable } from "tap-vue";

const useCount = (initialValue: number) => {
  const [count, setCount] = useState(initialValue);
  return { count, bump: () => setCount((c) => c + 1) };
};

const useVueCount = toComposable(useCount);
```

### [`jotai-tap`](https://www.npmjs.com/package/jotai-tap) — React hooks as Jotai atoms

`atomWithHook(hook)` runs a React hook and exposes its return value as a read-only atom. The hook follows the atom's lifecycle: it renders lazily on first read, mounts with the first subscriber, and unmounts with the last one.

```tsx
import { atomWithHook } from "jotai-tap";

const clockAtom = atomWithHook(useClock);
```

### [`@assistant-ui/store`](https://www.npmjs.com/package/@assistant-ui/store) — the state layer of assistant-ui

The client tree behind `@assistant-ui/react`: every scope (thread, composer, message, ...) is a hook-powered resource, hosted inside React by the provider or standalone via `createAssistantClient`. tap is what lets the same runtime code run in both worlds.

## Resources

A resource is a hook wrapped in its own hook boundary, so mounting one conditionally is allowed:

```tsx
import { resource, useResources } from "@assistant-ui/tap";

const Session = resource(useSession);

function App({ user }: { user: User | null }) {
  const [session] = useResources(user ? [Session({ userId: user.id })] : []);
  // ...
}
```

## License

MIT
