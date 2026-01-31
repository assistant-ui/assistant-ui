# Tool UI Runtime Example

This example demonstrates **Tool UI Runtime** - a powerful system for rendering rich, interactive tool call visualizations in assistant-ui.

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment

Create a `.env.local` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the assistant.

## Try These Prompts

- **Weather**: "What's the weather in Tokyo?"
- **Stocks**: "What's the AAPL stock price?" *(watch the live updates!)*
- **Crypto**: "Show me crypto prices" *(see multiple prices update!)*

## Project Structure

```
├── app/
│   ├── api/chat/route.ts    # AI SDK v6 API route with tools
│   └── page.tsx             # Main page
├── components/
│   ├── assistant.tsx        # Main assistant component
│   ├── tool-ui/
│   │   ├── weather-widget/  # Weather visualization
│   │   ├── LiveStockTicker.tsx
│   │   └── LiveCryptoDashboard.tsx
│   └── assistant-ui/        # UI primitives
└── lib/
    └── registry.tsx         # Tool UI registry configuration
```

## How It Works

### 1. Registry Configuration (`lib/registry.tsx`)

Tools are registered with factory functions that return different output types:

```tsx
registry.register({
  toolName: "get_weather",
  factory: (props) => {
    // Loading state → HTML
    if (!props.result) {
      return { kind: "html", html: "<div>Loading...</div>" };
    }
    // Result state → React component
    return { kind: "react", element: <WeatherWidget data={props.result} /> };
  },
});
```

### 2. Tool Definitions (`app/api/chat/route.ts`)

Tools are defined using AI SDK v6's `tool()` helper:

```tsx
tools: {
  get_weather: tool({
    description: "Get weather for a location",
    inputSchema: z.object({
      location: z.string(),
    }),
    execute: async ({ location }) => {
      // Return weather data
      return { location, temperature: 72, ... };
    },
  }),
}
```

### 3. Runtime Integration (`components/assistant.tsx`)

The runtime connects the registry to the assistant:

```tsx
const runtime = new ToolUIRuntimeImpl({
  registry: toolUIRegistry,
  createSandbox: () => new SafeContentFrameSandbox(),
});

<ToolUIProvider runtime={runtime}>
  <Thread />
</ToolUIProvider>
```

## Why Tool UI Runtime?

### vs `makeAssistantToolUI`

| Feature | makeAssistantToolUI | Tool UI Runtime |
|---------|---------------------|-----------------|
| React components | YES | YES |
| Sandboxed HTML | NO | YES |
| Lifecycle management | NO | YES |
| Server-streamed updates | NO | YES |
| MCP server support | NO | YES |

### Key Benefits

1. **Multiple Output Types**: React, HTML (sandboxed), URLs, or empty
2. **Secure Sandboxing**: Safely render untrusted HTML from MCP servers
3. **Lifecycle Hooks**: Know when tools are mounting, active, updating, or closing
4. **Streaming Support**: Handle partial results as they arrive

## Tech Stack

- **Next.js 15** - React framework
- **AI SDK v6** - Vercel's AI SDK with `streamText` and tools
- **@assistant-ui/react** - Chat UI components
- **@assistant-ui/tool-ui-runtime** - Tool UI rendering system
- **Tailwind CSS** - Styling

## Learn More

- [Tool UI Runtime Documentation](https://www.assistant-ui.com/docs/guides/tool-ui-runtime)
- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)

## License

MIT