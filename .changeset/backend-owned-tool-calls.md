---
"assistant-stream": patch
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/react-langchain": patch
"@assistant-ui/eve": patch
---

never run a frontend tool's `execute` for a tool call the backend owns. Tool-call parts gain `providerExecuted`: the tool invocation tracker, `ToolExecutionStream` and `unstable_runPendingTools` skip a call that carries it, even when the run ends before the backend's result arrives. UI message streams set it for provider-executed and dynamic (MCP) calls, and `@assistant-ui/ai-sdk` sets it from the same AI SDK part fields. `@assistant-ui/react-langchain` holds a call while the graph is paused on an interrupt, and `@assistant-ui/eve` never hands a call to a frontend tool.
