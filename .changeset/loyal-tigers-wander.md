---
"@assistant-ui/core": patch
---

fix(core): hoist remote thread runtime binder out of `unstable_Provider`

`RemoteThreadListAdapter.unstable_Provider` is now allowed to render any subtree it likes; the runtime binding (composer state, `__internal_setGetInitializePromise`, `runEnd → generateTitle` listener) executes outside it. This fixes `EMPTY_THREAD_ERROR` when the Provider defers `children` (e.g. behind a history-loading state) and avoids the history-switch regression seen when only the binder, but not the init listeners, were hoisted. Adds a dev-mode warning when the Provider does not render `children` within ~100ms.
