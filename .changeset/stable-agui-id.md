---
"@assistant-ui/react-ag-ui": patch
---

An assistant message that never receives a server id keeps its id when its run finishes, so its row no longer remounts at the end of the run.
