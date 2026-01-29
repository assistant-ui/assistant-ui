# `@assistant-ui/tool-ui-server`

SDK for creating MCP servers with UI-enabled tools.

## Features

- Create MCP servers with tools that render custom UI components
- OAuth 2.1 support for authenticated tools
- Bridge script generation for parent-iframe communication
- React hooks for building tool UI widgets
- Remote tool UI rendering components

## Installation

```bash
pnpm add @assistant-ui/tool-ui-server
```

## Usage

### Creating an MCP Server with UI Tools

```typescript
import { createToolUIServer } from "@assistant-ui/tool-ui-server";
import { z } from "zod";

const { server, toolWithUI, start } = createToolUIServer({
  serverId: "weather-mcp",
  name: "Weather MCP",
  version: "1.0.0",
  bundleHash: "sha256:abc123...",
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

### Building Tool UI Widgets

Use the provided hooks to build interactive widget UIs:

```typescript
import {
  useToolInput,
  useToolOutput,
  useTheme,
  useDisplayMode,
  useCallTool,
  AUIProvider,
} from "@assistant-ui/tool-ui-server";

function WeatherCard() {
  const input = useToolInput();
  const output = useToolOutput();
  const theme = useTheme();
  const callTool = useCallTool();

  return (
    <AUIProvider>
      <div className={theme === "dark" ? "dark" : ""}>
        <h2>Weather for {input?.location}</h2>
        <p>{output?.temperature}°F</p>
        <button onClick={() => callTool("refresh_weather", { location: input?.location })}>
          Refresh
        </button>
      </div>
    </AUIProvider>
  );
}
```

### Remote Tool UI Rendering

Render tool UIs in your assistant-ui application:

```typescript
import { RemoteToolUI, MCPToolUIProvider } from "@assistant-ui/tool-ui-server";

function MyAssistant() {
  return (
    <MCPToolUIProvider>
      {/* RemoteToolUI will render the appropriate widget based on tool output */}
      <RemoteToolUI toolName="get_weather" input={input} output={output} />
    </MCPToolUIProvider>
  );
}
```

## Available Hooks

| Hook | Description |
|------|-------------|
| `useToolInput` | Access the tool's input arguments |
| `useToolOutput` | Access the tool's output/result |
| `useTheme` | Get current theme ("light" or "dark") |
| `useLocale` | Get current locale |
| `useDisplayMode` | Get display mode ("inline", "fullscreen", "pip") |
| `useWidgetState` | Persist state across re-renders |
| `useCallTool` | Call other tools from within a widget |
| `useRequestDisplayMode` | Request a display mode change |
| `useSendFollowUpMessage` | Send follow-up messages to the assistant |
| `useMaxHeight` | Get maximum height constraint |
| `useUserAgent` | Get user agent information |
| `useSafeArea` | Get safe area insets |
| `useUploadFile` | Upload files from the widget |
| `useGetFileDownloadUrl` | Get download URLs for files |

## OAuth Support

For tools requiring authentication:

```typescript
import { createToolUIServer, OAuth } from "@assistant-ui/tool-ui-server";

const { toolWithUI, start } = createToolUIServer({
  serverId: "my-server",
  name: "My Server",
  version: "1.0.0",
  oauth: {
    issuer: "https://auth.example.com",
    audience: "https://api.example.com",
  },
});

toolWithUI({
  name: "protected_tool",
  description: "A tool requiring authentication",
  parameters: z.object({ query: z.string() }),
  component: "ProtectedWidget",
  securitySchemes: [
    { type: "oauth2", scopes: ["read:data"] },
  ],
  execute: async (args, context) => {
    // context.auth contains validated token claims
    return fetchProtectedData(args.query, context.auth);
  },
});
```

## Bridge Script

When serving tool UI HTML files, inject the bridge script for parent-iframe communication:

```typescript
import { generateBridgeScript } from "@assistant-ui/tool-ui-server";

const bridgeScript = generateBridgeScript();
const html = originalHtml.replace("</head>", `<script>${bridgeScript}</script></head>`);
```

## Security Considerations

- Tool UIs run in sandboxed iframes with restricted permissions
- The bridge script uses postMessage for secure parent-iframe communication
- OAuth tokens are validated server-side before tool execution
- Always validate and sanitize tool inputs and outputs

## API Reference

See the [assistant-ui documentation](https://www.assistant-ui.com/docs) for complete API reference.
