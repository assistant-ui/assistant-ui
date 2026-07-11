---
"@assistant-ui/react-langgraph": patch
---

fix: serialize runs in useLangGraphRuntime so a frontend tool result resume never overlaps the run that emitted the tool call. isRunning stays true across the seam, cancel stops the whole turn and drops the queued resume, and a run that aborts or errors drops the sends queued behind it.
