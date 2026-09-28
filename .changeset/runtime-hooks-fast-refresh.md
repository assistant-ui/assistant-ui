---
"@assistant-ui/core": patch
"@assistant-ui/react-a2a": patch
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/react-opencode": patch
"@assistant-ui/react-pi": patch
"@assistant-ui/eve": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/react-langgraph": patch
"@assistant-ui/react-google-adk": patch
---

fix: runtime hooks keep their clients, runs, queued sends and history loads across a fast refresh or a StrictMode replay instead of rebuilding or tearing them down; `useReplaySafeEffect` from `@assistant-ui/core/react` skips a cleanup and setup that run in the same tick with unchanged deps
