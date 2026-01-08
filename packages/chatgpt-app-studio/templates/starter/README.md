# My ChatGPT App

Built with [ChatGPT App Studio](https://github.com/assistant-ui/assistant-ui/tree/main/packages/chatgpt-app-studio).

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you're in the workbench.

## Commands

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `npm run dev`    | Start workbench (Next.js + MCP server)   |
| `npm run build`  | Production build                         |
| `npm run export` | Generate widget bundle for ChatGPT       |

## Project Structure

```
app/                        Next.js pages
components/
├── examples/               Example widgets (POI Map)
├── workbench/              Workbench UI components
└── ui/                     Shared UI components
lib/
├── workbench/              React hooks + dev environment
└── export/                 Production bundler
server/                     MCP server (if included)
```

## Building Your Widget

### 1. Create a component

```tsx
// components/my-widget/index.tsx
import { useToolInput, useCallTool, useTheme } from "@/lib/workbench";

export function MyWidget() {
  const input = useToolInput<{ query: string }>();
  const callTool = useCallTool();
  const theme = useTheme();

  const handleSearch = async () => {
    const result = await callTool("search", { query: input.query });
    console.log(result.structuredContent);
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <p>Query: {input.query}</p>
      <button onClick={handleSearch}>Search</button>
    </div>
  );
}
```

### 2. Register in the workbench

Add your component to `lib/workbench/component-registry.tsx`.

### 3. Add mock data

Configure mock tool responses in `lib/workbench/mock-config/`.

### React Hooks Reference

Full documentation: [`lib/workbench/README.md`](lib/workbench/README.md)

**Reading state:**
- `useToolInput<T>()` — Input from the tool call
- `useToolOutput<T>()` — Response from most recent tool call
- `useTheme()` — `"light"` or `"dark"`
- `useDisplayMode()` — `"inline"`, `"pip"`, or `"fullscreen"`
- `useWidgetState<T>()` — Persistent widget state

**Calling methods:**
- `useCallTool()` — Call MCP tools
- `useRequestDisplayMode()` — Request display mode change
- `useSendFollowUpMessage()` — Send message to ChatGPT
- `useOpenExternal()` — Open URL in new tab

## Exporting for Production

```bash
npm run export
```

Generates:

```
export/
├── widget/
│   └── index.html      Self-contained widget
├── manifest.json       ChatGPT App manifest
└── README.md           Deployment instructions
```

## Deploying

### Widget

Deploy `export/widget/` to any static host:

```bash
# Vercel
cd export/widget && vercel deploy

# Netlify
netlify deploy --dir=export/widget

# Or any static host (S3, Cloudflare Pages, etc.)
```

### MCP Server

If you have a `server/` directory:

```bash
cd server
npm run build
# Deploy to Vercel, Railway, Fly.io, etc.
```

### Register with ChatGPT

1. Update `manifest.json` with your deployed widget URL
2. Go to [ChatGPT Apps dashboard](https://chatgpt.com/apps)
3. Create a new app and connect your MCP server
4. Test in a new ChatGPT conversation

## Configuration

### SDK Guide (Optional)

The workbench includes an AI-powered SDK guide. To enable:

```bash
# .env.local
OPENAI_API_KEY="your-key"
```

### MCP Server CORS

For production, restrict CORS to your widget domain:

```bash
# server/.env
CORS_ORIGIN=https://your-widget-domain.com
```

### Dark Mode

Exported widgets inherit the host's theme. Ensure your CSS responds to `.dark`:

```css
.dark .my-element {
  background: #1a1a1a;
}
```

## Learn More

- [ChatGPT Apps SDK](https://developers.openai.com/apps-sdk/) — Official documentation
- [Apps SDK Reference](https://developers.openai.com/apps-sdk/reference/) — `window.openai` API
- [MCP Specification](https://modelcontextprotocol.io/specification/) — Model Context Protocol
