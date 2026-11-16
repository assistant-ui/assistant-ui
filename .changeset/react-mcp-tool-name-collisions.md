---
"@assistant-ui/react-mcp": patch
---

fix: when two different MCP tools map to the same registered name, whether through the `serverId__toolName` format (connector `a_` with tool `b` and connector `a` with tool `_b`) or a hash collision, neither is registered and a warning names it.
