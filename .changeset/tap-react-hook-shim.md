---
"@assistant-ui/tap": patch
---

feat: React-facing resource API at the `@assistant-ui/tap` root and a hook drop-in at `@assistant-ui/tap/react-shim`

Resource API (exported from the package root):

- `useResource` hosts a resource element in both contexts: inside a tap render it
  routes to `useTapResource` (child resource), inside a React component it uses the
  React bridge. It accepts the optional `propsDeps` tap render optimization
  (ignored on the React side).
- `useResources` (keyed lists) and `useResourceRoot` (a subscribable
  `{ getValue, subscribe }` boundary) host resources in both contexts too.

Because the root now hosts resources in a React component, `@assistant-ui/tap`
requires `react` as a peer dependency.

`@assistant-ui/tap/react-shim` (a runtime drop-in for `"react"`): `useState`,
`useReducer`, `useRef`, `useMemo`, `useCallback`, `useEffect`, `useLayoutEffect`,
and `useEffectEvent` route to the matching tap primitive inside a resource render
and to React otherwise; hooks with no tap equivalent and all of React's non-hook
value exports (`memo`, `forwardRef`, `createContext`, `createElement`, `Fragment`,
`lazy`, `Children`, the default export, ...) are forwarded from `"react"`. It is a
runtime alias only and ships no type declarations: keep importing from `"react"`
so React's own types apply (the build reverts the aliased specifier back to
`"react"` in emitted `.d.ts`). Alias `react` to this module at the bundler level
(the `aui()` / `withAui()` integrations, or a manual `resolve.alias`) so the same
code runs in a React component and a tap resource.

The low-level hook primitives are internal: author resource state and effects by
importing `useState` / `useEffect` / `useMemo` / ... from `"react"` (routed to tap
via the react-shim alias inside a resource render), and compose resources with
`useResource` / `useResources` / `useResourceRoot`. The root exports `resource`,
`withKey`, `createResourceRoot`, `flushResourcesSync`, `useResource`,
`useResources`, `useResourceRoot`, the experimental `useReducerWithDerivedState`
(a `getDerivedStateFromProps` replacement, usable inside a resource render), the
experimental `createResourceContext` / `withContextProvider` context API, and the
`Resource`, `ContravariantResource`, `ResourceElement` types.

Also adds `peekResourceFiber()`, a non-throwing variant of
`getCurrentResourceFiber()`, used to detect the tap render context.
