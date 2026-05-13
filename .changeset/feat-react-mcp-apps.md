---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
---

feat: add native MCP Apps renderer — `McpAppRenderer` composes into `Tools` to render MCP UI resources inline in chat over a JSON-RPC postMessage bridge on `SafeContentFrame`. Adds an `mcp` field to `ToolCallMessagePart` and forwards `callProviderMetadata.mcp.app` through the AI SDK message converter.
