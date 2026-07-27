---
"@assistant-ui/react-ag-ui": patch
---

feat: reconstruct `mcp.app` on tool-call parts in `fromAgUiMessages` when a structured `mcp.app` carrier or the `result._meta["ui/resourceUri"]` MCP-UI pointer is present on a restored tool message, so `getMcpAppFromToolPart` resolves the app instead of leaving `McpAppRenderer` on its fallback; end-to-end rehydration over the `@ag-ui/client` HTTP transport awaits the upstream `ToolMessageSchema` passthrough (agno-agi/agno#9087), which today strips both carriers before the adapter sees them