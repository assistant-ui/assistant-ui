---
"@assistant-ui/core": patch
---

feat(core): let runtimes provide an explicit `isRunning` that overrides the last-message-status heuristic. `ExternalStoreAdapter.isRunning` now flows through to `thread.isRunning` directly, so applications can keep the thread in a running state even after the last assistant message has completed (e.g. while non-message stream chunks like suggestions, step-finish, or metadata updates are still arriving). When a runtime does not provide `isRunning`, the previous last-message-based behavior is preserved.
