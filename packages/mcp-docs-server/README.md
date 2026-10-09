# `@assistant-ui/mcp-docs-server`

`@assistant-ui/mcp-docs-server` is a stdio proxy for the live hosted assistant-ui documentation MCP endpoint. It forwards JSON-RPC messages to `https://www.assistant-ui.com/mcp`, so stdio clients always use the current documentation without downloading a bundled snapshot.

## Zed

Add the server to your Zed settings:

```json
{
  "context_servers": {
    "assistant-ui": {
      "command": {
        "path": "npx",
        "args": ["-y", "@assistant-ui/mcp-docs-server"]
      }
    }
  }
}
```

## Claude Desktop

Add the server to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "assistant-ui": {
      "command": "npx",
      "args": ["-y", "@assistant-ui/mcp-docs-server"]
    }
  }
}
```

## HTTP clients

Clients that support Streamable HTTP should connect to `https://www.assistant-ui.com/mcp` directly.

## Endpoint override

Set `ASSISTANT_UI_MCP_URL` to override the hosted endpoint, for example when testing against a local MCP server.
