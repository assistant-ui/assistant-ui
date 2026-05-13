---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
---

feat: add native MCP Apps renderer — `MCPAppRenderer`, `MCPAppFrame`, `MCPAppToolUI`, and an `MCPAppProvider` for rendering MCP UI resources inline in chat, with a JSON-RPC postMessage bridge over `SafeContentFrame`. Adds an `mcp` field to `ToolCallMessagePart` and forwards `callProviderMetadata.mcp.app` through the AI SDK message converter.
