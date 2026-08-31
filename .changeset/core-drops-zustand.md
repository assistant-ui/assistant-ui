---
"@assistant-ui/core": patch
"@assistant-ui/store": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

fix: drop zustand from core

core declared zustand as an optional peer while importing `create` and `useShallow` unconditionally. pnpm keys a package instance on its resolved peers, so two dependency branches landing on different zustand patches (5.0.14 under one, 5.0.15 under the other) produced two physical copies of core. React context is per copy, so a `RuntimeAdapterProvider` rendered by one copy was invisible to a runtime hook imported from the other: `unstable_Provider` supplied a `history` adapter, `useAISDKRuntime` read `undefined`, `withFormat()` never fired, and every thread loaded with no messages and no error.

core no longer uses zustand at all, so the peer is gone rather than reclassified. the four internal stores now use `WritableSubscribable`, a mutable cell built on the existing `BaseSubscribable` and read through `useSubscribable`. the two `useShallow` call sites wrapped selectors passed to `useAuiState`, aui's own store, so they now use `useShallowSelector` from `@assistant-ui/store/internal`, which memoizes a selector against the `shallowEqual` that already lived there.

`WritableSubscribable` reports a server snapshot and `useSubscribable` forwards one when the subscribable offers it, so the components reading these stores render under SSR the way the zustand hook did. Subscribables without one, including every existing runtime client, keep their current behaviour.

`@assistant-ui/react-native` and `@assistant-ui/react-ink` declared zustand only to satisfy core's optional peer and never imported it, so they no longer declare it. `@assistant-ui/react` and `@assistant-ui/ui` keep theirs because they import it directly, and `@assistant-ui/react` additionally exposes `StoreApi` through `ReadonlyStore` in its published types.
