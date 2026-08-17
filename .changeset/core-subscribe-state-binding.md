---
"@assistant-ui/core": patch
---

fix: route ThreadRuntime/ThreadListRuntime subscribe through the memoizing state binding, and give LazyMemoizeSubject the same identity guard ShallowMemoizeSubject has, so getState serves a stable identity between notifications. Note: ThreadRuntime.subscribe now only notifies when the shallow-compared ThreadState changed — composer edits no longer wake thread subscribers; observe them via `runtime.composer.subscribe`, matching every other runtime class.
