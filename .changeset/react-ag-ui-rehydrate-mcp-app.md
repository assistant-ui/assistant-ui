---
"@assistant-ui/react-ag-ui": patch
---

feat: reconstruct `mcp.app` on restored tool-call parts in `fromAgUiMessages` from the `_meta["ui/resourceUri"]` MCP-UI pointer, so `getMcpAppFromToolPart` resolves the app on restored history instead of leaving `McpAppRenderer` on its fallback; effective for transports that preserve `_meta` (the standard `@ag-ui/client` HTTP transport strips it until upstream `ToolMessageSchema` gains a passthrough, agno-agi/agno#9087)
