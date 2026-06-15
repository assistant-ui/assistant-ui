---
"@assistant-ui/core": patch
---

perf: sync the external-store `messageRepository` incrementally instead of clear()+import()

when an `ExternalStoreAdapter` drives the thread via `messageRepository`, each update tore the whole repository down (`clear()`) and rebuilt it from scratch (`import()`). it now diffs against the current repository (add or update incoming messages, delete the ones no longer present), so unchanged messages keep their existing per-message repository state instead of being recreated, and short-circuits when only `isRunning` flips on an unchanged repository reference. behavior is unchanged; this removes the teardown/rebuild churn on high-frequency streaming that previously pushed consumers to subclass the runtime core.
