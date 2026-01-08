# MCP Server With UI Example

**Comprehensive example demonstrating ALL features** of `@assistant-ui/tool-ui-server`.

## Overview

This example demonstrates the complete capabilities of `@assistant-ui/tool-ui-server` with **10 tools** showcasing every implemented feature:

- Basic tool rendering with UI components  
- Tool annotations (destructive, read-only hints)
- Invocation status messages
- File upload/download handling
- Private tools accessible only from widgets
- OAuth security schemes
- All 16+ client-side APIs
- Theme, localization, and display modes
- Widget state management
- Modal requests and external links

## Features Demonstrated

### Server-Side Features

| Feature | Tool | Description |
|---------|------|-------------|
| Basic Tool | `get_weather` | Standard tool with UI component |
| Tool Annotations | `delete_location` | `destructiveHint`, `completionMessage` |
| Invocation Messages | `get_weather_alerts` | `invoking`/`invoked` status messages |
| Read-Only Hint | `get_weather_alerts` | `readOnlyHint` annotation |
| File Parameters | `analyze_weather_image` | `fileParams` declaration |
| Private Tool | `refresh_weather_data` | `visibility: "private"` |
| Widget Accessible | `refresh_weather_data` | `widgetAccessible: true` |
| OAuth Security | `save_favorite_location` | `securitySchemes` with OAuth2 |
| Mixed Security | `get_personalized_forecast` | Both `noauth` and `oauth2` |
| Feature Showcase | `feature_showcase` | Comprehensive demo tool |

### Client-Side Features

| Feature | API | Demonstrated In |
|---------|-----|-----------------|
| Theme Awareness | `getGlobals().theme` | AUI Demo, Feature Showcase |
| Widget State | `setWidgetState()` | AUI Demo, Feature Showcase |
| Display Modes | `requestDisplayMode()` | AUI Demo, Feature Showcase |
| Follow-up Messages | `sendFollowUpMessage()` | AUI Demo, Feature Showcase |
| Height Notification | `notifyIntrinsicHeight()` | All components |
| Global Changes | `onGlobalsChange()` | AUI Demo, Feature Showcase |
| Locale | `getGlobals().locale` | Feature Showcase |
| User Agent | `getGlobals().userAgent` | Feature Showcase |
| Safe Area | `getGlobals().safeArea` | Feature Showcase |
| Max Height | `getGlobals().maxHeight` | Feature Showcase |
| User Location | `getGlobals().userLocation` | Feature Showcase |
| Widget Session ID | `getGlobals().toolResponseMetadata` | Feature Showcase |
| Call Tool | `callTool()` | Feature Showcase |
| Request Modal | `requestModal()` | Feature Showcase |
| Request Close | `requestClose()` | Feature Showcase |
| Open External | `openExternal()` | Feature Showcase |
| Upload File | `uploadFile()` | Feature Showcase |
| Get Download URL | `getFileDownloadUrl()` | Feature Showcase |

### OAuth Features (Server Configuration)

```typescript
createToolUIServer({
  // ... other options ...
  oauth: {
    resource: "https://your-mcp.example.com",
    authorizationServers: ["https://auth.example.com"],
    scopesSupported: ["favorites:read", "favorites:write", "profile:read"],
  },
});
```

## Tools

### `get_weather`
Get current weather and 5-day forecast for a location.

### `compare_weather`
Compare weather between two locations side by side.

### `aui_demo`
Basic AUI protocol demo showing theme, state, and display modes.

### `feature_showcase`
**Comprehensive feature demo** - shows ALL client-side APIs in one interactive component.

### `delete_location`
Delete a saved location. Demonstrates `destructiveHint` annotation.

### `get_weather_alerts`
Get active weather alerts. Demonstrates `readOnlyHint` and invocation messages.

### `analyze_weather_image`
Analyze weather images. Demonstrates file parameter handling.

### `refresh_weather_data`
Private tool callable only from widgets. Demonstrates `visibility` and `widgetAccessible`.

### `save_favorite_location`
OAuth-protected tool. Demonstrates `securitySchemes`.

### `get_personalized_forecast`
Mixed auth tool. Works anonymously but enhanced when authenticated.

## Project Structure

```
mcp-server-with-ui/
├── src/
│   ├── server.ts              # MCP server with all tool definitions
│   ├── ui-server.ts           # Development UI server
│   └── ui/
│       ├── index.ts           # Runtime setup and component registration
│       ├── aui-demo.ts        # Basic AUI demo component
│       ├── feature-showcase.ts # Comprehensive feature demo
│       ├── delete-confirmation.ts
│       └── weather-alerts.ts
├── manifest.json
├── package.json
└── README.md
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

## Testing All Features

### Basic Tools
1. **Weather**: Ask for weather in any city
2. **Comparison**: Compare weather between two cities

### Feature Demos
3. **Feature Showcase**: Ask to "show the feature showcase" or "demo all AUI features"
4. **AUI Demo**: Ask to "show the AUI demo"

### Tool Annotations & Features
5. **Destructive Action**: Ask to "delete location X" 
6. **Weather Alerts**: Ask for "weather alerts in US-CA"
7. **File Analysis**: Upload an image and ask to analyze it

### Authentication & Private Tools
8. **OAuth Flow**: Try to save a favorite location (requires auth setup)
9. **Private Tool**: Use the feature showcase to call the private refresh tool

### Client-Side APIs
10. **Interactive Features**: Use the feature showcase to test all 16+ client APIs:
    - Display mode switching (inline/fullscreen/pip)
    - Widget state persistence
    - File upload/download
    - Modal requests
    - External links
    - Tool calling from widgets
    - Follow-up messages

## Build & Run

```bash
# Install dependencies
pnpm install

# Build server and UI
pnpm build
pnpm build:ui

# Run the server
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

## Security

- UI components run in sandboxed iframes (`allow-scripts allow-forms`)
- Communication via postMessage with origin validation
- PSL-isolated hosting prevents cross-component data access
- Bundle integrity verified via SHA-256 hash
- OAuth tokens validated server-side

## Related Documentation

- [Tool UI Server Package](../../packages/tool-ui-server/README.md)
- [ChatGPT Apps SDK Parity](../../packages/tool-ui-server/CHAGPT_APPS_SDK_PARITY.md)
- [OAuth Implementation](../../notes/plans/oauth-implementation.md)

## License

MIT
