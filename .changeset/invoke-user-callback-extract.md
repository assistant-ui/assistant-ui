---
"@assistant-ui/core": patch
"@assistant-ui/react-a2a": patch
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/react-data-stream": patch
"@assistant-ui/react-langgraph": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-mcp": patch
"@assistant-ui/react-opencode": patch
"@assistant-ui/react-pi": patch
---

refactor: share the runtime lifecycle callback invoker from core internal.
synchronous throws from callbacks are now reported instead of escaping in the promise-variant adapters.
