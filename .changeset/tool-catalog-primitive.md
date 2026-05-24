---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react-ai-sdk": patch
"assistant-stream": patch
---

feat: `useToolCatalog({ catalogId, search, describe, execute })` registers a dynamic tool catalog that never enters `ModelContext.tools`. On Anthropic, the catalog drives custom Tool Search via `tool_reference` blocks; on OpenAI, it drives client-executed `tool_search`; on generic providers, it falls through to the stable discovery wrappers (Phase 5).
