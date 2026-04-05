---
"@assistant-ui/core": patch
---

fix(core): move initialThreadId/threadId handling from constructor to __internal_load to prevent SSR crash
