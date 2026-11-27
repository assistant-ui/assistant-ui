---
"@assistant-ui/core": patch
---

fix: `useExternalStoreRuntime` hands the host's new messages to the thread before the browser paints, so the thread no longer shows the previous messages for a frame (or an empty-state greeting after a load). `initialize`, `runStart` and `runEnd` still reach listeners mounted by the same update.
