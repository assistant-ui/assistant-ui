---
"@assistant-ui/core": patch
---

fix(core): an assistant transport command sent right after `cancelRun()` is sent in a follow-up run instead of being reported to `onCancel`; `onCancel` reports only the work pending when the cancel happened, including for a run cancelled before it started or while its `onError` callback was running
