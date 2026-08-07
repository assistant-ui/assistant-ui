---
"@assistant-ui/tap": patch
---

fix: force a re-render when a useSyncExternalStore snapshot throws on a notification, mirroring React's checkIfSnapshotChanged, so the error surfaces at the render-time read instead of being silently swallowed
