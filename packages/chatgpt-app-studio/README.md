# ChatGPT App Studio

**Local development environment for ChatGPT Apps.**

OpenAI's [Apps SDK](https://developers.openai.com/apps-sdk/) lets you build interactive widgets for ChatGPT, but there's no local dev environment — you have to deploy to test. This tool fixes that.

## What You Get

- **Local workbench** — Preview widgets without deploying to ChatGPT
- **`window.openai` simulation** — Full API shim matching production behavior
- **Mock tool responses** — Test your UI with configurable data
- **One-command export** — Generate production bundle + MCP server

## Quick Start

```bash
npx chatgpt-app-studio my-app
cd my-app
npm install
npm run dev
```

Open http://localhost:3000 — you're in the workbench.

## Workflow

```
1. DEVELOP     npm run dev       Edit widgets, test with mock tools
2. EXPORT      npm run export    Generate widget bundle + manifest
3. DEPLOY      Your choice       Vercel, Netlify, any static host
4. REGISTER    ChatGPT dashboard Connect your MCP server
```

## Generated Project

```
my-app/
├── app/                    Next.js app
├── components/
│   └── examples/           POI Map widget (working example)
├── lib/
│   ├── workbench/          Dev environment + React hooks
│   └── export/             Production bundler
└── server/                 MCP server (if selected)
```

## React Hooks

The workbench provides React hooks that work identically in dev and production:

```tsx
import { useToolInput, useCallTool, useTheme } from "@/lib/workbench";

function MyWidget() {
  const input = useToolInput<{ query: string }>();
  const callTool = useCallTool();
  const theme = useTheme();

  // Your widget code
}
```

Full reference: [`lib/workbench/README.md`](templates/starter/lib/workbench/README.md)

## Export Output

```bash
npm run export
```

Generates:

```
export/
├── widget/
│   └── index.html      Self-contained widget (deploy to static host)
├── manifest.json       ChatGPT App manifest
└── README.md           Deployment instructions
```

## MCP Server

If you selected "Include MCP server" during setup:

```bash
cd server
npm install
npm run dev          # http://localhost:3001/mcp
npm run inspect      # Test with MCP Inspector
```

The generated server uses [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) with proper tool handlers.

## Deployment

**Widget**: Any static host (Vercel, Netlify, Cloudflare Pages, S3)

**MCP Server**: Any Node.js host or serverless platform

After deploying:

1. Update `manifest.json` with your widget URL
2. Register at [ChatGPT Apps dashboard](https://chatgpt.com/apps)
3. Test in a new ChatGPT conversation

## Learn More

- [ChatGPT Apps SDK docs](https://developers.openai.com/apps-sdk/) — What are ChatGPT Apps, how they work
- [Apps SDK Reference](https://developers.openai.com/apps-sdk/reference/) — `window.openai` API, tool schemas
- [MCP Specification](https://modelcontextprotocol.io/specification/) — Model Context Protocol details

## Notes

### Dark Mode

Exported widgets inherit the host's theme. Your CSS should respond to the `.dark` class:

```css
.dark .my-element {
  background: #1a1a1a;
}
```

### MCP Server CORS

The generated server uses permissive CORS (`*`) by default. For production:

```bash
# In server/.env
CORS_ORIGIN=https://your-widget-domain.com
```

## License

MIT
