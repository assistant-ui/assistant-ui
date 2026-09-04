---
"@assistant-ui/react-mcp": patch
---

fix: scope persisted authentication to MCP server URLs; a credential saved for a different URL is never sent and is reported on `lastError`, existing OAuth credentials require reconnecting once, and host-persisted bearer records must include `serverUrl`
