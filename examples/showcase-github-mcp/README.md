# showcase-github-mcp

A working showcase that wires three things together:

1. **An MCP server wrapping a slice of the GitHub REST API**, with OAuth via
   GitHub login (RFC 7591 dynamic client registration + PKCE on the MCP side,
   OAuth web flow against GitHub on the upstream side).
2. **An assistant-ui frontend** that configures this MCP connector through
   `@assistant-ui/react-mcp` and walks through the OAuth flow.
3. **Inline MCP App widgets** (language pie chart, 52-week commit heatmap,
   PR lanes board) returned by the GitHub-API tools and rendered with the
   native MCP Apps renderer in `@assistant-ui/react`.

> **Note on xmcp**: The original request mentioned xmcp. xmcp's built-in
> OAuth was deprecated in favor of provider plugins (Auth0 / Clerk / Better
> Auth / WorkOS), none of which fit a "log in directly with GitHub" demo
> cleanly. This example instead uses `@modelcontextprotocol/sdk`'s OAuth
> router directly. The file structure (`server/tools/...`) follows xmcp's
> filesystem convention so porting later is mechanical.

## Run it

### 1. Register a GitHub OAuth app

[Create a new OAuth app](https://github.com/settings/applications/new):

- **Homepage URL** — `http://localhost:8788`
- **Authorization callback URL** — `http://localhost:8788/oauth/github/callback`

Generate a client secret. Copy `.env.example` to `.env` at the example root
and fill in `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

### 2. Install and run

```sh
cd examples/showcase-github-mcp
pnpm dev
```

This boots:

- **MCP server** on `http://localhost:8788` (Express + `@modelcontextprotocol/sdk`)
- **Next.js app** on `http://localhost:3020`

Open the app, click **Connect with GitHub**, then **Authorize on GitHub ↗**.
After the redirect comes back to `/mcp/callback`, the connector transitions
to `connected` and you can fire tools.

## Tools

| Tool                  | Result                                        |
| --------------------- | --------------------------------------------- |
| `whoami`              | Authenticated GitHub user                     |
| `list_repos`          | User's accessible repositories (text)         |
| `repo_languages`      | Byte-level language breakdown → **pie chart** |
| `commit_activity`     | 52-week commit activity → **heatmap**         |
| `list_pull_requests`  | Open + draft PRs → **two-lane board**         |

The three visualization tools attach `_meta["ui/resourceUri"]` pointing at
an inline HTML widget. The Next.js app fetches the widget via the MCP
client's `resources/read`, mounts it in a sandboxed iframe, and pipes the
tool's `structuredContent` through to it via the MCP Apps JSON-RPC bridge.

## Architecture

```
            Next.js app                 MCP server (Express)
            ───────────                  ────────────────────
            <MCPProvider>                /.well-known/oauth-authorization-server
              <MCPAppProvider>           /authorize   ◄──┐
                <Showcase/>               /token         │   redirects to
                  │                       /register      │   github.com/login/oauth/authorize
                  │  callTool /            /oauth/github/callback
                  │  readResource          /mcp  ── bearerAuth ── McpServer
                  └─► through ──────────►  │
                      @assistant-ui/react-mcp                tools call api.github.com
                                                              with the bound user's token
```

Tokens minted by the MCP server are opaque and bound (in-memory) to a
GitHub access token + user. Refreshing the MCP token does **not** refresh
the GitHub token — for a real deployment, persist both and refresh GitHub
tokens out-of-band.

## What's intentionally minimal

- **In-memory state** — clients, codes, and tokens vanish on server
  restart. Drop in any store you like.
- **No chat / LLM yet** — the showcase fires tools manually so it works
  without an OpenAI/Anthropic key. The pieces are in place to plug a chat
  runtime on top: `useMcpTools()` returns the connected server's tools in a
  runtime-agnostic shape.
- **No styling library** — plain inline styles, so the moving parts stay
  visible.
