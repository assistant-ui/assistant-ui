This is the [assistant-ui](https://github.com/assistant-ui/assistant-ui) MCP starter project. It connects the chat to a Model Context Protocol server for tools and renders [MCP Apps](https://apps.extensions.modelcontextprotocol.io/) (sandboxed UI widgets attached to tool calls) inline.

## Getting Started

Add your OpenAI API key to `.env.local`:

```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Point the MCP client at your server in `app/api/mcp-client.ts` (default: `http://localhost:8000/mcp`).

Run the dev server:

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it's wired

- `app/api/mcp-client.ts` — lazy-creates a single `@ai-sdk/mcp` client used by both routes below.
- `app/api/chat/route.ts` — chat route. Pulls tools from the MCP server (`client.tools()`) and forwards them to the model.
- `app/api/mcp-apps/route.ts` — the MCP Apps host route. The renderer POSTs `{ method, params }` here for `mcp-apps/read-resource`, `tools/call`, `resources/read`, and `resources/list`.
- `app/assistant.tsx` — composes `McpAppRenderer({ host: McpAppsRemoteHost({ url: "/api/mcp-apps" }) })` into the `Tools` resource so any tool call whose part carries `mcp.app` metadata renders its widget inline.

When the MCP server attaches a `_meta.ui.resourceUri` (`text/html;profile=mcp-app`) to a tool, AI SDK forwards it through `callProviderMetadata.mcp.app`; `@assistant-ui/react-ai-sdk` lifts it onto `ToolCallMessagePart.mcp.app`; the renderer picks it up and mounts the widget in a sandboxed iframe with a JSON-RPC bridge. See the [MCP Apps guide](https://www.assistant-ui.com/docs/guides/mcp-apps) for the full protocol.
