# Assistant-UI MCP Docs Server

A Model Context Protocol (MCP) server that provides AI assistants with direct access to assistant-ui's documentation and examples.

> **📖 Full Documentation**  
> For detailed installation instructions, troubleshooting, and advanced usage, visit the [complete documentation](https://www.assistant-ui.com/docs/mcp-docs-server).

## Installation

### Claude Code

```bash
# Add to current project
claude mcp add assistant-ui -- npx -y @assistant-ui/mcp-docs-server

# Or add globally for all projects
claude mcp add --scope user assistant-ui -- npx -y @assistant-ui/mcp-docs-server
```

### Claude Desktop

Add to your Claude Desktop configuration:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

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

### Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

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

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

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

### VSCode

Add to `~/.vscode/mcp.json` (Windows users: see [full docs](https://www.assistant-ui.com/docs/mcp-docs-server) for Windows-specific config):

```json
{
  "servers": {
    "assistant-ui": {
      "command": "npx",
      "args": ["-y", "@assistant-ui/mcp-docs-server"],
      "type": "stdio"
    }
  }
}
```

### Zed

Add to `settings.json` (open via `cmd+,` or `zed: open settings`):

```json
{
  "context_servers": {
    "assistant-ui": {
      "command": {
        "path": "npx",
        "args": ["-y", "@assistant-ui/mcp-docs-server"],
        "env": {}
      },
      "settings": {}
    }
  }
}
```

## Tools

- **assistantUIDocs** - Retrieve documentation by path
- **assistantUIExamples** - Access complete example projects

## Managing the Server

### Claude Code

```bash
# View configured servers
claude mcp list

# Get server details
claude mcp get assistant-ui

# Remove the server
claude mcp remove assistant-ui

# Restart the server
claude mcp restart assistant-ui
```

## License

MIT
