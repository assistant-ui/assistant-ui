---
"@assistant-ui/core": patch
---

fix: report a still-initializing thread through `onThreadIdChange` once its remote id settles, instead of as `undefined`
