---
"@assistant-ui/tap": patch
---

fix(tap): surface a getSnapshot that throws on a store notification

`useSyncExternalStore` now mirrors React's `checkIfSnapshotChanged`: a throwing snapshot counts as changed and forces a re-render, so the render-time read surfaces the error where an error boundary can catch it. Errors escaping a scheduled flush are reported instead of thrown, so the macrotask path no longer raises an uncaught exception.
