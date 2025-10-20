# Mastra Integration Example

This example demonstrates how to use `@assistant-ui/react-mastra` to build AI-powered applications with Mastra agents. It showcases a comprehensive single-page interface integrating all Mastra-specific components.

## Features

- **Multiple Agents**: Chef Agent for cooking assistance and Weather Agent for weather information
- **Agent Selection**: Real-time switching between different specialized agents
- **Memory Integration**: Persistent conversation memory using Mastra's memory system
- **Memory Status Display**: Real-time visualization of memory system state
- **Tool Execution**: Weather tool integration with enhanced UI display
- **Workflow Controls**: Mock workflow demonstration with progress tracking
- **Streaming Responses**: Real-time streaming of agent responses
- **Advanced UI**: Complete chat interface with rich message formatting and tool result visualization

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

4. **Open [http://localhost:3000](http://localhost:3000)**

You'll see a comprehensive interface showcasing:
- Agent switching between Chef and Weather agents
- Real-time memory status
- Enhanced tool call displays
- Mock workflow controls

## Available Agents

### Chef Agent 🍳
- **Purpose**: Cooking assistance, recipes, meal planning, and food safety
- **Capabilities**: Recipe suggestions, ingredient substitutions, cooking techniques
- **Tool Access**: Weather information for cooking planning

### Weather Agent ☁️
- **Purpose**: Weather information and forecasts
- **Capabilities**: Current conditions, forecasts, weather alerts
- **Tool Access**: Real-time weather data

## Components Showcase

The example demonstrates all Mastra-specific components in a single integrated interface:

### Agent Selector
Switch between different Mastra agents (Chef Agent and Weather Agent) in real-time. The runtime automatically updates when you select a different agent.

### Memory Status
Displays the current state of Mastra's memory system:
- Active/inactive status indicator
- Message count in current thread
- Thread ID display
- Real-time updates as conversation progresses

### Tool Results
Enhanced tool call display with:
- Expandable/collapsible sections
- Color-coded status (running, success, error)
- Formatted arguments and results
- Error message display

### Workflow Controls
Demonstrates workflow management with:
- Start/pause/stop controls
- Progress tracking with percentage
- Step-by-step visualization
- Status indicators

**Note**: Workflow functionality uses mock data for demonstration purposes.

### Layout
The interface uses a two-column layout:
- **Left Sidebar**: Agent selector, memory status, and workflow controls
- **Main Area**: Chat thread with enhanced tool results

## Project Structure

```
examples/with-mastra/
├── app/
│   ├── api/chat/              # Mastra API route
│   ├── api/memory/            # Memory management endpoints
│   ├── globals.css            # Tailwind styles
│   ├── layout.tsx             # Root layout with MyRuntimeProvider
│   ├── MyRuntimeProvider.tsx  # Mastra runtime configuration
│   └── page.tsx               # Main demo page with all components
├── components/
│   ├── assistant-ui/
│   │   ├── agent-selector.tsx    # Switch between agents
│   │   ├── memory-status.tsx     # Memory system status
│   │   ├── tool-results.tsx      # Enhanced tool display
│   │   ├── workflow-controls.tsx # Workflow management
│   │   ├── thread-list.tsx       # Thread history
│   │   ├── thread.tsx            # Main chat interface
│   │   ├── markdown-text.tsx     # Markdown rendering
│   │   └── tooltip-icon-button.tsx
│   └── ui/                       # Reusable UI components
├── lib/
│   └── utils.ts                  # Utility functions
├── mastra/
│   ├── agents/                   # Mastra agent definitions
│   ├── index.ts                  # Mastra configuration
│   ├── memory.ts                 # Memory configuration
│   └── tools/                    # Custom tools
└── package.json
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
- Switch agents using the agent selector in the left sidebar
- Verify tool execution in the network tab
- Monitor memory status in real-time via the Memory Status component

## Advanced Features

### Workflows
The example demonstrates workflow integration with:
- **Human-in-the-loop interactions**: Complex business logic that requires human input
- **Real-time state streaming**: Live workflow progress updates
- **Multi-step processes**: Sequential and parallel workflow execution
- **State persistence**: Workflow state saved across sessions

The workflow controls in the left sidebar show a mock demonstration of workflow functionality.

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