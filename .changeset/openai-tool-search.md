---
"assistant-stream": patch
"@assistant-ui/react-ai-sdk": patch
---

feat: OpenAI Tool Search support. `openaiToolSearchAdapter()` translates `deferredTools` to a `{ type: "tool_search" }` entry plus per-tool `providerOptions.openai.deferLoading`. `AssistantChatTransport` auto-detects the provider from `context.config.modelName` and routes to the matching adapter; pass `toolWireFormat: "openai" | "anthropic" | "auto"` to override.
