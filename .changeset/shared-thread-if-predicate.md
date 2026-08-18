---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

fix: make `ThreadIf empty` agree with `ThreadEmpty` on react-native and react-ink

React Native and Ink derived emptiness from `thread.messages.length === 0`,
while the rest of the runtime — including their own `ThreadEmpty` primitive —
uses `thread.isEmpty` (`messages.length === 0 && !isLoading`). A thread that
was still loading its first page therefore rendered `<Thread.If empty>` and
`<Thread.Empty>` at the same time with contradictory results.

All three distributions now share one `useThreadIf` predicate, added to
`@assistant-ui/core/react`. React Native and Ink also gain the optional
`disabled` filter the web primitive already had, widening their `ThreadIfProps`
without narrowing any existing prop. The web primitive keeps its
`RequireAtLeastOne` props and its deprecation marker.
