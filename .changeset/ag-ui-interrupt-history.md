---
"@assistant-ui/react-ag-ui": patch
---

Keep an answered AG-UI interrupt, and a tool result or MCP app snapshot that arrives later, after a reload. The settled message is now written through the history adapter's `update`, also while its first `append` is still pending.
