---
"@assistant-ui/core": patch
---

fix(core): send a new thread's remote id with its first assistant transport request, without creating a thread to resume a run, and keep generating the title of a new thread whose first run is not an append
