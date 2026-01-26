# Testing MCP Apps

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

- [Testing MCP Apps]()

# Test Your MCP App[](#test-your-mcp-app)

This guide covers two approaches for testing your MCP App: using the `basic-host` reference implementation for local development, or using an MCP Apps-compatible host like Claude.ai or VS Code.

## Test with basic-host[](#test-with-basic-host)

The [`basic-host`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-host) example in this repository is a reference host implementation that lets you select a tool, call it, and see your App UI rendered in a sandboxed iframe.

**Prerequisites:**

- Node.js installed

- Your MCP server running locally (e.g., at `http://localhost:3001/mcp`)

**Steps:**

- 
Clone the repository and install dependencies:

```
`git clone https://github.com/modelcontextprotocol/ext-apps.git
cd ext-apps/examples/basic-host
npm install
`Copy
```

- 
Start basic-host, pointing it to your MCP server:

```
`SERVERS='["http://localhost:3001/mcp"]' npm start
`Copy
```

To connect to multiple servers, list them in the array:

```
`SERVERS='["http://localhost:3001/mcp", "http://localhost:3002/mcp"]' npm start
`Copy
```

- 
Open [http://localhost:8080](http://localhost:8080) in your browser.

- 
Select your server from the dropdown, then select a tool with UI support.

- 
Enter any required tool input as JSON and click "Call Tool" to see your App render.

### Debugging with basic-host[](#debugging-with-basic-host)

The basic-host UI includes collapsible panels to help you debug your App:

- **Tool Input** — The JSON input sent to your tool

- **Tool Result** — The result returned by your tool

- **Messages** — Messages sent by your App to the model

- **Model Context** — Context updates sent by your App

For additional observability, open your browser's developer console. Basic-host logs key events with a `[HOST]` prefix, including server connections, tool calls, App initialization, and App-to-host requests.

## Test with an MCP Apps-compatible host[](#test-with-an-mcp-apps-compatible-host)

To test your App in a real conversational environment, install your MCP server in a host that supports MCP Apps:

- Claude.ai

[Remote MCP servers (over HTTP)](https://claude.com/docs/connectors/custom/remote-mcp)

- [Local MCP servers (over stdio)](https://claude.com/docs/connectors/custom/desktop-extensions)

- [VS Code (Insiders)](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)

- [Goose](https://block.github.io/goose/docs/getting-started/using-extensions/)

Once your server is configured, ask the agent to perform a task related to your App-enhanced tool. For example, if you have a weather App, ask the agent "Show me the current weather."

## Expose local servers with `cloudflared`[](#expose-local-servers-with)

Remote hosts like Claude.ai cannot reach `localhost`. To test a local HTTP server with a remote host, use [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/) to create a publicly accessible tunnel:

- 
Start your MCP server locally (e.g., at `http://localhost:3001/mcp`).

- 
Run `cloudflared` to expose your server:

```
`npx cloudflared tunnel --url http://localhost:3001
`Copy
```

- 
Copy the generated URL from the `cloudflared` output (e.g., `https://random-name.trycloudflare.com`).

- 
Add that URL as a remote MCP server in your host, appending your MCP endpoint path (e.g., `https://random-name.trycloudflare.com/mcp`).

Note

The tunnel URL changes each time you restart `cloudflared`.

### Settings

Member Visibility
- Protected
- Inherited
- External

ThemeOSLightDark
### On This Page

[Test Your MCP App](#test-your-mcp-app)
- [Test with basic-host](#test-with-basic-host)
- 
[Debugging with basic-host](#debugging-with-basic-host)

- [Test with an MCP Apps-compatible host](#test-with-an-mcp-apps-compatible-host)
- [Expose local servers with ](#expose-local-servers-with)

[GitHub](https://github.com/modelcontextprotocol/ext-apps)[Specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)[@modelcontextprotocol/ext-apps - v1.0.0](../modules.html)
- Loading...