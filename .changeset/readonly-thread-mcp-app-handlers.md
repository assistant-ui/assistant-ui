---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

fix: a readonly thread ignores mutations instead of throwing, and an MCP App uses the caller's callTool, readResource and listResources handlers when given

a stored conversation rendered through ReadonlyThreadProvider no longer throws when a tool UI adds a result, answers an approval or submits feedback, and a host rendering stored MCP Apps can answer the widget's data calls itself.
