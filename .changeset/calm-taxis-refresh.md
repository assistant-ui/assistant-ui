---
"@assistant-ui/react": patch
---

fix: refresh MCP App resources when the host changes

Custom `McpAppsHost` resources must now return a stable object identity (for
example, with `useMemo`); an unstable host keeps the widget in
`loadingFallback` and refetches on every re-render.
