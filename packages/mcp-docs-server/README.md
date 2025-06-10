# Assistant-UI MCP Docs Server

A Model Context Protocol (MCP) server that provides AI assistants with direct access to assistant-ui's documentation and examples.

## Installation

### Claude Code

#### Option 1: Using the CLI (Recommended)

```bash
# Add the server to your project
claude mcp add assistant-ui -- npx @assistant-ui/mcp-docs-server

# Or add it globally for all projects
claude mcp add --global assistant-ui -- npx @assistant-ui/mcp-docs-server
```

#### Option 2: Manual Configuration

Add to `.mcp.json` in your project root:

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