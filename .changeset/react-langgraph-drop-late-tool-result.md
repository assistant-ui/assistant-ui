---
"@assistant-ui/react-langgraph": patch
---

fix: drop a frontend tool result for a call that was already answered instead of releasing it as a resume run. A slow frontend tool resolving after a new turn auto-cancelled its dangling call no longer sends a second tool message to the graph.