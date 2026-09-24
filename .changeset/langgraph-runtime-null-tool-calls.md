---
"@assistant-ui/react-langgraph": patch
---

fix: skip null tool call entries in the runtime's run bookkeeping and message accumulation instead of throwing on them during a stream, send, load, tool result or edit
