---
"assistant-stream": patch
"@assistant-ui/react-data-stream": patch
"@assistant-ui/react-ag-ui": patch
---

feat: `injectDiscoveryWrappers` is the cache-safe fallback for adapters without native deferred loading. The wire payload contains only eager tools plus two stable wrapper tools (`aui_discover_tools`, `aui_run_dynamic_tool`); deferred tools stay off the wire. Consumers using the fallback path must implement the two wrapper tools server-side. `mergeDeferredToolsWithWarning` remains available for adapters that execute tools client-side (langgraph, google-adk, data-stream).
