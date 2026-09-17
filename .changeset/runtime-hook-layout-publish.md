---
"@assistant-ui/core": patch
---

fix: publish runtime hook changes from `useRemoteThreadListRuntime` in the layout phase, so a run that settles mid-commit reads the current callbacks. the hosted thread runtime now re-renders synchronously before paint when the hook changes, instead of in a later render.
