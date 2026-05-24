---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/react-data-stream": patch
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/react-langgraph": patch
"@assistant-ui/react-google-adk": patch
"assistant-stream": patch
---

feat: progressive tool disclosure via `deferLoading` + `deferredTools` slot on `ModelContext`. `react-ai-sdk` translates to Anthropic's `defer_loading` + Tool Search Tool; other adapters fall back with a one-time console warning past 50 deferred tools.
