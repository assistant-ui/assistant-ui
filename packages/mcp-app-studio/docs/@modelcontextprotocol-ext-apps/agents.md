# MCP Apps SDK

## Project Overview

MCP Apps SDK (`@modelcontextprotocol/ext-apps`) enables MCP servers to display interactive UIs in conversational clients.

Key abstractions:

- **View** - UI running in an iframe, uses `App` class with `PostMessageTransport` to communicate with host
- **Host** - Chat client embedding the iframe, uses `AppBridge` class to proxy MCP requests
- **Server** - MCP server that registers tools/resources with UI metadata

Specification (stable): `specification/2026-01-26/apps.mdx`

## Commands

```bash
# Install dependencies
npm install

# Build the SDK only (generates schemas + bundles, does not build examples)
npm run build

# Build everything (SDK + all examples)
npm run build:all

# Type check + build a single example
npm run --workspace examples/<example-name> build

# Run all examples (starts server at http://localhost:8080)
npm start

# Run E2E tests (primary testing mechanism - starts examples server automatically)
npm run test:e2e

# Run unit tests (E2E tests have broader coverage; unit tests cover specific modules)
npm test

# Check JSDoc comment syntax and `{@link}` references
npm exec typedoc -- --treatValidationWarningsAsErrors --emit none

# Regenerate package-lock.json (especially on setups w/ custom npm registry)
rm -fR  package-lock.json node_modules && \
  docker run  --rm -it --platform linux/amd64 -v $PWD:/src:rw -w /src node:latest npm i && \
  rm -fR node_modules && \
  npm  i  --cache=~/.npm-mcp-apps --registry=https://registry.npmjs.org/
```

## Architecture

### SDK Entry Points

- `@modelcontextprotocol/ext-apps` - Main SDK for Apps (`App` class, `PostMessageTransport`)
- `@modelcontextprotocol/ext-apps/react` - React hooks (`useApp`, `useHostStyleVariables`, etc.)
- `@modelcontextprotocol/ext-apps/app-bridge` - SDK for hosts (`AppBridge` class)
- `@modelcontextprotocol/ext-apps/server` - Server helpers (`registerAppTool`, `registerAppResource`)

### Key Source Files

- `src/app.ts` - `App` class extends MCP Protocol, handles guest initialization, tool calls, messaging
- `src/app-bridge.ts` - `AppBridge` class for hosts, proxies MCP requests, sends tool input/results to guests
- `src/server/index.ts` - Helpers for MCP servers to register tools/resources with UI metadata
- `src/types.ts` - Protocol types re-exported from `spec.types.ts` and Zod schemas from `generated/schema.ts` (auto-generated during build)
- `src/message-transport.ts` - `PostMessageTransport` for iframe communication
- `src/react/` - React hooks: `useApp`, `useHostStyles`, `useAutoResize`, `useDocumentTheme`

### Protocol Flow

```
View (App) <--PostMessageTransport--> Host (AppBridge) <--MCP Client--> MCP Server
```

1. Host creates iframe with view HTML
2. View creates `App` instance and calls `connect()` with `PostMessageTransport`
3. View sends `ui/initialize` request, receives host capabilities and context
4. Host sends `sendToolInput()` with tool arguments after initialization
5. View can call server tools via `app.callServerTool()` or send messages via `app.sendMessage()`
6. Host sends `sendToolResult()` when tool execution completes
7. Host calls `teardownResource()` before unmounting iframe

## Documentation

JSDoc `@example` tags should pull type-checked code from companion `.examples.ts` files (e.g., `app.ts` → `app.examples.ts`). Use ` ```ts source="./file.examples.ts#regionName" ` fences referencing `//#region regionName` blocks; region names follow `exportedName_variant` or `ClassName_methodName_variant` pattern (e.g., `useApp_basicUsage`, `App_hostCapabilities_checkAfterConnection`). For whole-file inclusion (any file type), omit the `#regionName`. Run `npm run sync:snippets` to sync.

Standalone docs in `docs/` (listed in `typedoc.config.mjs` `projectDocuments`) can also have type-checked companion `.ts`/`.tsx` files using the same pattern.

## Full Examples

Uses npm workspaces. Full examples in `examples/` are separate packages:

- `basic-server-*` - Starter templates (vanillajs, react, vue, svelte, preact, solid). Use these as the basis for new examples.
- `basic-host` - Reference host implementation
- Other examples showcase specific features (charts, 3D, video, etc.)

## Claude Code Plugin

The `plugins/mcp-apps/` directory contains a Claude Code plugin distributed via the plugin marketplace. It provides the following Claude Code skills files:

- `plugins/mcp-apps/skills/create-mcp-app/SKILL.md` — for creating an MCP App
- `plugins/mcp-apps/skills/migrate-oai-app/SKILL.md` — for migrating an app from the OpenAI Apps SDK to the MCP Apps SDK
