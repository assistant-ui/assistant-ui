---
"@assistant-ui/core": patch
---

fix(core): the external store runtime's cancel resync no longer overwrites a host update it has not received yet (a message sent right after stopping) or writes back a stopped message the composer already holds, and it keeps the running placeholder of a run that started before the resync
