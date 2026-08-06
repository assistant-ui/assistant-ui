# `@assistant-ui/mcp-docs-server`

Model Context Protocol (MCP) server that gives AI assistants direct access to assistant-ui's documentation, example projects, and the interactive **Build a Generative UI Assistant** course. Exposes `assistantUIDocs`, `assistantUIExamples`, `assistantUISearch`, `assistantUICourse`, and `assistantUICourseCertificate`, and serves docs/examples as readable MCP **resources** (`aui-docs:///{path}`, `aui-example:///{name}`).

> [!NOTE]
> Detailed installation, troubleshooting, and advanced usage at [assistant-ui.com/docs/llm#mcp](https://www.assistant-ui.com/docs/llm#mcp).

## Course tools

The package ships a fixed eight-step course, **Build a Generative UI Assistant**, under `course/build-generative-ui-assistant/`.

### `assistantUICourse`

Call with no arguments for the course overview and lesson list. Call with
`{ "step": N }` where `N` is `1`–`8` to load that lesson (full Markdown, focus
files, docs/example hints, and the teaching wrapper).

Do not pass `courseId`. There is a single fixed course.

### `assistantUICourseCertificate`

After the final lesson, ask the learner for a name, then call
`{ "name": "..." }`. The tool writes a PNG under the user cache directory and
returns the absolute file path.

```text
Linux:   ~/.cache/assistant-ui/course/certificates/
macOS:   ~/Library/Caches/assistant-ui/course/certificates/
Windows: %LOCALAPPDATA%\\assistant-ui\\course\\certificates\\
```

### Typical agent flow

1. `assistantUICourse` → overview
2. `assistantUICourse` with `{ "step": 1 }` … `{ "step": 8 }`
3. Use `assistantUIDocs` / `assistantUIExamples` when a lesson asks for them
4. On step 8, ask for a name → `assistantUICourseCertificate`

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
