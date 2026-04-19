---
"@assistant-ui/react-langgraph": patch
---

fix: prevent duplicate "Used tool" cards when LangGraph emits `tool_call_chunks` with an empty `id` followed by a chunk with the real `id` at the same index. `appendLangChainChunk` now also merges by `index` when either side has an empty `id`, and the resulting entry keeps whichever `id` is non-empty. As a defense-in-depth, `convertLangChainMessages` also synthesizes a stable `lc-toolcall-${messageId}-${index}` id when a `tool_call` still arrives at the converter with an empty `id`.
