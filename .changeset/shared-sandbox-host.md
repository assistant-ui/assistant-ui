---
"@assistant-ui/react": patch
---

refactor: extract a shared sandbox host (SafeContentFrame lifecycle, the single cross-origin guarded message listener, auto-resize) and reuse it for the MCP app frame, with no behavior change
