# `@assistant-ui/mcp-docs-server`

Model Context Protocol (MCP) server that gives AI assistants direct access to assistant-ui's documentation, example projects, and the **Build a Generative UI Assistant** course. Exposes `assistantUIDocs`, `assistantUIExamples`, `assistantUISearch`, `assistantUICourse`, and `assistantUICourseCertificate`, and serves docs/examples as readable MCP **resources** (`aui-docs:///{path}`, `aui-example:///{name}`).

> [!NOTE]
> Detailed installation, troubleshooting, and advanced usage at [assistant-ui.com/docs/llm#mcp](https://www.assistant-ui.com/docs/llm#mcp).

## Build a Generative UI Assistant course

The package includes eight ordered lessons under
`course/build-generative-ui-assistant/`. Call `assistantUICourse` without
arguments for the overview, then call it with `{ "step": 1 }` through
`{ "step": 8 }` for the full lesson Markdown, focus files, documentation and
example hints, and the fixed teaching wrapper. The course is designed for an
agent to implement in the learner's real workspace and explain each diff; it
does not use a `courseId` or progress API. Step 1 starts from a plain Next.js
baseline without an assistant-ui starter.

After step 8, call `assistantUICourseCertificate` with `{ "name": "..." }`.
It writes a completion PNG into a newly created operating-system temporary
directory and returns its absolute local path. The name is never used as part
of the output path.

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
