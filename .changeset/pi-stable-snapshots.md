---
"@assistant-ui/react-pi": patch
---

refactor: subscribe the Pi runtime to stable controller snapshots instead of a version counter. a `PiThreadControllerLike` implementation must now return reference-stable values from `getState` (or the new optional `getStateSnapshot`) and `getMessageRepository`, since the React bindings read them as `useSyncExternalStore` snapshots.
