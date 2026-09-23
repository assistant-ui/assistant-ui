---
"@assistant-ui/react-langgraph": patch
---

fix: skip null tool call entries in the runtime's run bookkeeping and message accumulation instead of failing the stream, send, load, tool result, or edit
