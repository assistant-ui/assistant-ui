---
"@assistant-ui/mcp-docs-server": patch
---

fix: close the docs proxy and its HTTP transport once stdin can no longer deliver messages, whether it reaches EOF or is destroyed
