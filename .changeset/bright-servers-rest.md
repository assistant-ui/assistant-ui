---
"@assistant-ui/react-mcp": patch
---

fix: scope persisted authentication to MCP server URLs; existing OAuth credentials require reconnecting once, and host-persisted bearer records must include `serverUrl`
