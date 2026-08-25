---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/eve": patch
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-langgraph": patch
---

refactor: derive executing-tool running state inside the external-store runtime; adapters now pass raw provider isRunning.
the assistant transport runtime enables tool invocations too, so it now keeps the thread running while a client tool executes instead of reporting idle.
