# `@assistant-ui/tap`

[![npm version](https://img.shields.io/npm/v/@assistant-ui/tap)](https://www.npmjs.com/package/@assistant-ui/tap)
[![npm downloads](https://img.shields.io/npm/dm/@assistant-ui/tap)](https://www.npmjs.com/package/@assistant-ui/tap)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@assistant-ui/tap)](https://bundlephobia.com/package/@assistant-ui/tap)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

React's hook engine, reimplemented. Hooks can run standalone, which unlocks:

1. **Hooks for state management** — use React hooks to power an external store, outside your UI tree or outside React entirely.
2. **Resources** — render hooks dynamically inside React: conditionally, in a list, or from props.

Documentation: [assistant-ui.com/tap](https://www.assistant-ui.com/tap)

## Installation

```bash
npm install @assistant-ui/tap
```

## Built on tap

- [`tap-vue`](https://github.com/assistant-ui/tap-vue) — use React hooks in Vue
- [`jotai-tap`](https://github.com/assistant-ui/jotai-tap) — use React hooks to power Jotai atoms
- [`@assistant-ui/store`](https://github.com/assistant-ui/assistant-ui/tree/main/packages/store) — the state layer of assistant-ui

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
