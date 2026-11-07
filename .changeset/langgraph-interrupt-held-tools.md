---
"@assistant-ui/react-langgraph": patch
"@assistant-ui/core": patch
---

Leave the tool calls a paused LangGraph interrupt is holding to the graph. `unstable_isClientToolCall` may now return `undefined` for a call an adapter cannot classify, so an adapter can name only the calls it knows are the provider's. Fixes #10295.
