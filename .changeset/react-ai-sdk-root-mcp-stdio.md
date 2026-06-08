---
"@assistant-ui/react-ai-sdk": patch
---

fix(react-ai-sdk): make the package root bundle on edge, cloudflare workers, deno, and browsers, not just react native. the node-only stdio MCP transport is now resolved through a package.json "imports" condition (`#mcp-stdio`), so importing `@assistant-ui/react-ai-sdk` at root carries the full server toolkit on every target with http/sse MCP working on edge, while stdio MCP throws a clear runtime error only where a subprocess cannot be spawned (browser, react native, edge, workers) instead of breaking the build via `@ai-sdk/mcp/mcp-stdio` -> `node:child_process`. node, bun, and deno keep the real stdio transport.
