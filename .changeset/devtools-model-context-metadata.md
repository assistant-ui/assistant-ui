---
"@assistant-ui/react-devtools": patch
---

feat: surface full tool metadata (type, provider id, MCP server, providerOptions, deferred-results, backend defaults) in the devtools model context, and redact credentials (apiKey, authorization headers, tokens, MCP server headers/env) at the serializer boundary before they cross the postMessage bridge
