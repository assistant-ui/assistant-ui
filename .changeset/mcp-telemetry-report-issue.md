---
"@assistant-ui/mcp-docs-server": patch
---

feat(mcp-docs-server): add MCP tool-call telemetry and report-issue tool

- Add lightweight PostHog analytics for tool calls (tool name, status, duration, failure category, transport, server/client versions).
- Add an `assistantUIReportIssue` tool that returns a GitHub issue template; telemetry is a no-message-body signal event.
- Telemetry is enabled by default with the bundled project key and can be disabled via `ASSISTANT_UI_MCP_TELEMETRY=false`.
