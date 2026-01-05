# MCP Server With UI Example

This example demonstrates how to create an MCP server with rich UI components using `@assistant-ui/tool-ui-server`.

## Overview

The Weather MCP server provides two tools:

1. **get_weather** - Get current weather and forecast for a location
2. **compare_weather** - Compare weather between two locations side by side

Each tool renders with a custom UI component instead of plain text.

## Project Structure

```
mcp-server-with-ui/
├── src/
│   ├── server.ts      # MCP server with tool definitions
│   └── ui/
│       └── index.ts   # UI components for iframe rendering
├── manifest.json      # UI manifest for registry
├── package.json
└── tsconfig.json
```

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Build

```bash
# Build the server
pnpm build

# Build the UI bundle
pnpm build:ui
```

### Run the Server

```bash
pnpm start
# or
node dist/server.js
```

### Test with Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/path/to/examples/mcp-server-with-ui/dist/server.js"]
    }
  }
}
```

## Publishing to Registry

1. Build the UI bundle:
   ```bash
   pnpm build:ui
   ```

2. Calculate the bundle hash:
   ```bash
   npx @assistant-ui/tool-ui-server hash -b dist/bundle.js
   ```

3. Update `manifest.json` with the new hash

4. Publish:
   ```bash
   npx @assistant-ui/tool-ui-server publish \
     -s weather-mcp \
     -b dist/bundle.js \
     -m manifest.json
   ```

## How It Works

### Server Side

The server uses `createToolUIServer` to:
1. Create an MCP-compatible server
2. Register tools with associated UI components
3. Return tool results with UI metadata

```typescript
import { createToolUIServer } from "@assistant-ui/tool-ui-server";

const { toolWithUI, start } = createToolUIServer({
  serverId: "weather-mcp",
  name: "Weather MCP",
  version: "1.0.0",
  bundleHash: "sha256:...",
});

toolWithUI({
  name: "get_weather",
  description: "Get weather for a location",
  parameters: z.object({ location: z.string() }),
  component: "WeatherCard",
  execute: async ({ location }) => fetchWeather(location),
});

await start();
```

### Client Side (UI Bundle)

The UI bundle uses `createToolUIRuntime` to:
1. Register component renderers
2. Listen for props from the parent frame
3. Render components and report height

```typescript
import { createToolUIRuntime } from "@assistant-ui/tool-ui-server";

const runtime = createToolUIRuntime();

runtime.register({
  name: "WeatherCard",
  schema: WeatherCardSchema,
  render: (props) => `
    <div class="weather-card">
      <h2>${props.location}</h2>
      <p>${props.temperature}°</p>
    </div>
  `,
});

runtime.start();
```

## Security

- UI components run in sandboxed iframes
- Only `allow-scripts` sandbox permission (no same-origin)
- Communication via postMessage with origin validation
- PSL-isolated hosting prevents cross-component data access
- Bundle integrity verified via SHA-256 hash

## License

MIT
