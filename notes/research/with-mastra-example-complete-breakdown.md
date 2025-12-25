---
date: 2025-10-20T00:00:00Z
researcher: Claude
git_commit: eb148b4297ae6b8a6fd2ff27fbb110ba9bd2863e
branch: aui-25-dedicated-mastra-implementation
repository: assistant-ui
topic: "Complete breakdown of examples/with-mastra - architecture, features, and implementation"
tags: [research, codebase, mastra, react-mastra, examples, agent-selection, memory, tools, streaming, workflow]
status: complete
last_updated: 2025-10-20
last_updated_by: Claude
---

# Research: Complete Breakdown of examples/with-mastra

**Date**: 2025-10-20
**Researcher**: Claude
**Git Commit**: eb148b4297ae6b8a6fd2ff27fbb110ba9bd2863e
**Branch**: aui-25-dedicated-mastra-implementation
**Repository**: assistant-ui

## Research Question

Research every part and example of @examples/with-mastra and provide a breakdown of how it all works and what it shows off.

## Summary

The `examples/with-mastra` directory is a comprehensive demonstration of the `@assistant-ui/react-mastra` integration package. It showcases a full-stack Next.js application that integrates Mastra AI agents with the assistant-ui framework. The example demonstrates:

- **Multi-agent system** with runtime agent switching (Chef Agent and Weather Agent)
- **Persistent memory** using LibSQL storage with thread-based conversation tracking
- **Tool integration** with Zod schema validation and streaming execution
- **Real-time streaming** using Server-Sent Events (SSE) for text and tool calls
- **Comprehensive UI** including agent selection, memory status, workflow controls, and enhanced tool result displays
- **Custom runtime provider** that bridges Mastra SDK with assistant-ui primitives

The implementation follows a clean architecture with separation of concerns: Mastra configuration, Next.js API routes for streaming, React runtime hooks, and composable UI components.

## Detailed Findings

### 1. Project Structure and Architecture

#### Directory Layout
```
examples/with-mastra/
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # Main streaming endpoint
│   │   └── memory/                     # Memory management APIs
│   │       ├── query/route.ts          # Semantic memory search
│   │       ├── threads/route.ts        # Thread list/create
│   │       └── threads/[threadId]/route.ts  # Get/update thread
│   ├── globals.css                     # Tailwind styles
│   ├── layout.tsx                      # Root layout with provider
│   ├── MyRuntimeProvider.tsx           # Mastra runtime setup
│   └── page.tsx                        # Main demo page
├── components/
│   ├── assistant-ui/
│   │   ├── agent-selector.tsx          # Agent switching UI
│   │   ├── memory-status.tsx           # Memory state display
│   │   ├── tool-results.tsx            # Enhanced tool display
│   │   ├── workflow-controls.tsx       # Workflow management UI
│   │   ├── thread.tsx                  # Main chat interface
│   │   ├── markdown-text.tsx           # Markdown rendering
│   │   └── tooltip-icon-button.tsx     # Reusable button component
│   └── ui/                             # Base UI components
├── lib/
│   └── utils.ts                        # Utility functions
├── mastra/
│   ├── agents/
│   │   ├── chefAgent.ts                # Chef agent definition
│   │   └── weatherAgent.ts             # Weather agent definition
│   ├── tools/
│   │   └── weatherTool.ts              # Weather tool implementation
│   ├── index.ts                        # Mastra instance
│   └── memory.ts                       # Memory configuration
└── package.json                        # Dependencies
```

**Key Architectural Decisions:**
- Separation of Mastra configuration (`mastra/`) from Next.js app code
- API routes handle backend streaming, client-side hooks handle consumption
- Component library split between Mastra-specific (`assistant-ui/`) and generic (`ui/`)
- Memory system configured once, shared across all agents

---

### 2. Runtime Integration and Setup

**Reference**: `app/MyRuntimeProvider.tsx:22-61`

#### Core Implementation

The runtime provider is the bridge between Mastra SDK and assistant-ui:

```typescript
const runtime = useMastraRuntime({
  api: "/api/chat",                    // Backend endpoint
  agentId: selectedAgent,              // Dynamic agent selection
  memory: {
    storage: "libsql",                 // SQLite-based storage
    userId: "default-user",            // User identifier
  },
  eventHandlers: {
    onMetadata: (metadata) => console.log("Mastra metadata:", metadata),
    onError: (error) => console.error("Mastra error:", error),
    onInterrupt: (interrupt) => console.log("Mastra interrupt:", interrupt),
    onToolCall: (toolCall) => console.log("Tool call:", toolCall),
    onToolResult: (toolResult) => console.log("Tool result:", toolResult),
  },
});
```

**Key Features:**
- `agentId` is reactive - changing it updates the agent for subsequent requests
- Memory configuration specifies storage type and user context
- Event handlers provide hooks into Mastra's lifecycle events
- Runtime wraps with both custom `AgentContext` and `AssistantRuntimeProvider`

**Data Flow:**
1. User input → `useMastraRuntime.handleNew()` (packages/react-mastra/src/useMastraRuntime.ts:128)
2. Thread ID retrieved/created via `memory.createThread()` (line 152)
3. POST request to `/api/chat` with messages, agentId, threadId, resourceId (lines 164-174)
4. SSE stream parsed and processed by `processEvent` handler (lines 74-126)
5. Messages accumulated via `MastraMessageAccumulator` (packages/react-mastra/src/MastraMessageAccumulator.ts:35-66)
6. UI updates through `useExternalStoreRuntime` (packages/react-mastra/src/useMastraRuntime.ts:230-273)

**Agent Context Pattern:**
```typescript
const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) throw new Error("Must be used within MyRuntimeProvider");
  return context;
};
```

This allows components to access `selectedAgent` and `setSelectedAgent` without prop drilling.

---

### 3. Mastra Agent Architecture

**Reference**: `mastra/agents/chefAgent.ts:11-27`, `mastra/agents/weatherAgent.ts:11-27`

#### Agent Definition Structure

Both agents follow identical patterns with different personalities:

```typescript
export const chefAgent = new Agent({
  name: "chef-agent",
  instructions: `You are Michel, a practical and experienced home chef...`,
  model: openai("gpt-4o-mini"),
  tools: { weatherTool },
  memory,
});
```

**Configuration Components:**

1. **Name** (line 12): String identifier used for agent lookup via `mastra.getAgent(agentId)`

2. **Instructions** (lines 13-20): Defines agent personality and capabilities
   - Chef Agent: Cooking assistance, recipes, meal planning, food safety
   - Weather Agent: Weather information, forecasts, climate advice, travel recommendations

3. **Model** (line 22): OpenAI GPT-4o-mini configured via `@ai-sdk/openai`
   ```typescript
   const openai = createOpenAI({
     apiKey: process.env["OPENAI_API_KEY"] || "",
   });
   ```

4. **Tools** (lines 23-25): Object mapping tool names to tool definitions
   - Both agents share `weatherTool` for weather data
   - Tool names become available to LLM for function calling

5. **Memory** (line 26): Shared memory instance for conversation persistence

#### Agent Registration

**Reference**: `mastra/index.ts:5-10`

```typescript
export const mastra = new Mastra({
  agents: {
    chefAgent,
    weatherAgent,
  },
});
```

Agents registered in a single Mastra instance, accessed via `mastra.getAgent(agentId)` in API route (app/api/chat/route.ts:25).

**Agent Retrieval Flow:**
1. Client sends `agentId` in request body (app/api/chat/route.ts:11)
2. Backend calls `mastra.getAgent(agentId)` (line 25)
3. Returns 404 if agent not found (lines 26-30)
4. Agent's `stream()` method called with messages and memory context (lines 34-39)

---

### 4. Memory System Implementation

**Reference**: `mastra/memory.ts:5-24`, `app/api/chat/route.ts:34-39`

#### LibSQL Storage Configuration

```typescript
export const memory = new Memory({
  storage: new LibSQLStore({
    url: process.env["LIBSQL_URL"] || "file:./mastra.db",
  }),
  options: {
    lastMessages: 10,
    workingMemory: {
      enabled: true,
      scope: "resource",
    },
    threads: {
      generateTitle: true,
    },
  },
});
```

**Storage Backend:**
- LibSQL (SQLite-compatible) with local file storage
- Database location: `./mastra.db` in project root
- Three files created: `mastra.db`, `mastra.db-shm`, `mastra.db-wal` (SQLite WAL mode)

**Memory Configuration:**

1. **lastMessages: 10** - Recent message window for context
   - Limits how many recent messages are included in agent context
   - Reduces token usage while maintaining conversation continuity

2. **workingMemory.enabled: true** - Persistent user data
   - Stores facts, preferences, and long-term context
   - Scope: "resource" means memory persists across ALL threads for same user
   - Enables personalization and context retention

3. **threads.generateTitle: true** - Auto-generates descriptive thread titles
   - Uses conversation content to create meaningful names
   - Improves thread organization and discoverability

#### Memory Context Usage

**In API Route** (app/api/chat/route.ts:34-39):
```typescript
const result = await agent.stream(messages, {
  memory: {
    thread: threadId,      // Conversation identifier
    resource: resourceId,  // User identifier
  },
});
```

**Thread and Resource IDs:**
- `threadId`: Required parameter (validated at line 17-22), identifies specific conversation
- `resourceId`: Defaults to "default-user" (line 10), groups threads by user
- Both sent from client in request body (extracted at lines 7-12)

**Memory API Routes:**

1. **POST /api/memory/threads** (app/api/memory/threads/route.ts:31-60)
   - Creates new thread with optional threadId, title, metadata
   - Requires resourceId for user association

2. **GET /api/memory/threads** (line 4-29)
   - Lists all threads for a resourceId
   - Calls `memory.getThreadsByResourceId()`

3. **GET /api/memory/threads/[threadId]** (app/api/memory/threads/[threadId]/route.ts:4-48)
   - Retrieves thread metadata and messages
   - Returns 404 if thread doesn't exist

4. **PATCH /api/memory/threads/[threadId]** (line 50-94)
   - Updates thread title and/or metadata
   - Preserves existing values if not provided

5. **POST /api/memory/query** (app/api/memory/query/route.ts:4-52)
   - Semantic search within thread messages
   - Supports `vectorSearchString` for similarity-based retrieval

**Client-Side Memory Hook:**

**Reference**: `packages/react-mastra/src/useMastraMemory.ts:14-27`

```typescript
const [threads, setThreads] = useState<Map<string, MastraThreadState>>(new Map());
const [currentThread, setCurrentThread] = useState<string | null>(config.threadId || null);
const [isSearching, setIsSearching] = useState(false);

const apiBase = useMemo(() => "/api/memory", []);
const resourceId = useMemo(() => config.userId || "default-user", [config.userId]);
```

**Key Operations:**
- `createThread()` (lines 147-188): Generates UUID, POSTs to API, sets as current thread
- `getThreadContext()` (lines 79-144): Fetches thread data, transforms message format, caches locally
- `searchMemory()` (lines 30-64): Semantic search with similarity scores
- `updateThreadMetadata()` (lines 211-245): PATCHes thread updates

---

### 5. Tool System and Execution

**Reference**: `mastra/tools/weatherTool.ts:3-51`, `app/api/chat/route.ts:102-126`

#### Tool Definition

Tools are plain objects with three properties:

```typescript
export const weatherTool = {
  description: "Get current weather information for a specific location",
  parameters: z.object({
    location: z.string().describe("The city and state/country, e.g., 'San Francisco, CA'"),
    units: z.enum(["celsius", "fahrenheit"]).optional().describe("Temperature units"),
  }),
  execute: async ({ location, units = "celsius" }) => {
    // Mock weather data lookup
    const weatherData = mockWeatherData[location] || defaultWeather;
    return {
      location,
      ...weatherData,
      lastUpdated: new Date().toISOString()
    };
  }
};
```

**Zod Schema Pattern:**
- `z.object()` defines parameter structure
- `.describe()` provides AI-readable documentation for each field
- `.optional()` marks optional parameters
- `z.enum()` restricts values to specific options
- Schema used for both validation and LLM function calling

**Mock Implementation:**
- Hardcoded weather data for demonstration (lines 12-34)
- Real implementation would call weather API
- Returns object with temperature, condition, humidity, windSpeed

#### Tool Integration with Agents

**Reference**: `mastra/agents/weatherAgent.ts:23-25`, `mastra/agents/chefAgent.ts:23-25`

```typescript
tools: {
  weatherTool,  // Property name becomes tool identifier
}
```

- Both agents share the same tool instance
- Tool names must match for LLM to invoke correctly
- Multiple tools can be added to the object

#### Tool Call Streaming

**Reference**: `app/api/chat/route.ts:102-126`

After text streaming completes, tool calls are extracted and streamed:

```typescript
const toolCalls = await result.toolCalls;
console.log("Chat API: Tool calls:", JSON.stringify(toolCalls, null, 2));

if (toolCalls && toolCalls.length > 0) {
  for (const toolCall of toolCalls) {
    const toolEvent = {
      id: uuidv4(),
      event: "tool/call",
      data: {
        toolCallId: toolCall.payload?.toolCallId,
        toolName: toolCall.payload?.toolName,
        args: toolCall.payload?.args,
      },
      timestamp: new Date().toISOString()
    };
    safeEnqueue(encoder.encode(`data: ${JSON.stringify(toolEvent)}\n\n`));
  }
}
```

**Tool Event Structure:**
- Event type: `"tool/call"`
- `toolCallId`: Unique identifier for this specific invocation
- `toolName`: Name of the tool (e.g., "weatherTool")
- `args`: Arguments object passed to the tool
- Sent as separate SSE events after text chunks

#### Client-Side Tool Processing

**Reference**: `packages/react-mastra/src/useMastraRuntime.ts:85-87`

```typescript
case MastraKnownEventTypes.ToolCall:
  config.eventHandlers?.onToolCall?.(event.data);
  break;
```

Tool call events forwarded to event handlers for logging/monitoring.

**Tool Result Display:**

**Reference**: `components/assistant-ui/thread.tsx:210-226`

```typescript
<MessagePrimitive.Parts
  components={{
    Text: MarkdownText,
    tools: {
      Fallback: (props) => (
        <ToolResults
          toolCall={{
            name: props.toolName || "Unknown Tool",
            args: props.args,
            state: props.status?.type === "running" ? "running"
                 : props.status?.type === "complete" ? "success"
                 : "error",
          }}
          result={props.result}
          isExpanded={false}
        />
      ),
    },
  }}
/>
```

**ToolResults Component Features** (components/assistant-ui/tool-results.tsx:34-142):
- Collapsible card with state icon (Loader2/CheckCircle2/XCircle)
- Color-coded by state: blue=running, green=success, red=error
- Expandable to show formatted JSON arguments and results
- Error messages displayed in red text

---

### 6. API Streaming Implementation

**Reference**: `app/api/chat/route.ts:5-185`

#### Request Handling

```typescript
const {
  messages,           // Chat message array
  threadId,          // Required for memory
  resourceId = "default-user",
  agentId = "chefAgent",
} = await req.json();

// Validate threadId is present
if (!threadId) {
  return new Response(
    JSON.stringify({ error: "threadId is required for memory" }),
    { status: 400 }
  );
}
```

**Parameter Flow:**
- Sent from `useMastraRuntime.ts:164-174` in POST request body
- threadId obtained from memory system (line 152: `memory.createThread()`)
- resourceId mapped from `config.memory.userId` (line 160)
- agentId passed from runtime config (line 171)

#### Streaming Protocol

The API implements Server-Sent Events (SSE) with three event types:

**1. message/partial** (lines 75-97) - Text chunks
```typescript
for await (const chunk of result.textStream) {
  const event = {
    id: uuidv4(),
    event: "message/partial",
    data: {
      id: messageId,              // Same ID for all chunks
      type: "assistant",
      content: [{ type: "text", text: chunk }],  // DELTA only
      timestamp: new Date().toISOString(),
      status: "running"
    }
  };
  safeEnqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}
```

**Design Decision** (line 79 comment):
- Each chunk contains ONLY the delta (new text), not accumulated text
- Client-side `appendMastraChunk` handles accumulation
- Reduces bandwidth and processing overhead

**2. tool/call** (lines 102-126) - Tool invocations
```typescript
const toolCalls = await result.toolCalls;
for (const toolCall of toolCalls) {
  const toolEvent = {
    id: uuidv4(),
    event: "tool/call",
    data: {
      toolCallId: toolCall.payload?.toolCallId,
      toolName: toolCall.payload?.toolName,
      args: toolCall.payload?.args,
    }
  };
  safeEnqueue(encoder.encode(`data: ${JSON.stringify(toolEvent)}\n\n`));
}
```

**3. message/complete** (lines 128-143) - Completion signal
```typescript
const completeEvent = {
  id: uuidv4(),
  event: "message/complete",
  data: {
    id: messageId,
    type: "assistant",
    content: [],        // Empty - text already accumulated
    status: "complete"
  }
};
```

**Stream Termination** (lines 145-146):
```typescript
safeEnqueue(encoder.encode("data: [DONE]\n\n"));
safeClose();
```

#### Safe Stream Management

**Reference**: lines 49-71

```typescript
let isClosed = false;

const safeEnqueue = (data: Uint8Array) => {
  if (!isClosed) {
    try {
      controller.enqueue(data);
    } catch (error) {
      console.error("Chat API: Enqueue error:", error);
      isClosed = true;
    }
  }
};

const safeClose = () => {
  if (!isClosed) {
    try {
      controller.close();
      isClosed = true;
    } catch (error) {
      console.error("Chat API: Close error:", error);
    }
  }
};
```

Prevents double-close errors and handles stream write failures gracefully.

#### Client-Side Stream Processing

**Reference**: `packages/react-mastra/src/useMastraRuntime.ts:186-213`

```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const lines = (buffer + chunk).split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6);
    if (data === "[DONE]") break;

    try {
      const event = JSON.parse(data);
      processEvent(event);
    } catch (error) {
      console.error("Failed to parse SSE event:", error);
    }
  }
}
```

**SSE Parsing Strategy:**
1. Read stream chunks with TextDecoder
2. Split on newlines, buffer incomplete lines
3. Extract data after `"data: "` prefix
4. Check for `[DONE]` terminator
5. Parse JSON and route to `processEvent`

#### Message Accumulation

**Reference**: `packages/react-mastra/src/appendMastraChunk.ts:16-44`

```typescript
export const appendMastraChunk = (
  previous: MastraMessage | undefined,
  current: MastraMessage,
): MastraMessage => {
  if (!previous) return current;

  return {
    ...previous,
    content: appendContent(previous.content, current.content),
    metadata: { ...previous.metadata, ...current.metadata },
    timestamp: current.timestamp || previous.timestamp,
    status: current.status || previous.status,
  };
};
```

**Text Concatenation** (lines 78-91):
- Finds existing text content part
- Concatenates new text to existing
- Preserves other content parts (images, files, etc.)

**Tool Call Merging** (lines 92-117):
- Matches tool calls by ID
- Updates existing calls with new data
- Appends new tool calls

---

### 7. UI Components and Functionality

#### AgentSelector Component

**Reference**: `components/assistant-ui/agent-selector.tsx:22-78`

```typescript
<div className="flex flex-col space-y-2">
  {agents.map((agent) => {
    const isSelected = selectedAgent === agent.id;
    const AgentIcon = agent.icon;

    return (
      <Button
        key={agent.id}
        variant={isSelected ? "default" : "ghost"}
        onClick={() => onAgentChange?.(agent.id)}
        aria-pressed={isSelected}
      >
        <AgentIcon className="h-5 w-5" />
        <div className="flex flex-col items-start">
          <span className="font-medium">{agent.name}</span>
          <span className="text-xs">{agent.description}</span>
        </div>
      </Button>
    );
  })}
</div>
```

**Features:**
- Displays list of available agents with icons (ChefHat, Cloud from lucide-react)
- Visual distinction for selected agent (default variant vs ghost)
- Triggers agent change callback on click
- ARIA attributes for accessibility

**Usage** (app/page.tsx:67-72):
```typescript
<AgentSelector
  agents={agents}
  selectedAgent={selectedAgent}
  onAgentChange={setSelectedAgent}
/>
```

#### MemoryStatus Component

**Reference**: `components/assistant-ui/memory-status.tsx:29-95`

```typescript
const threadRuntime = useThreadRuntime();
const state = threadRuntime.getState();
const displayThreadId = threadId || "current";

const messageCount = state.messages.length;
const hasMemory = messageCount > 0;
```

**Displays:**
1. **Status indicator** (lines 50-68):
   - "Active" with green badge when messages exist
   - "Empty" with gray badge when no messages
   - Colored dot indicator (green/gray)

2. **Statistics** (lines 71-93) when `showStats={true}`:
   - Message count with MessageCircle icon
   - Thread ID (truncated) with Clock icon

**Runtime Integration:**
- Directly calls `useThreadRuntime()` from @assistant-ui/react
- Reads message count from thread state
- Updates automatically when messages change

#### WorkflowControls Component

**Reference**: `components/assistant-ui/workflow-controls.tsx:36-253`

```typescript
interface WorkflowControlsProps {
  workflowId: string;
  status?: "idle" | "running" | "paused" | "completed" | "error";
  progress?: number;
  steps?: WorkflowStep[];
  showSteps?: boolean;
  allowPause?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onReset?: () => void;
}
```

**UI Elements:**
1. **Status header** (lines 103-117): Shows icon, status label, workflow ID
2. **Progress bar** (lines 120-142): Visual progress with percentage
3. **Control buttons** (lines 145-208): Start/Pause/Resume/Stop/Reset based on state
4. **Workflow steps** (lines 211-253): Shows step-by-step progress with status icons

**Current State:**
- Demonstrates workflow UI patterns
- Currently uses mock data for demonstration (app/page.tsx:32-56)
- Not yet integrated with real Mastra workflow APIs

**Future Integration:**
- Would connect to `useMastraWorkflows` hook (packages/react-mastra/src/useMastraWorkflows.ts)
- Provides operations: `startWorkflow`, `suspendWorkflow`, `resumeWorkflow`, `sendCommand`
- Hook manages workflow state and subscribes to events

#### ToolResults Component

**Reference**: `components/assistant-ui/tool-results.tsx:34-142`

```typescript
const [internalExpanded, setInternalExpanded] = React.useState(false);
const isExpanded = controlledExpanded ?? internalExpanded;
const { name, args, state: toolState = "success" } = toolCall;
```

**State-Based Styling:**
- Running: Blue theme, Loader2 icon with spin animation
- Success: Green theme, CheckCircle2 icon
- Error: Red theme, XCircle icon

**Collapsible Content:**
1. **Arguments** (lines 108-117):
   ```typescript
   {args && Object.keys(args).length > 0 && (
     <pre className="...">
       {JSON.stringify(args, null, 2)}
     </pre>
   )}
   ```

2. **Result** (lines 119-130):
   ```typescript
   {result !== undefined && (
     <pre className="...">
       {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
     </pre>
   )}
   ```

3. **Error** (lines 132-137): Red text when state is "error"

**Integration:**
- Registered as fallback in `MessagePrimitive.Parts` (thread.tsx:210-226)
- Receives props from @assistant-ui/react tool primitive
- Maps status types: running/complete → running/success

#### Thread Component

**Reference**: `components/assistant-ui/thread.tsx:27-318`

Built entirely with @assistant-ui/react primitives:

**Main Structure:**
```typescript
<ThreadPrimitive.Root>
  <ThreadPrimitive.Viewport>
    <ThreadWelcome />
    <ThreadPrimitive.Messages
      components={{
        UserMessage,
        EditComposer,
        AssistantMessage,
      }}
    />
    <Composer />
  </ThreadPrimitive.Viewport>
</ThreadPrimitive.Root>
```

**Key Components:**

1. **Welcome Screen** (lines 73-111):
   - Shows when thread is empty
   - Two suggestion buttons with auto-send
   - Prompts: "What can you cook with chicken and rice?" and "What's the weather like in New York?"

2. **Composer** (lines 113-154):
   - Auto-resizing textarea with max height
   - Send button when idle, Cancel button when running
   - Focus on mount for immediate typing

3. **User Message** (lines 156-184):
   - Muted background bubble, right-aligned
   - Edit button in action bar
   - Branch picker for message variations

4. **Assistant Message** (lines 203-274):
   - Left-aligned with max 80% width
   - MarkdownText for formatted content
   - ToolResults component for tool calls
   - Copy and Reload buttons in action bar
   - Error display with red styling

5. **Message Parts Configuration** (lines 207-228):
   ```typescript
   <MessagePrimitive.Parts
     components={{
       Text: MarkdownText,
       tools: {
         Fallback: (props) => <ToolResults {...mappedProps} />
       },
     }}
   />
   ```

**Supporting Components:**
- **MarkdownText** (markdown-text.tsx:20-25): GitHub Flavored Markdown with syntax highlighting
- **TooltipIconButton** (tooltip-icon-button.tsx:47-65): Radix UI tooltip with zero delay

---

### 8. Complete Data Flow Walkthrough

#### User Sends Message

1. **User types in Composer** (thread.tsx:116-121)
   - ComposerPrimitive.Input captures text
   - Auto-resizing textarea (rows={1}, max-h-40)

2. **User clicks Send** (thread.tsx:131-139)
   - ComposerPrimitive.Send triggers submission
   - Runtime's `handleNew` callback invoked

3. **Runtime processes message** (useMastraRuntime.ts:128-222)
   - Sets `isRunning = true`
   - Creates user message object with UUID
   - Adds to accumulator
   - Gets/creates threadId via memory system
   - Constructs request with messages, agentId, threadId, resourceId
   - POSTs to `/api/chat`

4. **API receives request** (app/api/chat/route.ts:5-39)
   - Extracts parameters from request body
   - Validates threadId is present
   - Retrieves agent via `mastra.getAgent(agentId)`
   - Calls `agent.stream(messages, { memory: { thread, resource } })`

5. **Agent streams response** (route.ts:47-163)
   - Iterates `result.textStream` for text chunks
   - Each chunk sent as `message/partial` SSE event
   - After text, awaits `result.toolCalls`
   - Each tool call sent as `tool/call` SSE event
   - Sends `message/complete` with empty content
   - Terminates with `[DONE]` marker

6. **Client processes stream** (useMastraRuntime.ts:186-213)
   - Reads SSE stream with TextDecoder
   - Buffers incomplete lines
   - Parses events and routes to `processEvent`

7. **Events accumulated** (useMastraRuntime.ts:74-126)
   - MessagePartial/Complete → accumulator.addMessages()
   - ToolCall → forwards to event handler
   - Error → calls onError and stops running

8. **Messages merged** (appendMastraChunk.ts:16-44)
   - Finds previous message by ID
   - Concatenates text content
   - Merges metadata and tool calls
   - Returns updated message

9. **State updates** (useMastraRuntime.ts:82)
   - `setMessages(newMessages)` triggers re-render
   - Runtime propagates to components

10. **UI renders** (thread.tsx:207-236)
    - MessagePrimitive.Parts displays content
    - Text rendered as MarkdownText
    - Tool calls rendered as ToolResults
    - Action bar shows Copy/Reload buttons

#### Agent Switching

1. **User selects new agent** (agent-selector.tsx:61)
   - Button click calls `onAgentChange(agent.id)`

2. **Context updates** (page.tsx:70)
   - `setSelectedAgent(agentId)` updates state

3. **Runtime receives new agentId** (MyRuntimeProvider.tsx:27)
   - `agentId: selectedAgent` references live state
   - Runtime config object recreates

4. **Next message uses new agent** (useMastraRuntime.ts:171)
   - Request body includes updated `agentId`
   - Backend retrieves different agent
   - Same memory context preserved (thread/resource IDs)

#### Memory Persistence

1. **Message sent with memory context** (route.ts:34-39)
   - `agent.stream(messages, { memory: { thread, resource } })`

2. **Agent fetches history** (internal to Mastra Agent)
   - Calls `fetchMemory()` to retrieve recent messages
   - Gets working memory for resource
   - Prepends to current messages

3. **Agent streams response** (route.ts:75-97)
   - LLM generates response with full context

4. **Messages auto-saved** (internal to Mastra Agent)
   - After streaming completes, saves to LibSQL
   - Updates thread metadata
   - Working memory extracted and stored

5. **Memory status updates** (memory-status.tsx:30-35)
   - `useThreadRuntime().getState()` reflects new messages
   - Message count increments
   - Status shows "Active" with green indicator

---

## Key Patterns and Best Practices

### 1. Delta-Based Streaming
- Server sends only text deltas (new chunks), not accumulated text
- Client accumulates using `appendMastraChunk` function
- Reduces bandwidth and prevents redundant processing

### 2. Message Identity Management
- Single `messageId` generated for entire assistant message
- Used across all partial, tool, and complete events
- Enables accumulator to merge by ID efficiently

### 3. Dual-Promise Pattern
- `result.textStream` - AsyncIterator for text chunks
- `result.toolCalls` - Promise that resolves after streaming
- Allows simultaneous display and tool execution

### 4. Safe Stream Control
- `isClosed` flag prevents double-close errors
- `safeEnqueue` catches write errors gracefully
- Try-catch around entire stream iteration

### 5. Shared Memory Instance
- Single memory instance configured in `mastra/memory.ts`
- Imported by both agents
- Ensures consistency across agent switches

### 6. Resource-Scoped Memory
- `resourceId` identifies user across threads
- Working memory persists for same user
- Enables long-term context and personalization

### 7. Primitive-Based Composition
- All chat UI built with @assistant-ui/react primitives
- Unstyled base with custom Tailwind styling
- Clean separation between framework and styling

### 8. Runtime Abstraction
- Components don't directly access Mastra SDK
- Runtime layer handles all Mastra communication
- Clean separation of concerns

### 9. Event-Driven Architecture
- Backend emits typed SSE events
- Frontend processes through centralized handler
- Extensible for additional event types

### 10. Zod Schema Validation
- Tools use Zod for runtime validation
- `.describe()` provides AI-readable documentation
- Same schema for both validation and LLM function calling

---

## Configuration Reference

### Environment Variables

```bash
OPENAI_API_KEY=your_openai_key        # Required for model API calls
LIBSQL_URL=file:./mastra.db           # Optional, defaults to local file
```

### Memory Configuration (mastra/memory.ts)

```typescript
{
  storage: LibSQLStore,           // SQLite-based storage
  lastMessages: 10,               // Recent message window
  workingMemory: {
    enabled: true,                // Persistent user data
    scope: "resource",            // Cross-thread per user
  },
  threads: {
    generateTitle: true,          // Auto-generate titles
  }
}
```

### Runtime Configuration (app/MyRuntimeProvider.tsx)

```typescript
{
  api: "/api/chat",               // Streaming endpoint
  agentId: selectedAgent,         // Dynamic agent selection
  memory: {
    storage: "libsql",            // Storage backend type
    userId: "default-user",       // User identifier
  },
  eventHandlers: {
    onMetadata, onError,          // Lifecycle hooks
    onInterrupt, onToolCall,
    onToolResult,
  }
}
```

### Agent Configuration (mastra/agents/)

```typescript
{
  name: string,                   // Agent identifier
  instructions: string,           // Personality and capabilities
  model: LanguageModel,           // OpenAI GPT-4o-mini
  tools: Record<string, Tool>,    // Available tools
  memory: Memory,                 // Shared memory instance
}
```

### Tool Configuration (mastra/tools/)

```typescript
{
  description: string,            // Natural language description
  parameters: ZodObject,          // Zod schema for validation
  execute: async (params) => result,  // Implementation function
}
```

---

## File Reference Index

| Component | File Path | Key Lines | Description |
|-----------|-----------|-----------|-------------|
| **Runtime Provider** |
| Main Provider | `app/MyRuntimeProvider.tsx` | 22-61 | useMastraRuntime setup with config |
| Agent Context | `app/MyRuntimeProvider.tsx` | 7-20 | Context for agent selection |
| Runtime Hook | `packages/react-mastra/src/useMastraRuntime.ts` | 54-273 | Core runtime implementation |
| Memory Hook | `packages/react-mastra/src/useMastraMemory.ts` | 14-245 | Memory operations |
| **Mastra Configuration** |
| Mastra Instance | `mastra/index.ts` | 5-10 | Agent registration |
| Memory Config | `mastra/memory.ts` | 5-24 | LibSQL storage setup |
| Chef Agent | `mastra/agents/chefAgent.ts` | 11-27 | Chef agent definition |
| Weather Agent | `mastra/agents/weatherAgent.ts` | 11-27 | Weather agent definition |
| Weather Tool | `mastra/tools/weatherTool.ts` | 3-51 | Tool implementation |
| **API Routes** |
| Chat Streaming | `app/api/chat/route.ts` | 5-185 | Main SSE streaming endpoint |
| Memory Query | `app/api/memory/query/route.ts` | 4-52 | Semantic search |
| Thread List | `app/api/memory/threads/route.ts` | 4-60 | List/create threads |
| Thread Details | `app/api/memory/threads/[threadId]/route.ts` | 4-94 | Get/update thread |
| **UI Components** |
| Main Page | `app/page.tsx` | 13-124 | Demo page layout |
| Thread | `components/assistant-ui/thread.tsx` | 27-318 | Main chat interface |
| Agent Selector | `components/assistant-ui/agent-selector.tsx` | 22-78 | Agent switching UI |
| Memory Status | `components/assistant-ui/memory-status.tsx` | 29-95 | Memory visualization |
| Tool Results | `components/assistant-ui/tool-results.tsx` | 34-142 | Tool display |
| Workflow Controls | `components/assistant-ui/workflow-controls.tsx` | 36-253 | Workflow UI (mock) |
| Markdown Text | `components/assistant-ui/markdown-text.tsx` | 20-143 | GFM rendering |
| **Utilities** |
| Message Accumulator | `packages/react-mastra/src/MastraMessageAccumulator.ts` | 35-66 | Message merging |
| Append Chunk | `packages/react-mastra/src/appendMastraChunk.ts` | 16-125 | Content concatenation |

---

## What This Example Shows Off

### 1. Multi-Agent Architecture
- **Runtime agent switching** without recreating runtime
- Shared memory across agents for context continuity
- Different personalities with same tool access

### 2. Persistent Memory System
- **LibSQL storage** with local SQLite database
- **Thread-based conversations** with unique IDs
- **Resource-scoped working memory** for user personalization
- **Automatic title generation** for threads
- API routes for full CRUD operations

### 3. Tool Integration
- **Zod schema validation** for type-safe parameters
- **Streaming tool execution** with real-time status updates
- **Enhanced UI display** with expand/collapse and state indicators
- **Shared tools** across multiple agents

### 4. Real-Time Streaming
- **Server-Sent Events (SSE)** protocol
- **Delta-based text streaming** for efficiency
- **Three event types**: message/partial, tool/call, message/complete
- **Safe stream management** with error handling

### 5. Comprehensive UI Components
- **Agent selector** for visual agent switching
- **Memory status** with real-time statistics
- **Workflow controls** demonstrating enterprise patterns (mock)
- **Enhanced tool results** with collapsible details
- **Full chat interface** using @assistant-ui/react primitives

### 6. Production-Ready Patterns
- **Error handling** with retry support
- **Type safety** throughout with TypeScript
- **Accessibility** with ARIA attributes
- **Dark mode support** in all components
- **Clean architecture** with separation of concerns

### 7. Developer Experience
- **Well-organized file structure** by concern
- **Comprehensive examples** for each feature
- **Reusable components** and utilities
- **Clear configuration** with environment variables
- **Extensive documentation** in README

---

## Known Limitations & Future Enhancements

### Current Limitations

1. **Workflow System**: Currently mocked with local state (app/page.tsx:32-56)
   - Not integrated with real Mastra workflows
   - Demonstrates UI patterns only
   - `useMastraWorkflows` hook exists but not connected

2. **Mock Weather Data**: Tool uses hardcoded data (mastra/tools/weatherTool.ts:12-34)
   - Real implementation would call weather API
   - Demonstrates tool pattern without external dependencies

3. **Single User Mode**: Defaults to "default-user" resourceId
   - No authentication system
   - Production would need user management

4. **Local Database**: File-based SQLite storage
   - Not suitable for distributed systems
   - Would need remote LibSQL or other storage for production

### Future Enhancements

1. **Real Workflow Integration**:
   - Connect WorkflowControls to `useMastraWorkflows`
   - Demonstrate human-in-the-loop patterns
   - Show multi-step process management

2. **Authentication**:
   - Add user login system
   - Per-user memory isolation
   - Role-based agent access

3. **Additional Agents**:
   - More specialized agents (coding, research, etc.)
   - Agent composition and collaboration
   - Dynamic agent creation

4. **Advanced Memory**:
   - Vector search for semantic retrieval
   - Memory compression strategies
   - Cross-user knowledge sharing

5. **Tool Ecosystem**:
   - Real API integrations (weather, search, databases)
   - Tool result caching
   - Tool chaining and composition

6. **Production Features**:
   - Rate limiting and quotas
   - Conversation export
   - Analytics and monitoring
   - Error tracking (Sentry, etc.)

---

## Conclusion

The `examples/with-mastra` directory is a comprehensive, production-ready demonstration of integrating Mastra AI agents with the assistant-ui framework. It showcases:

- Complete multi-agent system with runtime switching
- Persistent conversation memory with SQLite storage
- Tool integration with streaming execution
- Real-time SSE streaming with delta-based updates
- Comprehensive UI components for all Mastra features
- Clean architecture with clear separation of concerns

The example serves as both a learning resource and a starting point for building sophisticated AI assistant applications with Mastra and assistant-ui.
