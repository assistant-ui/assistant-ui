---
"@assistant-ui/react-mcp": patch
---

fix: ask before running connected MCP tools by default. A custom renderer for an MCP tool must handle the approval interrupt and call `resume({ approved })`, or the server can set `requireApproval: false`.
