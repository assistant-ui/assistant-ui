---
"@assistant-ui/core": patch
---

fix: reject a pending `human()` request when the tool call's arguments change after they completed, so an answer never applies to arguments the user was not shown
