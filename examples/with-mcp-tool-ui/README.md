# with-mcp-tool-ui Example

This example demonstrates the **remote Tool UI loading pattern** - where MCP server developers ship their own UI components that are automatically loaded and rendered in sandboxed iframes.

## Key Concept

**Traditional Pattern** (app developer builds UI):
```tsx
// App developer must build UI for each MCP server
<AssistantRuntimeProvider runtime={runtime}>
  <WeatherToolUI />     // Built by app developer
  <SpotifyToolUI />     // Built by app developer
  <Thread />
</AssistantRuntimeProvider>
```

**Remote Loading Pattern** (MCP server ships UI):
```tsx
// MCP server developer ships UI, app developer just enables it
<MCPToolUIProvider servers={[{ serverId: "weather-mcp", capability }]}>
  <Thread />
</MCPToolUIProvider>
```

The UI components run in **sandboxed iframes** for security isolation. Each MCP server's UI runs on a separate origin (PSL-isolated subdomain).

## Quick Start

### 1. Install dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Set up environment

```bash
cd examples/with-mcp-tool-ui
cp .env.example .env
# Add your API key (ANTHROPIC_API_KEY or OPENAI_API_KEY)
```

### 3. Build and start the UI server

In a separate terminal, start the UI component server:

```bash
cd examples/mcp-weather-ui
pnpm build        # Build the MCP server
pnpm build:ui     # Build the UI bundle
pnpm start:ui     # Start the UI server on port 3001
```

You should see:
```
🎨 Tool UI Server running at http://localhost:3001

  Endpoints:
    GET /render       - Iframe render page
    GET /bundle.js    - UI component bundle
    GET /manifest.json - UI manifest
```

### 4. Build and run the MCP server

In another terminal:

```bash
cd examples/mcp-weather-ui
pnpm start         # Start the MCP server (stdio)
```

### 5. Start the example app

```bash
cd examples/with-mcp-tool-ui
pnpm dev
```

### 6. Open the app

Navigate to http://localhost:3005 and try asking:

- "What's the weather in San Francisco?"
- "Compare the weather in New York and Los Angeles"

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App (localhost:3005)                                   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  <MCPToolUIProvider servers={[...]}>                      │  │
│  │                                                           │  │
│  │    When AI calls get_weather tool:                        │  │
│  │                                                           │  │
│  │    ┌─────────────────────────────────────────────────┐   │  │
│  │    │  IFRAME (sandbox="allow-scripts")               │   │  │
│  │    │  src="localhost:3001/render?component=WeatherCard"│  │  │
│  │    │                                                   │   │  │
│  │    │  ┌─────────────────────────────────────────┐     │   │  │
│  │    │  │  WeatherCard (from MCP server bundle)   │     │   │  │
│  │    │  │                                         │     │   │  │
│  │    │  │  🌤️ San Francisco, CA                   │     │   │  │
│  │    │  │  72°F Sunny                             │     │   │  │
│  │    │  └─────────────────────────────────────────┘     │   │  │
│  │    └─────────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                              ▲
         │ postMessage                  │ postMessage
         │ (render props)               │ (resize, actions)
         ▼                              │
┌─────────────────────────────────────────────────────────────────┐
│  UI Server (localhost:3001)                                      │
│                                                                  │
│  /manifest.json  → Describes available components                │
│  /bundle.js      → Compiled UI components (WeatherCard, etc.)    │
│  /render         → HTML host page for iframe                     │
└─────────────────────────────────────────────────────────────────┘
```

### Security Model

1. **Iframe Sandbox**: Components run with `sandbox="allow-scripts"` only
   - No access to parent page cookies/storage
   - No form submission, popups, or navigation

2. **Origin Isolation**: In production, each MCP server gets a PSL-isolated subdomain
   - `weather-mcp.auiusercontent.com`
   - `spotify-mcp.auiusercontent.com`
   - Browser treats each as a completely separate site

3. **Bundle Integrity**: SHA-256 hash verification ensures bundles haven't been tampered with

### Key Files

- `app/page.tsx` - Uses `MCPToolUIProvider` to enable remote loading
- `../mcp-weather-ui/src/ui/index.ts` - The UI bundle with WeatherCard component
- `../mcp-weather-ui/src/ui-server.ts` - Development server for UI hosting
- `../mcp-weather-ui/manifest.dev.json` - Manifest describing available components

### The Provider

```tsx
import { MCPToolUIProvider } from "@assistant-ui/tool-ui";

const WEATHER_MCP_CAPABILITY = {
  version: "1.0",
  registry: "http://localhost:3001",  // Where to fetch manifest
  serverId: "weather-mcp",
  bundleHash: "sha256:...",           // For integrity verification
};

<MCPToolUIProvider
  servers={[
    { serverId: "weather-mcp", capability: WEATHER_MCP_CAPABILITY }
  ]}
>
  <Thread />
</MCPToolUIProvider>
```

## Production vs Development

| Aspect | Development | Production |
|--------|-------------|------------|
| Registry URL | `localhost:3001` | `registry.assistant-ui.com` |
| Bundle URL | `localhost:3001/bundle.js` | `weather-mcp.auiusercontent.com/bundle.js` |
| Render URL | `localhost:3001/render` | `weather-mcp.auiusercontent.com/render` |
| Hash verification | Placeholder hash | Real SHA-256 hash |
| Origin isolation | Same localhost (less secure) | PSL-isolated subdomains |

## Troubleshooting

### "Failed to fetch manifest"

Make sure the UI server is running:
```bash
cd ../mcp-weather-ui && pnpm dev:ui
```

### Component not rendering

Check browser console for errors. The manifest must be accessible at:
```
http://localhost:3001/v1/servers/weather-mcp/manifest.json
```

### "Bundle hash mismatch"

For development, both the capability and manifest use a placeholder hash. If you see this error, ensure both match.

## Next Steps

To deploy to production:

1. Build your UI bundle: `pnpm build:ui`
2. Calculate the bundle hash: `npx @assistant-ui/tool-ui-server hash -b dist/bundle.js`
3. Update your manifest with the real hash
4. Publish to the registry: `npx @assistant-ui/tool-ui-server publish ...`

The `auiusercontent.com` hosting infrastructure will serve your bundle on a PSL-isolated subdomain.
