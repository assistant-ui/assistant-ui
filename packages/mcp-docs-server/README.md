# `@assistant-ui/mcp-docs-server`

Model Context Protocol (MCP) server that gives AI assistants direct access to assistant-ui's documentation and example projects. Exposes `assistantUIDocs` (retrieve documentation by path), `assistantUIExamples` (access complete example projects), and `assistantUISearch` (keyword search across the bundled docs), and serves the same docs and examples as readable MCP **resources** (`aui-docs:///{path}`, `aui-example:///{name}`).

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

## Telemetry

The server reports lightweight, privacy-conscious usage analytics to PostHog — the same project used by the assistant-ui docs app. This helps the team understand which tools are used and where they fail.

Telemetry is **enabled by default**. Disable it by setting the environment variable before starting the server:

- `ASSISTANT_UI_MCP_TELEMETRY=false` — opt-out switch. Use `false`, `0`, `off`, or `no` to disable all telemetry. Any other value leaves telemetry on.
- `ASSISTANT_UI_POSTHOG_API_KEY` — optional. Override the default assistant-ui PostHog project API key.
- `ASSISTANT_UI_POSTHOG_HOST` — optional. Override the default PostHog host (`https://us.i.posthog.com`).

Example (opt-out):

```bash
ASSISTANT_UI_MCP_TELEMETRY=false npx -y @assistant-ui/mcp-docs-server
```

### What is captured

When enabled, the server emits one `MCP Tool Call` event per tool execution with only these fields: `tool_name`, `status` (`success | soft_fail | failed | aborted`), `duration_ms`, `failure_category` (when applicable), `transport`, `server_version`, `mcp_client_name`, `mcp_client_version`, and `mcp_protocol_version`.

It also exposes an `assistantUIReportIssue` tool that agents can call to report problems they cannot resolve. A `MCP Report Issue` signal event is recorded when the tool is used. The signal contains no message body and no tool arguments.

Events are sent with a single anonymous, per-process identifier (`$process_person_profile: false` is set so PostHog does not create person profiles).

### What is never captured

Free-text tool arguments, prompts, generated code, response bodies, preview URLs, tokens, headers, raw errors, and stack traces are never sent to PostHog. The `assistantUIReportIssue` tool is always exposed; its telemetry signal carries no message body and no caller-supplied values.
