---
"@assistant-ui/react-mcp": patch
---

fix: keep registered MCP tool names within provider limits while preserving their original server and tool routing.

Export `getMcpToolName` so custom tool renderers can use the same registered names.
