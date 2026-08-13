---
"@assistant-ui/tap": patch
---

fix(tap): stop a throwing getSnapshot from silently freezing a subscription

`useSyncExternalStore` now mirrors React's `checkIfSnapshotChanged`: a snapshot that throws on a store notification counts as changed and forces a re-render, so the render-time read surfaces the error instead of the subscription freezing on its last committed value.
