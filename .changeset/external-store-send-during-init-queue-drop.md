---
"@assistant-ui/core": patch
---

fix(core): an external store send that waited for thread initialization is delivered when the host drops or replaces its message queue in the meantime, instead of being lost
