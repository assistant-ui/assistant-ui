---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat(core): build `useToolInvocations`-equivalent pipeline directly into `useExternalStoreRuntime`. Tool-call parts in messages now fire client-side `streamCall` / `execute` automatically for any external-store runtime — no separate `useToolInvocations` wiring required. Opt out per-adapter via `unstable_disableToolInvocations: true`. The `_store.isLoading` flag signals when initial history is loaded: snapshots observed while `isLoading === true` are treated as historical (no fire), matching the contract that callers like `importExternalState` already rely on. `useToolInvocations` is now a thin React shim over the new `ToolInvocationTracker` class and is marked `@deprecated`; existing consumers continue to work unchanged. `useAssistantTransportRuntime` opts out of the embedded tracker for back-compat (it still threads tool statuses through its converter); migrating it to the embedded tracker is a planned follow-up.
