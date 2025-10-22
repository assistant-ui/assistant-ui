# Mastra Integration Example

This example demonstrates how to use `@assistant-ui/react-mastra` to build AI-powered applications with Mastra agents. It showcases a comprehensive single-page interface integrating all Mastra-specific components.

## Features

- **Multiple Agents**: Screening Agent for candidate evaluation and Interview Agent for technical interviews
- **Agent Selection**: Real-time switching between different specialized agents
- **Memory Integration**: Persistent conversation memory using Mastra's memory system
- **Memory Status Display**: Real-time visualization of memory system state
- **Workflow Integration**: Hiring workflow with suspend/resume capabilities and human-in-the-loop interactions
- **Workflow Controls**: Real candidate evaluation workflow with screening and interview stages
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

- Agent switching between Screening and Interview agents
- Real-time memory status
- Hiring workflow with candidate evaluation
- Workflow suspend/resume with human feedback

## Available Agents

### Screening Agent 🔍

- **Purpose**: Initial candidate screening and resume evaluation
- **Capabilities**: Resume analysis, skill assessment, qualification matching
- **Workflow Integration**: First stage of hiring workflow with screening scores and recommendations

### Interview Agent 💼

- **Purpose**: Conducting technical and behavioral interviews
- **Capabilities**: Technical evaluation, cultural fit assessment, interview question generation
- **Workflow Integration**: Second stage of hiring workflow with interview scores and feedback

## Components Showcase

The example demonstrates all Mastra-specific components in a single integrated interface:

### Agent Selector

Switch between different Mastra agents (Screening Agent and Interview Agent) in real-time. The runtime automatically updates when you select a different agent.

### Memory Status

Displays the current state of Mastra's memory system:

- Active/inactive status indicator
- Message count in current thread
- Thread ID display
- Real-time updates as conversation progresses

### Candidate Form

Candidate submission form with:

- Candidate name input
- Resume/CV text area
- Position and experience level fields
- Submit triggers hiring workflow start

### Workflow Status

Real hiring workflow management with:

- Current workflow step display (screening, interview)
- Candidate information and scores
- Resume feedback controls for human-in-the-loop
- Status indicators (running, suspended, completed)
- Workflow resume functionality with updated scores

### Layout

The interface uses a two-column layout:

- **Left Sidebar**: Agent selector, memory status, candidate form, and workflow status
- **Main Area**: Chat thread with agent conversation

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
│   │   ├── candidate-form.tsx    # Candidate submission form
│   │   ├── workflow-status.tsx   # Workflow status display
│   │   ├── thread.tsx            # Main chat interface
│   │   ├── markdown-text.tsx     # Markdown rendering
│   │   └── tooltip-icon-button.tsx
│   └── ui/                       # Reusable UI components
├── lib/
│   └── utils.ts                  # Utility functions
├── mastra/
│   ├── agents/                   # Mastra agent definitions
│   ├── workflows/                # Workflow definitions (hiring)
│   ├── index.ts                  # Mastra configuration
│   └── memory.ts                 # Memory configuration
└── package.json
```

## Key Features Demonstrated

### Basic Integration

```typescript
import { useMastraRuntime } from "@assistant-ui/react-mastra";

const runtime = useMastraRuntime({
  api: "/api/chat",
  agentId: "screeningAgent",
  memory: { storage: "libsql" },
});
```

### Advanced Runtime Configuration

```typescript
const runtime = useMastraRuntime({
  api: "/api/chat",
  agentId: selectedAgent,
  memory: { storage: "libsql" },
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

// Initialize the OpenAI client
const openai = createOpenAI({
  apiKey: process.env["OPENAI_API_KEY"] || "",
});

const screeningAgent = new Agent({
  name: "screeningAgent",
  instructions:
    "You are a professional recruiter specializing in candidate screening...",
  model: openai("gpt-4o-mini"),
  memory: true,
});

const interviewAgent = new Agent({
  name: "interviewAgent",
  instructions: "You are an experienced technical interviewer...",
  model: openai("gpt-4o-mini"),
  memory: true,
});
```

### Workflow Definition

```typescript
import { createWorkflow } from "@mastra/core";

const hiringWorkflow = createWorkflow({
  name: "hiring-workflow",
  triggerSchema: z.object({
    candidateName: z.string(),
    resume: z.string(),
    position: z.string(),
  }),
})
  .step("screening", {
    execute: async ({ inputData, suspendData }) => {
      return {
        candidateName: suspendData?.candidateName || inputData.candidateName,
        screeningScore: suspendData?.screeningScore || 7.5,
        recommendation: suspendData?.recommendation || "proceed_to_interview",
      };
    },
  })
  .step("interview", {
    execute: async ({ suspendData }) => {
      return {
        technicalScore: suspendData?.technicalScore || 8.0,
        culturalScore: suspendData?.culturalScore || 7.5,
        finalDecision: suspendData?.finalDecision || "pending",
      };
    },
  })
  .commit();
```

## Customization

### Adding New Agents

1. Create a new agent file in `mastra/agents/`
2. Define the agent with instructions and tools
3. Register it in `mastra/index.ts`
4. Add it to the agent selection UI

### Adding New Workflows

1. Create workflow files in `mastra/workflows/`
2. Define workflow steps and execution logic
3. Register workflows in `mastra/index.ts`
4. Create API routes for workflow operations

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

The example demonstrates a real hiring workflow integration with:

- **Human-in-the-loop interactions**: Candidate screening and interview with human feedback
- **Suspend/Resume capabilities**: Workflow pauses for human input and resumes with updated data
- **Multi-step processes**: Sequential execution of screening and interview stages
- **State persistence**: Workflow state and candidate data persisted across sessions
- **Score tracking**: Screening scores, technical scores, and cultural fit scores

The workflow form in the left sidebar allows starting new hiring workflows and resuming suspended ones with updated candidate information.

### Memory Management

- **Persistent conversation storage**: LibSQL-based memory system with local database
- **Thread-based memory isolation**: Separate contexts for different conversation threads
- **Semantic context retrieval**: Intelligent context matching and relevance scoring
- **Memory compression**: Efficient storage of conversation history

### Workflow Integration

- **Dynamic workflow execution**: Runtime workflow triggering and state management
- **Type-safe input validation**: Zod schema validation for workflow inputs
- **Real-time workflow state updates**: Live status and progress tracking
- **Human-in-the-loop support**: Suspend/resume with human feedback integration

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
