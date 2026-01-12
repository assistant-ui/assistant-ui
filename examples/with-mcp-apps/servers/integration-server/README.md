# Example: Integration Test Server

An MCP App example used for E2E integration testing.

## Overview

This example demonstrates all App SDK communication APIs and is used by the E2E test suite to verify host-app interactions:

- Tool registration with a linked UI resource
- React UI using the [`useApp()`](https://modelcontextprotocol.github.io/ext-apps/api/functions/_modelcontextprotocol_ext-apps_react.useApp.html) hook
- App communication APIs: [`callServerTool`](https://modelcontextprotocol.github.io/ext-apps/api/classes/app.App.html#callservertool), [`sendMessage`](https://modelcontextprotocol.github.io/ext-apps/api/classes/app.App.html#sendmessage), [`sendLog`](https://modelcontextprotocol.github.io/ext-apps/api/classes/app.App.html#sendlog), [`openLink`](https://modelcontextprotocol.github.io/ext-apps/api/classes/app.App.html#openlink)

## Key Files

- [`server.ts`](server.ts) - MCP server with tool and resource registration
- [`mcp-app.html`](mcp-app.html) / [`src/mcp-app.tsx`](src/mcp-app.tsx) - React UI using `useApp()` hook

## Getting Started

```bash
npm install
npm run dev
```

## How It Works

1. The server registers a `get-time` tool with metadata linking it to a UI HTML resource (`ui://get-time/mcp-app.html`).
2. When the tool is invoked, the Host renders the UI from the resource.
3. The UI uses the MCP App SDK API to communicate with the host and call server tools.
