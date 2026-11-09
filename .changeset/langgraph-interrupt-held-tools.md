---
"@assistant-ui/react-langgraph": patch
"@assistant-ui/core": patch
---

leave the tool calls a paused LangGraph interrupt holds to the graph, and run them once the graph resumes and hands them back. in core, `unstable_isClientToolCall` may return `undefined` for a call an adapter can't classify, and a `false` answer on a settled snapshot now holds the call (no skip, no warning) and asks again on every later settled snapshot instead of skipping it for good. a `false` on a running snapshot still marks the call provider-owned. fixes #10295.
