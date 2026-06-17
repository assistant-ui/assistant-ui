---
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/core": patch
---

feat(react-ag-ui): apply external state from `ThreadHistoryAdapter.load()`

`onSwitchToThread` already applies returned `state` via `loadExternalState`, but the history `load()` path did not, so state restored on a fresh page load was dropped. `ThreadHistoryAdapter.load()` may now return an optional `state`, and `AgUiThreadRuntimeCore` applies it — making both load paths symmetric.
