---
"assistant-stream": patch
"@assistant-ui/react": patch
"@assistant-ui/react-data-stream": patch
"@assistant-ui/react-ag-ui": patch
---

feat: `injectDiscoveryWrappers` replaces `mergeDeferredToolsWithWarning` as the cache-safe fallback for adapters without native deferred loading. The wire payload now contains only eager tools plus two stable wrapper tools (`aui_discover_tools`, `aui_run_dynamic_tool`); deferred tools stay off the wire. Consumers using the fallback path must implement the two wrapper tools server-side, typically by dispatching into a registered `ToolCatalog`. `mergeDeferredToolsWithWarning` is deprecated and scheduled for removal in the next major.
