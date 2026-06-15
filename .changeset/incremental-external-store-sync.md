---
"@assistant-ui/core": patch
---

perf: sync the external-store `messageRepository` incrementally instead of clear()+import()

when an `ExternalStoreAdapter` drives the thread via `messageRepository`, each update rebuilt the whole repository (`clear()` then `import()`, O(n)). it now diffs against the current repository (add or update incoming messages, delete the ones no longer present, O(delta)), and short-circuits when only `isRunning` flips on an unchanged repository reference. behavior is unchanged; this is the per-update cost on high-frequency streaming that previously forced consumers to subclass the runtime core.
