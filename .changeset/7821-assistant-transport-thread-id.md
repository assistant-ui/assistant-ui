---
"@assistant-ui/core": patch
---

fix(core): the assistant transport runtime sends a new thread's remote id with its first request and keeps its default thread when the host re-renders; a resume never creates a thread, and a new thread whose first run is not an append still gets its title
