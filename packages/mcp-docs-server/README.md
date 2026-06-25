# `@assistant-ui/mcp-docs-server`

Model Context Protocol (MCP) server that gives AI assistants direct access to assistant-ui's documentation and example projects. Exposes `assistantUIDocs` (retrieve documentation by path) and `assistantUIExamples` (access complete example projects), and serves the same docs and examples as readable MCP **resources** (`aui-docs:///{path}`, `aui-example:///{name}`).

> [!NOTE]
> Detailed installation, troubleshooting, and advanced usage at [assistant-ui.com/docs/llm#mcp](https://www.assistant-ui.com/docs/llm#mcp).

## Installation

### Claude Code

```bash
claude mcp add assistant-ui -- npx -y @assistant-ui/mcp-docs-server
# or globally for all projects
claude mcp add --scope user assistant-ui -- npx -y @assistant-ui/mcp-docs-server
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

### Cursor / Windsurf

Add to `.cursor/mcp.json` (or `~/.cursor/mcp.json`) for Cursor, or `~/.codeium/windsurf/mcp_config.json` for Windsurf, using the same `mcpServers` block as above.

### VS Code

Add to `.vscode/mcp.json`:

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

Add to `settings.json`:

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

To list, get, or remove the server, use your editor's MCP management commands.
