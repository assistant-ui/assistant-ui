---
"mcp-app-studio": minor
---

Add universal MCP/ChatGPT SDK with platform auto-detection.

- Rename package from chatgpt-app-studio to mcp-app-studio
- Add core abstraction layer with types, capabilities, and bridge interface
- Implement ChatGPT bridge wrapping window.openai API
- Implement MCP bridge using @modelcontextprotocol/ext-apps SDK
- Add universal provider with auto-detection for runtime platform
- Create React hooks for both platforms (useHostContext, useToolInput, etc.)
- Add multi-entry build (core, chatgpt, mcp exports)

New exports:
- mcp-app-studio (universal SDK with auto-detection)
- mcp-app-studio/core (types and interfaces)
- mcp-app-studio/chatgpt (ChatGPT-specific implementation)
- mcp-app-studio/mcp (MCP-specific implementation)
