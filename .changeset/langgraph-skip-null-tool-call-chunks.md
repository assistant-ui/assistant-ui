---
"@assistant-ui/react-langgraph": patch
---

fix: skip a null entry in a streamed chunk's `tool_call_chunks` instead of throwing and dropping the reply
