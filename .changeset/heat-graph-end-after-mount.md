---
"heat-graph": patch
---

An omitted `end` no longer reads the clock during render: the server render and hydration end the graph at the latest data date, and it moves to today right after mount.
