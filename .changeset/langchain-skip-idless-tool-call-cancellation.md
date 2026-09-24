---
"@assistant-ui/react-langchain": patch
---

fix: stop sending a cancellation without a `tool_call_id` for a pending tool call that has no id, which the graph rejects
