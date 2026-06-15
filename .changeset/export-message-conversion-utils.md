---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: export `fromThreadMessageLike` and `generateId` from the public API

these two utilities were only reachable via `@assistant-ui/core/internal`, so materializing a `ThreadMessageLike` into a `ThreadMessage`, or generating an id for a hand-built message, meant reaching into internals (the first-party ag-ui and a2a runtimes already did). they are now exported from `@assistant-ui/core`, `@assistant-ui/react`, `@assistant-ui/react-native`, and `@assistant-ui/react-ink`. also removes the now-redundant duplicate listing of both from the unstable `INTERNAL` namespace; nothing consumed them there.
