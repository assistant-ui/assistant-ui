---
"@assistant-ui/x-buildutils": patch
---

fix: omit `onSuccess` instead of passing `undefined` so the tsdown config type-checks under `exactOptionalPropertyTypes`
