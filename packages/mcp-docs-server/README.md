# Assistant-UI MCP Docs Server

A Model Context Protocol (MCP) server that provides AI assistants with direct access to assistant-ui's documentation and examples.

## Installation

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "assistant-ui": {
      "command": "npx",
      "args": ["@assistant-ui/mcp-docs-server"]
    }
  }
}
```

### Windsurf

Add to `~/Library/Application Support/windsurf/mcp.json` on macOS or `%APPDATA%\windsurf\mcp.json` on Windows:

```json
{
  "mcpServers": {
    "assistant-ui": {
      "command": "npx",
      "args": ["@assistant-ui/mcp-docs-server"]
    }
  }
}
```

### Claude Desktop

Add to your Claude configuration:

```json
{
  "mcpServers": {
    "assistant-ui": {
      "command": "npx",
      "args": ["@assistant-ui/mcp-docs-server"]
    }
  }
}
```

## Tools

- **assistantUIDocs** - Retrieve documentation by path
- **assistantUIExamples** - Access complete example projects

## License

MIT