---
"@assistant-ui/react-langgraph": patch
---

fix: resume the graph after a frontend tool result when the same AI message also has a tool call without an id, which used to hold the result back forever
