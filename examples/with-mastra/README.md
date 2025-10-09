# Mastra Integration Example

This example demonstrates how to use `@assistant-ui/react-mastra` to build AI-powered applications with Mastra agents.

## Features

- **Multiple Agents**: Chef Agent for cooking assistance and Weather Agent for weather information
- **Memory Integration**: Persistent conversation memory using Mastra's memory system
- **Tool Execution**: Weather tool integration for real-time data
- **Streaming Responses**: Real-time streaming of agent responses
- **Agent Selection**: Switch between different specialized agents
- **Advanced UI**: Complete chat interface with rich message formatting

## Prerequisites

1. Node.js 18+ installed
2. pnpm package manager
3. OpenAI API key

## Getting Started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```

   Add your OpenAI API key to `.env.local`:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Run the development server**:
   ```bash
   pnpm dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Available Agents

### Chef Agent 🍳
- **Purpose**: Cooking assistance, recipes, meal planning, and food safety
- **Capabilities**: Recipe suggestions, ingredient substitutions, cooking techniques
- **Tool Access**: Weather information for cooking planning

### Weather Agent ☁️
- **Purpose**: Weather information and forecasts
- **Capabilities**: Current conditions, forecasts, weather alerts
- **Tool Access**: Real-time weather data

## Project Structure

```
examples/with-mastra/
├── app/
│   ├── api/chat/            # API route for agent communication
│   ├── advanced/            # Advanced page with agent selection
│   ├── globals.css          # Tailwind CSS styles
│   ├── layout.tsx           # Root layout
│   ├── MyRuntimeProvider.tsx # Advanced runtime configuration
│   └── page.tsx             # Basic chat page
├── components/
│   ├── assistant-ui/        # Chat UI components
│   └── ui/                  # Reusable UI components
├── lib/
│   └── utils.ts             # Utility functions
├── mastra/
│   ├── agents/              # Mastra agent definitions
│   ├── index.ts             # Mastra configuration
│   └── tools/               # Custom tools
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## Key Features Demonstrated

### Basic Integration
```typescript
import { useMastraRuntime } from "@assistant-ui/react-mastra";

const runtime = useMastraRuntime({
  agentId: "chef-agent",
  memory: true,
});
```

### Advanced Runtime Configuration
```typescript
const runtime = useMastraRuntime({
  agentId: selectedAgent,
  memory: true,
  stream: async function* (messages) {
    // Custom streaming implementation
  },
  onSwitchToThread: async (threadId) => {
    // Thread state retrieval
  },
  eventHandlers: {
    onMetadata: (metadata) => console.log("Metadata:", metadata),
    onError: (error) => console.error("Error:", error),
  },
});
```

### Agent Definition
```typescript
import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";

const chefAgent = new Agent({
  name: "chef-agent",
  instructions: "You are Michel, a practical and experienced home chef...",
  model: openai("gpt-4o-mini"),
  tools: { weatherTool },
  memory: true,
});
```

### Tool Integration
```typescript
export const weatherTool = {
  description: "Get current weather information",
  parameters: z.object({
    location: z.string().describe("City and state/country"),
    units: z.enum(["celsius", "fahrenheit"]).optional(),
  }),
  execute: async ({ location, units }) => {
    // Tool implementation
  }
};
```

## Customization

### Adding New Agents
1. Create a new agent file in `mastra/agents/`
2. Define the agent with instructions and tools
3. Register it in `mastra/index.ts`
4. Add it to the agent selection UI

### Adding New Tools
1. Create tool files in `mastra/tools/`
2. Define tool parameters and execution logic
3. Import and use in your agents

### Customizing the UI
- Modify components in `components/assistant-ui/`
- Update styles in `app/globals.css`
- Extend the runtime provider in `app/MyRuntimeProvider.tsx`

## Troubleshooting

### Common Issues

1. **"Agent not found" error**: Ensure the agent is registered in `mastra/index.ts`
2. **Missing API key**: Check that `OPENAI_API_KEY` is set in `.env.local`
3. **Memory not working**: Verify the database path is accessible
4. **Streaming issues**: Check the API route implementation

### Development Tips

- Use the browser dev tools to inspect network requests
- Check the console for Mastra runtime errors
- Test individual agents using the `/advanced` page
- Verify tool execution in the network tab

## Advanced Features

### Workflows
The example demonstrates XState-powered workflow integration with:
- **Human-in-the-loop interactions**: Complex business logic that requires human input
- **Real-time state streaming**: Live workflow progress updates
- **Multi-step processes**: Sequential and parallel workflow execution
- **State persistence**: Workflow state saved across sessions

Access the workflow demo at `/workflows` to see advanced orchestration.

### Memory Management
- **Persistent conversation storage**: LibSQL-based memory system with local database
- **Thread-based memory isolation**: Separate contexts for different conversation threads
- **Semantic context retrieval**: Intelligent context matching and relevance scoring
- **Memory compression**: Efficient storage of conversation history

### Tool Integration
- **Dynamic tool registration**: Runtime tool discovery and registration
- **Type-safe parameter validation**: Zod schema validation for all tool inputs
- **Real-time tool result streaming**: Live updates during tool execution
- **Error handling and recovery**: Robust error handling for tool failures

### Advanced Runtime Features
- **Agent switching**: Runtime agent selection with context preservation
- **Multi-modal support**: Text, image, and file processing capabilities
- **Custom middleware**: Extensible middleware for request/response processing
- **Event-driven architecture**: Comprehensive event system for monitoring and debugging

### Performance Optimizations
- **Streaming responses**: Efficient response streaming for reduced latency
- **Connection pooling**: Optimized database connection management
- **Memory management**: Intelligent memory usage and cleanup
- **Caching strategies**: Multi-level caching for improved performance

## Learn More

- [Mastra Documentation](https://mastra.ai/docs)
- [Assistant UI Documentation](https://www.assistant-ui.com)
- [Next.js Documentation](https://nextjs.org/docs)