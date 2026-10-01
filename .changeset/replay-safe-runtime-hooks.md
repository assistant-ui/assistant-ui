---
"@assistant-ui/core": patch
"@assistant-ui/react-langgraph": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/react-opencode": patch
---

fix: the remaining runtime hooks keep their thread loads, runs, queued messages, subagent transcripts and event streams across a fast refresh or a StrictMode replay instead of tearing them down
