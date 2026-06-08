---
"@assistant-ui/tap": minor
---

feat: React integration

`@assistant-ui/tap` now requires `react` as a peer dependency and ships a React integration:

- Resource API at the package root: `useResource` (host a resource element), `useResources` (keyed lists), and `useResourceRoot` (a subscribable `{ getValue, subscribe }` boundary). Each is isomorphic: it works inside a resource render and inside a React component.
- Author resource state and effects with plain React hooks. A React dispatcher installed around every resource render makes `import { useState } from "react"` (and `useReducer`/`useRef`/`useMemo`/`useCallback`/`useEffect`/`useEffectEvent`/`use`) route to tap inside a resource, with no build step. It also backs `react/compiler-runtime`'s `useMemoCache`, so React Compiler output runs in a resource without a `"use no memo"` opt-out. Hooks tap has no equivalent for throw when called inside a resource.
- `@assistant-ui/tap/react-shim`: a runtime drop-in for `"react"` that assistant-ui's own packages are built against (their `react` imports are pre-routed to it), so they route to tap inside a resource render and to React otherwise without depending on the consumer's bundler. It ships no type declarations; keep importing from `"react"` so React's own types apply.
- Also exports `resource`, `withKey`, `createResourceRoot`, `flushResourcesSync`, the experimental `useReducerWithDerivedState` (a `getDerivedStateFromProps` replacement) and `createResourceContext` / `withContextProvider` context API, and the `Resource` / `ContravariantResource` / `ResourceElement` types.
