# Xulux Coding Agent API

Backend for the Xulux coding agent. Provisions Blaxel cloud sandboxes and scaffolds assistant-ui starter projects.

## Routes

- `POST /api/xulux/chat` — main chat route
- Frontend page: `/xulux`

## Request body

```ts
{
  messages: UIMessage[];
  sessionId: string;       // fresh UUID per page load — each session gets a new sandbox
  tools?: Record<string, ...>; // optional frontend tools
  system?: string;         // optional page context
  config?: { modelName?: string };
}
```

## Agent tools

| Tool | Side | Description |
|---|---|---|
| `provisionSandbox` | server | Creates a new Blaxel sandbox from `BL_SANDBOX_TEMPLATE`. Returns `{ status, workingDir, previewUrl }`. |
| `exec` | server | Runs any shell command in the sandbox. Use for read/write files, install deps, start servers. Dev server must bind to `0.0.0.0`. |
| `refreshCanvas` | server | Fetches the public preview URL from Blaxel and returns `{ url }` to the client. |
| `listDocs` | server | Browse assistant-ui docs and examples structure (including `/examples`). |
| `readDoc` | server | Read a full docs or examples page by slug or URL. |
| `bash` | server | Run commands against the static monorepo source snapshot at `/repo`. |
| `readFile` | server | Read a file from the static monorepo source snapshot at `/repo`. |

## Sandbox behaviour

- Each page load generates a fresh `sessionId` (via `crypto.randomUUID()`) — no sessionStorage persistence
- `provisionSandbox` calls Blaxel's `SandboxInstance.createIfNotExists` with the template image
- Preview URLs are created via `sandbox.previews.createIfNotExists({ spec: { port: 3000, public: true } })` — publicly accessible, no auth required in the browser
- Dev server must start with `--host 0.0.0.0 --port 3000` to be reachable via the preview URL

## Environment variables

```
BL_WORKSPACE=
BL_API_KEY=
BL_SANDBOX_TEMPLATE=   # sandbox image to provision from
BL_REGION=             # optional, defaults to us-pdx-1
OPENAI_API_KEY=
```

## TODO: Frontend canvas component

A frontend component needs to be built to consume the `refreshCanvas` tool result and render the sandbox preview.

When the agent calls `refreshCanvas`, the tool result contains `{ url: string }` — a publicly accessible Blaxel preview URL. The frontend should:

1. Listen for `refreshCanvas` tool results in the message stream
2. Store the URL in local state
3. Render an `<iframe src={url} />` (or a dedicated canvas panel) that updates whenever the URL changes

The `provisionSandbox` tool result also contains `previewUrl` for immediate display before the agent calls `refreshCanvas`.

Wire this up on the client using assistant-ui's frontend tool mechanism (`tools` field in the request body) or by reading tool result parts from the message stream.
