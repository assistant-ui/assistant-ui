# with-mcp-tool-ui Example Implementation Plan

## Overview

Create a complete example app that demonstrates the full integration of:
1. assistant-ui chat interface
2. MCP server connection (via API route)
3. @assistant-ui/tool-ui components rendering MCP tool results

This example will connect to the `mcp-weather-ui` server and display rich weather UI components when the AI calls weather tools.

## Current State Analysis

### What Exists:
- `@assistant-ui/tool-ui` package with components (CodeBlock, Terminal, DataTable, MediaCard)
- `@assistant-ui/tool-ui-server` package with MCP server SDK
- `mcp-weather-ui` example with MCP server (no frontend)
- assistant-ui uses `useChatRuntime` + `AssistantChatTransport` for backend connections
- MCP client integration uses `@ai-sdk/mcp` with `createMCPClient()`

### What's Missing:
- A frontend chat app that connects to an MCP server
- Registration of tool-ui components for MCP tool results
- End-to-end example showing the complete flow

### Key Discoveries:
- `@ai-sdk/mcp` provides `experimental_createMCPClient` for MCP connections
- `StreamableHTTPClientTransport` from `@modelcontextprotocol/sdk` handles HTTP transport
- `frontendTools()` from `@assistant-ui/react-ai-sdk` merges client tools with server tools
- Tool UIs are registered by mounting components inside `AssistantRuntimeProvider`

## Desired End State

After this plan is complete:

1. New example `examples/with-mcp-tool-ui/` exists with:
   - Next.js 15 app with assistant-ui chat interface
   - API route that connects to MCP server and streams responses
   - Weather tool UI components that render rich weather cards
   - Support for both HTTP MCP and stdio MCP connections

2. User can:
   - Start the MCP weather server
   - Start the Next.js app
   - Ask "What's the weather in San Francisco?"
   - See a beautiful WeatherCard component render inline

### Verification:
- [ ] `pnpm build` succeeds in example directory
- [ ] `pnpm dev` starts the example app
- [ ] Chat interface loads correctly
- [ ] Weather queries render WeatherCard component
- [ ] Tool results display correctly in receipt mode

## What We're NOT Doing

- Not implementing remote/iframe component loading (that's Phase 3 of tool-ui)
- Not building a full MCP client SDK (using @ai-sdk/mcp)
- Not implementing component registry/hosting infrastructure
- Not adding authentication or rate limiting

---

## Implementation Approach

**Strategy**: Create a self-contained example that demonstrates the integration pattern. Use the existing `mcp-weather-ui` server and create weather-specific tool UI components that match its output format.

---

## Phase 1: Project Setup

### Overview
Create the Next.js project structure with assistant-ui dependencies.

### Changes Required:

#### 1. Create package.json

**File**: `examples/with-mcp-tool-ui/package.json`

```json
{
  "name": "with-mcp-tool-ui-example",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3005",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@ai-sdk/anthropic": "^2.0.0",
    "@ai-sdk/mcp": "^0.0.11",
    "@ai-sdk/openai": "^2.0.0",
    "@assistant-ui/react": "workspace:*",
    "@assistant-ui/react-ai-sdk": "workspace:*",
    "@assistant-ui/react-markdown": "workspace:*",
    "@assistant-ui/tool-ui": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.23.0",
    "ai": "^5.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.25.0",
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

#### 2. Create Next.js config

**File**: `examples/with-mcp-tool-ui/next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@assistant-ui/react",
    "@assistant-ui/react-ai-sdk",
    "@assistant-ui/react-markdown",
    "@assistant-ui/tool-ui",
  ],
};

export default nextConfig;
```

#### 3. Create TypeScript config

**File**: `examples/with-mcp-tool-ui/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### 4. Create Tailwind CSS config

**File**: `examples/with-mcp-tool-ui/app/globals.css`

```css
@import "tailwindcss";
@import "@assistant-ui/react/styles/index.css";
@import "@assistant-ui/react/styles/themes/default.css";
```

#### 5. Create app layout

**File**: `examples/with-mcp-tool-ui/app/layout.tsx`

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP Tool UI Example",
  description: "Example of assistant-ui with MCP server and tool-ui components",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm install` succeeds
- [ ] `pnpm build` succeeds (may have warnings, no errors)
- [ ] TypeScript compiles without errors

#### Manual Verification:
- [ ] Project structure matches expected layout

---

## Phase 2: Chat API Route

### Overview
Create the API route that connects to the MCP server and streams AI responses with tool calls.

### Changes Required:

#### 1. Create MCP client utility

**File**: `examples/with-mcp-tool-ui/lib/mcp-client.ts`

```typescript
import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "@ai-sdk/mcp";

export async function createWeatherMCPClient() {
  // Check for HTTP MCP server first
  const mcpServerUrl = process.env.MCP_SERVER_URL;

  if (mcpServerUrl) {
    // HTTP-based MCP connection
    const client = await createMCPClient({
      transport: {
        type: "sse",
        url: mcpServerUrl,
      },
    });
    return client;
  }

  // Fallback to stdio transport (requires server binary)
  const client = await createMCPClient({
    transport: new StdioMCPTransport({
      command: "node",
      args: ["../mcp-weather-ui/dist/server.js"],
    }),
  });

  return client;
}
```

#### 2. Create chat API route

**File**: `examples/with-mcp-tool-ui/app/api/chat/route.ts`

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
import { createWeatherMCPClient } from "@/lib/mcp-client";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a helpful weather assistant. You can check the weather for any location using the get_weather tool, or compare weather between two locations using the compare_weather tool.

When a user asks about weather:
1. Use get_weather for a single location
2. Use compare_weather when comparing two places

Always provide helpful commentary about the weather after displaying it.`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Create MCP client and get tools
  let mcpClient;
  let tools = {};

  try {
    mcpClient = await createWeatherMCPClient();
    tools = await mcpClient.tools();
    console.log(`[MCP] Loaded ${Object.keys(tools).length} tools`);
  } catch (error) {
    console.error("[MCP] Failed to connect:", error);
    // Continue without MCP tools - will respond that weather is unavailable
  }

  // Select model based on environment
  const model = process.env.ANTHROPIC_API_KEY
    ? anthropic("claude-sonnet-4-20250514")
    : openai("gpt-4o");

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    tools,
    maxSteps: 5,
  });

  return result.toUIMessageStreamResponse();
}
```

#### 3. Create environment example

**File**: `examples/with-mcp-tool-ui/.env.example`

```bash
# AI Provider (choose one)
ANTHROPIC_API_KEY=your-anthropic-key
# or
OPENAI_API_KEY=your-openai-key

# MCP Server (optional - uses stdio if not set)
# MCP_SERVER_URL=http://localhost:3001/mcp
```

### Success Criteria:

#### Automated Verification:
- [ ] API route compiles without TypeScript errors
- [ ] Route handles missing MCP connection gracefully

#### Manual Verification:
- [ ] API returns streaming response when called with messages
- [ ] MCP tools are loaded when server is available

---

## Phase 3: Weather Tool UI Components

### Overview
Create custom tool UI components that render weather data beautifully.

### Changes Required:

#### 1. Create WeatherCard component

**File**: `examples/with-mcp-tool-ui/components/weather-card.tsx`

```typescript
"use client";

import * as React from "react";

interface WeatherData {
  location: string;
  temperature: number;
  unit: "celsius" | "fahrenheit";
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy";
  humidity: number;
  windSpeed: number;
  windDirection: string;
  forecast?: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
  }>;
}

const conditionStyles: Record<string, string> = {
  sunny: "from-amber-400 to-orange-500",
  cloudy: "from-slate-400 to-slate-600",
  rainy: "from-blue-400 to-blue-600",
  snowy: "from-slate-100 to-slate-300 text-slate-800",
  stormy: "from-slate-700 to-purple-900",
};

const conditionIcons: Record<string, string> = {
  sunny: "☀️",
  cloudy: "☁️",
  rainy: "🌧️",
  snowy: "❄️",
  stormy: "⛈️",
};

export function WeatherCard({ data }: { data: WeatherData }) {
  const bgClass = conditionStyles[data.condition] ?? conditionStyles.cloudy;
  const icon = conditionIcons[data.condition] ?? "🌤️";
  const tempUnit = data.unit === "celsius" ? "C" : "F";

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${bgClass} p-6 text-white shadow-lg max-w-md`}
    >
      <div className="mb-2 text-lg font-semibold">{data.location}</div>

      <div className="flex items-center gap-4 mb-4">
        <span className="text-5xl">{icon}</span>
        <div>
          <div className="text-4xl font-bold">
            {data.temperature}°{tempUnit}
          </div>
          <div className="text-lg capitalize opacity-90">{data.condition}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm opacity-90 mb-4">
        <div>💧 Humidity: {data.humidity}%</div>
        <div>💨 Wind: {data.windSpeed} mph {data.windDirection}</div>
      </div>

      {data.forecast && data.forecast.length > 0 && (
        <div className="border-t border-white/20 pt-4 mt-4">
          <div className="flex justify-between">
            {data.forecast.map((day) => (
              <div key={day.day} className="text-center text-sm">
                <div className="font-medium">{day.day}</div>
                <div>{conditionIcons[day.condition] ?? "🌤️"}</div>
                <div className="opacity-80">
                  {day.high}° / {day.low}°
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 2. Create WeatherComparison component

**File**: `examples/with-mcp-tool-ui/components/weather-comparison.tsx`

```typescript
"use client";

import { WeatherCard } from "./weather-card";

interface WeatherData {
  location: string;
  temperature: number;
  unit: "celsius" | "fahrenheit";
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy";
  humidity: number;
  windSpeed: number;
  windDirection: string;
  forecast?: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
  }>;
}

interface ComparisonData {
  location1: WeatherData;
  location2: WeatherData;
}

export function WeatherComparison({ data }: { data: ComparisonData }) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <WeatherCard data={data.location1} />
      <WeatherCard data={data.location2} />
    </div>
  );
}
```

#### 3. Create Tool UI registrations

**File**: `examples/with-mcp-tool-ui/components/weather-tool-uis.tsx`

```typescript
"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { WeatherCard } from "./weather-card";
import { WeatherComparison } from "./weather-comparison";

/**
 * Tool UI for the get_weather MCP tool.
 * Renders a beautiful weather card when the AI retrieves weather data.
 */
export const GetWeatherToolUI = makeAssistantToolUI<
  { location: string; unit?: string },
  string
>({
  toolName: "get_weather",
  render: ({ result, status }) => {
    // Show loading state while tool is running
    if (status.type === "running") {
      return (
        <div className="animate-pulse bg-slate-200 rounded-2xl h-48 max-w-md" />
      );
    }

    // Parse the result (MCP returns JSON string)
    if (!result) return null;

    try {
      const weatherData = typeof result === "string" ? JSON.parse(result) : result;
      return <WeatherCard data={weatherData} />;
    } catch {
      return (
        <div className="text-red-500 p-4 rounded-lg bg-red-50">
          Failed to parse weather data
        </div>
      );
    }
  },
});

/**
 * Tool UI for the compare_weather MCP tool.
 * Renders two weather cards side by side for comparison.
 */
export const CompareWeatherToolUI = makeAssistantToolUI<
  { location1: string; location2: string },
  string
>({
  toolName: "compare_weather",
  render: ({ result, status }) => {
    if (status.type === "running") {
      return (
        <div className="flex gap-4">
          <div className="animate-pulse bg-slate-200 rounded-2xl h-48 w-64" />
          <div className="animate-pulse bg-slate-200 rounded-2xl h-48 w-64" />
        </div>
      );
    }

    if (!result) return null;

    try {
      const comparisonData = typeof result === "string" ? JSON.parse(result) : result;
      return <WeatherComparison data={comparisonData} />;
    } catch {
      return (
        <div className="text-red-500 p-4 rounded-lg bg-red-50">
          Failed to parse comparison data
        </div>
      );
    }
  },
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Components compile without TypeScript errors
- [ ] No React warnings in console

#### Manual Verification:
- [ ] WeatherCard displays gradient background based on condition
- [ ] Temperature and forecast render correctly
- [ ] Loading states show properly
- [ ] Error states handled gracefully

---

## Phase 4: Chat Interface

### Overview
Create the main chat interface that ties everything together.

### Changes Required:

#### 1. Create chat components

**File**: `examples/with-mcp-tool-ui/components/chat.tsx`

```typescript
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@assistant-ui/react";
import { GetWeatherToolUI, CompareWeatherToolUI } from "./weather-tool-uis";

export function Chat() {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* Register tool UIs */}
      <GetWeatherToolUI />
      <CompareWeatherToolUI />

      {/* Chat interface */}
      <div className="h-screen">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
```

#### 2. Create main page

**File**: `examples/with-mcp-tool-ui/app/page.tsx`

```typescript
import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="p-4 border-b bg-white">
          <h1 className="text-xl font-semibold">Weather Assistant</h1>
          <p className="text-sm text-slate-500">
            Ask about weather anywhere! Try: "What's the weather in Tokyo?"
          </p>
        </header>
        <Chat />
      </div>
    </main>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Page compiles without errors
- [ ] No hydration mismatches

#### Manual Verification:
- [ ] Chat interface renders with composer
- [ ] Messages display correctly
- [ ] Tool UIs render when AI calls weather tools
- [ ] Streaming responses work smoothly

---

## Phase 5: Documentation & Testing

### Overview
Add documentation and ensure everything works end-to-end.

### Changes Required:

#### 1. Create README

**File**: `examples/with-mcp-tool-ui/README.md`

```markdown
# with-mcp-tool-ui Example

This example demonstrates how to integrate assistant-ui with an MCP server and render rich tool UI components for tool results.

## Features

- 🤖 AI-powered weather assistant using Claude or GPT-4
- 🌤️ Beautiful weather cards rendered inline in chat
- 🔌 MCP server integration for weather data
- ⚡ Streaming responses with loading states

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Add your API key (ANTHROPIC_API_KEY or OPENAI_API_KEY)
```

### 3. Start the MCP weather server

In a separate terminal:

```bash
cd ../mcp-weather-ui
pnpm build
pnpm start
```

### 4. Start the example app

```bash
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

Make sure the MCP server is running:
```bash
cd ../mcp-weather-ui && pnpm start
```

### No Weather Data Displayed

Check the browser console and server logs for errors. The tool result should be valid JSON.

### Tool UI Not Rendering

Ensure the `toolName` in `makeAssistantToolUI` exactly matches the MCP tool name.
```

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm build` succeeds in example directory
- [ ] `pnpm lint` passes (or has only warnings)

#### Manual Verification:
- [ ] Start MCP server: `cd examples/mcp-weather-ui && pnpm build && pnpm start`
- [ ] Start example: `cd examples/with-mcp-tool-ui && pnpm dev`
- [ ] Ask "What's the weather in Tokyo?" → WeatherCard renders
- [ ] Ask "Compare New York and London weather" → Two cards render
- [ ] Loading states appear during tool execution
- [ ] Error states handled gracefully

---

## Testing Strategy

### Integration Tests:
- API route connects to MCP server
- Tool calls return valid JSON
- Tool UIs parse results correctly

### Manual Testing Steps:
1. Start MCP weather server
2. Start Next.js example app
3. Send message asking for weather
4. Verify WeatherCard component renders
5. Test loading states by watching tool execution
6. Test error handling by stopping MCP server mid-conversation
7. Test comparison tool with two locations

## References

- Original plan: `notes/plans/tool-ui-mcp-standard-implementation.md`
- MCP weather server: `examples/mcp-weather-ui/`
- Tool UI package: `packages/tool-ui/`
- assistant-ui docs: https://www.assistant-ui.com/
