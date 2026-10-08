---
"@assistant-ui/core": patch
---

fix(core): `cancelRun()` ends a resumed assistant transport run whose replay is waiting for a render that has not committed (for example while the UI around the runtime is suspended), instead of leaving the run active until that render commits
