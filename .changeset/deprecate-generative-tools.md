---
"@assistant-ui/react-ai-sdk": patch
---

chore: deprecate `generativeTools` in favor of `AISDKToolkit`

`generativeTools({ toolkit, frontendTools })` is deprecated. Use `new AISDKToolkit({ toolkit }).tools({ frontend })` instead: it is a strict superset that also opens MCP server connections, so it replaces `generativeTools` for every toolkit. The `frontendTools` option is named `frontend` on `.tools()`, and `.tools()` is async. `generativeTools` keeps working and will be removed in a future version.
