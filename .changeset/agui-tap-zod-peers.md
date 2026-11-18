---
"@assistant-ui/eve": patch
"@assistant-ui/react-a2a": patch
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/react-data-stream": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-hook-form": patch
"@assistant-ui/react-ink-markdown": patch
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-langgraph": patch
"@assistant-ui/react-opencode": patch
"@assistant-ui/react-pi": patch
"@assistant-ui/vscode": patch
---

Adapters that install `@assistant-ui/core` declare `@assistant-ui/store` and `@assistant-ui/tap` as peers, so strict installers such as Yarn PnP resolve the single copy the app provides.
