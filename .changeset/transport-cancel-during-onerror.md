---
"@assistant-ui/core": patch
---

fix(core): `cancelRun()` ends an assistant transport run that failed while its `onError` callback is still pending, instead of leaving the run active until that callback settles
