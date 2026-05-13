---
"@assistant-ui/react-ai-sdk": patch
---

fix(react-ai-sdk): resolve MCP app metadata from tool output `_meta["ui/resourceUri"]` as a fallback when it isn't present in `callProviderMetadata.mcp.app`. MCP-UI tools (e.g. xmcp) surface the UI pointer in the call result, so the renderer previously never picked it up.
