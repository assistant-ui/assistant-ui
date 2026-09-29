---
"@assistant-ui/react-langgraph": patch
---

fix: skip null `tool_calls` entries in the runtime's run bookkeeping, its pending tool call scan and `appendLangChainChunk`'s message merging instead of throwing on them
