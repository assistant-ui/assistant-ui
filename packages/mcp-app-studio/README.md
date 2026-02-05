# MCP App Studio

**Build interactive apps for MCP Apps hosts (ChatGPT, Claude Desktop, etc.).**

ChatGPT is an **MCP Apps host**. This SDK is MCP-first: it uses the standard
`ui/*` bridge everywhere, and treats `window.openai` as **optional ChatGPT-only
extensions** layered on top.

## What You Get

- **Local workbench** — Preview widgets without deploying
- **Universal SDK** — Single API works across MCP Apps hosts
- **Optional ChatGPT extensions** — Feature-detected `window.openai` helpers
- **One-command export** — Generate production bundle + MCP server

## Quick Start

```bash
npx mcp-app-studio my-app
cd my-app
npm install
npm run dev
```

Open http://localhost:3002 — you're in the workbench.

## Universal SDK

The SDK provides React hooks that work identically across platforms:

```tsx
import {
  UniversalProvider,
  usePlatform,
  useToolInput,
  useCallTool,
  useTheme,
  useFeature,
  hasChatGPTExtensions,
} from "mcp-app-studio";

function MyWidget() {
  const platform = usePlatform(); // "mcp" | "unknown"
  const input = useToolInput<{ query: string }>();
  const callTool = useCallTool();
  const theme = useTheme();

  // Optional ChatGPT extensions (window.openai)
  const hasWidgetState = useFeature("widgetState");
  const canUseOpenAIExtensions = hasChatGPTExtensions();

  return (
    <div className={theme === 'dark' ? 'bg-gray-900' : 'bg-white'}>
      {/* Your widget */}
    </div>
  );
}

// Wrap your app
function App() {
  return (
    <UniversalProvider>
      <MyWidget />
    </UniversalProvider>
  );
}
```

## Platform Capabilities

| Feature | MCP Apps bridge | ChatGPT extensions (`window.openai`) |
|---------|----------------|-------------------------------------|
| `callTool` | ✅ | ✅ (`callTool`) |
| `openLink` | ✅ | ✅ (`openExternal`) |
| `sendMessage` | ✅ | ✅ (`sendFollowUpMessage`) |
| `modelContext` (`ui/update-model-context`) | ✅ | — |
| `widgetState` (persistence) | — | ✅ |
| `fileUpload` / `fileDownload` | — | ✅ |
| `requestModal` | — | ✅ |
| `partialToolInput` (streaming) | Host-dependent | — |

## Workflow

```
1. DEVELOP     npm run dev       Edit widgets, test with mock tools
2. EXPORT      npm run export    Generate widget bundle + manifest
3. DEPLOY      Your choice       Vercel, Netlify, any static host
4. REGISTER    Platform dashboard  Connect your app
```

## Generated Project

```
my-app/
├── app/                    Next.js app
├── components/
│   └── examples/           Example widgets
├── lib/
│   ├── workbench/          Dev environment + React hooks
│   └── export/             Production bundler
└── server/                 MCP server (if selected)
```

## Export Output

```bash
npm run export
```

Generates:

```
export/
├── widget/
│   └── index.html      Self-contained widget (deploy to static host)
├── manifest.json       App manifest
└── README.md           Deployment instructions
```

## Debugging

Enable debug mode to troubleshoot platform detection:

```ts
import { enableDebugMode, detectPlatformDetailed } from "mcp-app-studio";

// In browser console or before app init
enableDebugMode();

// Get detailed detection info
const result = detectPlatformDetailed();
console.log('Platform:', result.platform);
console.log('Detected by:', result.detectedBy);
console.log('Checks:', result.checks);
```

## Tool metadata (`_meta.ui.resourceUri`)

For tools that render UI, OpenAI recommends using `_meta.ui.resourceUri` (with
legacy support for `_meta["openai/outputTemplate"]`). See the starter template
and MCP server generator for a working example.

## MCP Server

If you selected "Include MCP server" during setup:

```bash
cd server
npm install
npm run dev          # http://localhost:3001/mcp
npm run inspect      # Test with MCP Inspector
```

## Learn More

- [MCP Apps Specification](https://modelcontextprotocol.io/specification/)
- [ChatGPT Apps SDK](https://developers.openai.com/apps-sdk/)
- [assistant-ui](https://www.assistant-ui.com/)

## License

MIT
