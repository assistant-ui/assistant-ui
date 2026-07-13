---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
---

feat: preserve providerMetadata on text, reasoning, and tool-call message parts

The AI SDK message converter already kept `providerMetadata` on source parts but
dropped it on text, reasoning, and tool-call parts (where the AI SDK surfaces it
as `callProviderMetadata`). Provider- or app-scoped metadata such as agent
attribution now survives the conversion to assistant-ui messages.
