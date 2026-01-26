---
title: Testing MCP Apps
---

# Test Your MCP App

This guide covers two approaches for testing your MCP App: using the `basic-host` reference implementation for local development, or using an MCP Apps-compatible host like Claude\.ai or VS Code.

## Test with basic-host

The [`basic-host`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-host) example in this repository is a reference host implementation that lets you select a tool, call it, and see your App UI rendered in a sandboxed iframe.

**Prerequisites:**

- Node.js installed
- Your MCP server running locally (e.g., at `http://localhost:3001/mcp`)

**Steps:**

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/modelcontextprotocol/ext-apps.git
   cd ext-apps/examples/basic-host
   npm install
   ```

2. Start basic-host, pointing it to your MCP server:

   ```bash
   SERVERS='["http://localhost:3001/mcp"]' npm start
   ```

   To connect to multiple servers, list them in the array:

   ```bash
   SERVERS='["http://localhost:3001/mcp", "http://localhost:3002/mcp"]' npm start
   ```

3. Open http://localhost:8080 in your browser.

4. Select your server from the dropdown, then select a tool with UI support.

5. Enter any required tool input as JSON and click "Call Tool" to see your App render.

### Debugging with basic-host

The basic-host UI includes collapsible panels to help you debug your App:

- **Tool Input** — The JSON input sent to your tool
- **Tool Result** — The result returned by your tool
- **Messages** — Messages sent by your App to the model
- **Model Context** — Context updates sent by your App

For additional observability, open your browser's developer console. Basic-host logs key events with a `[HOST]` prefix, including server connections, tool calls, App initialization, and App-to-host requests.

## Test with an MCP Apps-compatible host

To test your App in a real conversational environment, install your MCP server in a host that supports MCP Apps:

- Claude\.ai
  - [Remote MCP servers (over HTTP)](https://claude.com/docs/connectors/custom/remote-mcp)
  - [Local MCP servers (over stdio)](https://claude.com/docs/connectors/custom/desktop-extensions)
- [VS Code (Insiders)](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Goose](https://block.github.io/goose/docs/getting-started/using-extensions/)

Once your server is configured, ask the agent to perform a task related to your App-enhanced tool. For example, if you have a weather App, ask the agent "Show me the current weather."

## Expose local servers with `cloudflared`

Remote hosts like Claude\.ai cannot reach `localhost`. To test a local HTTP server with a remote host, use [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/) to create a publicly accessible tunnel:

1. Start your MCP server locally (e.g., at `http://localhost:3001/mcp`).

2. Run `cloudflared` to expose your server:

   ```bash
   npx cloudflared tunnel --url http://localhost:3001
   ```

3. Copy the generated URL from the `cloudflared` output (e.g., `https://random-name.trycloudflare.com`).

4. Add that URL as a remote MCP server in your host, appending your MCP endpoint path (e.g., `https://random-name.trycloudflare.com/mcp`).

> [!NOTE]
> The tunnel URL changes each time you restart `cloudflared`.
