# with-mcp

Minimal harness for `@assistant-ui/react-mcp`. Runs a local MCP server with
OAuth (PKCE + DCR) under `server/`, and a Next.js client under `app/` that
uses the package's primitives.

## Run

```sh
cd examples/with-mcp
pnpm dev
```

This starts both the server (`http://localhost:8787`) and the Next.js app
(`http://localhost:3010`).

Open the app, click **Connect** on the "Local test MCP" connector, then
**Authorize ↗** to walk through the OAuth flow. After redirect the server
transitions to `connected` and the `echo` / `fingerprint` tools appear.

## Notes

- The test server is in-memory: tokens, clients, and codes don't persist
  across restarts.
- OAuth auto-approves (no consent screen). PKCE verification, DCR, and
  refresh-token rotation still run end-to-end.
- This example is intentionally unstyled; primitives are unstyled. See
  `app/app/McpUI.tsx` for raw composition.
