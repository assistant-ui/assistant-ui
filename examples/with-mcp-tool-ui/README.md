# with-mcp-tool-ui Example

This example demonstrates how to integrate assistant-ui with an MCP server and render rich tool UI components for tool results.

## Features

- AI-powered weather assistant using Claude or GPT-4
- Beautiful weather cards rendered inline in chat
- MCP server integration for weather data
- Streaming responses with loading states

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

### 3. Build the MCP weather server

In a separate terminal:

```bash
cd examples/mcp-weather-ui
pnpm build
```

### 4. Start the example app

```bash
cd examples/with-mcp-tool-ui
pnpm dev
```

### 5. Open the app

Navigate to http://localhost:3005 and try asking:

- "What's the weather in San Francisco?"
- "Compare the weather in New York and Los Angeles"
- "Is it going to rain in Seattle?"

## How It Works

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   API Route     │────▶│  MCP Server     │
│  (assistant-ui) │     │  (AI SDK)       │     │  (weather-ui)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Tool UI Comps  │◀────│  Tool Results   │
│  (WeatherCard)  │     │  (JSON)         │
└─────────────────┘     └─────────────────┘
```

### Key Files

- `app/api/chat/route.ts` - API route that connects to MCP server
- `components/weather-card.tsx` - Rich weather display component
- `components/weather-tool-uis.tsx` - Tool UI registrations
- `components/chat.tsx` - Main chat interface with runtime

### Tool UI Registration

Tool UIs are registered using `makeAssistantToolUI`:

```typescript
const GetWeatherToolUI = makeAssistantToolUI({
  toolName: "get_weather",
  render: ({ result, status }) => {
    if (status.type === "running") return <LoadingSkeleton />;
    return <WeatherCard data={JSON.parse(result)} />;
  },
});
```

Mount inside `AssistantRuntimeProvider`:

```typescript
<AssistantRuntimeProvider runtime={runtime}>
  <GetWeatherToolUI />
  <Thread />
</AssistantRuntimeProvider>
```

## Using with HTTP MCP Server

To use an HTTP-based MCP server instead of stdio:

1. Set the `MCP_SERVER_URL` environment variable:

   ```bash
   MCP_SERVER_URL=http://localhost:3001/mcp
   ```

2. The API route will automatically use HTTP transport instead of stdio.

## Customization

### Adding New Tool UIs

1. Create your component in `components/`
2. Create a tool UI registration with `makeAssistantToolUI`
3. Mount it inside `AssistantRuntimeProvider`

### Styling

This example uses Tailwind CSS. Weather cards use gradient backgrounds based on conditions. Customize the styles in `components/weather-card.tsx`.

## Troubleshooting

### MCP Server Connection Failed

Make sure the MCP server is built:

```bash
cd ../mcp-weather-ui && pnpm build
```

### No Weather Data Displayed

Check the browser console and server logs for errors. The tool result should be valid JSON.

### Tool UI Not Rendering

Ensure the `toolName` in `makeAssistantToolUI` exactly matches the MCP tool name.
