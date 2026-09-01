---
"@assistant-ui/core": patch
"@assistant-ui/react-google-adk": patch
---

fix: never execute a frontend tool on a tool call ADK resolves itself; a client-executed tool must be registered as a `LongRunningFunctionTool` on the agent
