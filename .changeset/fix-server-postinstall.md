---
"mcp-app-studio": patch
---

fix(cli): auto-install server dependencies and update peer dependencies

- **Auto-install server dependencies**: When creating a project with MCP server included, the CLI now injects a `postinstall` script that automatically runs `npm install` in the server directory. This eliminates the need for users to manually run `cd server && npm install` as a separate step.

- **Fix peer dependency conflicts**: Updates `@assistant-ui/react`, `@assistant-ui/react-ai-sdk`, and `@assistant-ui/react-markdown` to compatible versions, resolving npm's `ERESOLVE` errors during installation.

- **Fix appComponent export**: Generated `component-registry.tsx` now properly exports `appComponent`, fixing the import error in `workbench-shell.tsx`.
