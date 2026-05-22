# `mcp-app-studio`

Build interactive widgets for [MCP Apps](https://modelcontextprotocol.io/specification/) hosts (ChatGPT, Claude Desktop, and others). Ships a local workbench, a universal SDK that works across hosts, and a one-command export to a static widget bundle plus an optional MCP server.

## Quick Start

```bash
npx mcp-app-studio my-app
cd my-app
npm install
npm run dev
```

Open http://localhost:3002 to land in the workbench.

## Universal SDK

Hooks that work identically across MCP Apps hosts. Optional `window.openai` extensions are feature-detected on top:

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
  const platform = usePlatform();
  const input = useToolInput<{ query: string }>();
  const callTool = useCallTool();
  const theme = useTheme();

  const canPersistState = useFeature("widgetState");

  return <div className={theme === "dark" ? "bg-gray-900" : "bg-white"}>{/* ... */}</div>;
}

export default function App() {
  return (
    <UniversalProvider>
      <MyWidget />
    </UniversalProvider>
  );
}
```

## Export

```bash
npm run export
```

Produces a self-contained widget bundle, app manifest, and deployment instructions in `export/`.

## Documentation

- [MCP Apps specification](https://modelcontextprotocol.io/specification/)
- [ChatGPT Apps SDK](https://developers.openai.com/apps-sdk/)
- [assistant-ui.com/mcp-app-studio](https://www.assistant-ui.com/mcp-app-studio) for the platform capability matrix and migration guide
