---
"@assistant-ui/react-ag-ui": patch
---

feat: export createAgUiResumeStream to build a read-only ThreadHistoryAdapter.resume() from a stream of AG-UI events, reusing RunAggregator so resumed runs render identically without re-invoking the agent
