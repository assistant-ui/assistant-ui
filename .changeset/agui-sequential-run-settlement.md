---
"@assistant-ui/react-ag-ui": patch
---

Reset AG-UI terminal state on each `RUN_STARTED` so sequential runs in one response can complete and settle subagent calls.
