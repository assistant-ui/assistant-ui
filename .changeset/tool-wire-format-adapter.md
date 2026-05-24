---
"assistant-stream": patch
"@assistant-ui/react-ai-sdk": patch
---

feat: `ToolWireFormatAdapter` interface in `assistant-stream`. `AssistantChatTransport` accepts `toolWireFormat: "anthropic" | "openai" | "generic" | ToolWireFormatAdapter` to choose how `(tools, deferredTools)` are translated into the request body. Default remains Anthropic; no behavior change for existing consumers.
