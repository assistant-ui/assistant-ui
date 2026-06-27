---
"@assistant-ui/react-ai-sdk": patch
---

feat: support AI SDK v7. bump `ai` to `^7`, `@ai-sdk/react` to `^4`, and `@ai-sdk/mcp` to `^2`, and convert the two new v7 `UIMessage` part variants the inbound converter previously dropped: `reasoning-file` becomes a file thread part, and `custom` becomes a data thread part named by its `kind`.
