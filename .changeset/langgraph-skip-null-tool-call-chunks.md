---
"@assistant-ui/react-langgraph": patch
---

fix: skip a null entry in an AI message's `tool_call_chunks` instead of throwing and dropping the reply, both while a chunk streams and when the message is converted
