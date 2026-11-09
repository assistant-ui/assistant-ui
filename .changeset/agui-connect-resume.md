---
"@assistant-ui/react-ag-ui": patch
---

feat: rejoin an in-flight run through `agent.connect()` when a thread loads or is switched to with `unstable_resume` and the history adapter has no `resume()`; leaving such a thread detaches from the run instead of aborting it
