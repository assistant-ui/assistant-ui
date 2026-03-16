---
date: 2026-01-25T10:59:47Z
researcher: samdickson22
git_commit: db4578be969e67728a9f9313469c91846e082873
branch: agent-ui-mvp
repository: agent-ui-simple
topic: "How agent-dashboard-mvp and @assistant-ui/react-agent work"
tags: [research, codebase, agent-dashboard-mvp, react-agent, anthropic-sdk, runtime-architecture]
status: complete
last_updated: 2026-01-25
last_updated_by: samdickson22
---

# Research: How agent-dashboard-mvp and @assistant-ui/react-agent Integration Work

**Date**: 2026-01-25T10:59:47Z
**Researcher**: samdickson22
**Git Commit**: db4578be969e67728a9f9313469c91846e082873
**Branch**: agent-ui-mvp
**Repository**: agent-ui-simple

## Research Question

How does the agent-dashboard-mvp example work, and how does the @assistant-ui/react-agent package integrate with Anthropic's Claude Agent SDK?

## Summary

The `agent-dashboard-mvp` is a Next.js application showcasing a multi-task agent workspace with real-time event streaming, approval workflows, and cost tracking. It's built on top of `@assistant-ui/react-agent`, a sophisticated state management package that bridges browser-based React applications with the Anthropic Claude Agent SDK through a four-tier hierarchical runtime architecture: **Workspace → Task → Agent → Approval**.

The integration uses a dual-client architecture where `AnthropicAgentClient` wraps the real SDK for server-side use, while `HttpAgentClient` provides browser-compatible HTTP proxy communication via Server-Sent Events (SSE). Events flow from the Anthropic SDK through converters into a unified internal format, consumed by runtime classes that notify React components via `useSyncExternalStore` for optimal re-render control.

## Detailed Findings

### 1. Agent Dashboard MVP Architecture

#### Application Structure

**Entry Point** (`examples/agent-dashboard-mvp/app/page.tsx:226-232`)
```tsx
export default function Page() {
  return (
    <AgentWorkspaceProvider apiKey="demo-key">
      <Dashboard />
    </AgentWorkspaceProvider>
  );
}
```

The application follows a provider/consumer pattern:
- `AgentWorkspaceProvider` wraps the entire app and creates a `WorkspaceRuntime` instance
- `Dashboard` component and children consume workspace state through hooks

#### Key Components

**TaskListCompact** (`components/TaskListCompact.tsx:106-180`)
- Retrieves all tasks via `useWorkspaceTasks()` hook (line 111)
- Filters into "active" (running/queued) and "completed" (completed/failed) sections (lines 113-120)
- Renders each task using `TaskPrimitive.Root` wrapper (line 28)
- Displays task status, title, cost, and approval badges (lines 74-95)
- Uses `useTaskState()` with selectors for granular re-renders (line 41)

**TaskDetailView** (`components/TaskDetailView.tsx:242-254`)
- Wraps content in `TaskPrimitive.Root` for context injection (line 248)
- Subscribes to specific state slices using multiple `useTaskState()` calls (lines 30-36)
- Flattens agent events from all agents in task: `agents.flatMap(agent => agent.events)` (line 41)
- Provides three view modes: stream, tools, split (lines 88-127)

**EventStream** (`components/EventStream.tsx:53-211`)
- Receives `AgentEvent[]` array and renders timeline view
- Maps event types to visual config (icon, label, color) at lines 22-51
- Formats event content with summary/detail structure (lines 88-125)
- Auto-scrolls to bottom when new events arrive (lines 61-65)

**EnhancedApproval** (`components/EnhancedApproval.tsx:252-261`)
- Wraps in `ApprovalPrimitive.Root` to create approval context (line 257)
- Retrieves approval runtime via `useApproval()` hook (line 80)
- Assesses risk level from tool name using `toolRiskLevels` map (lines 84-86, 25-32)
- Renders approval UI with keyboard shortcuts (Y/N keys, lines 101-118)
- Calls `approval.approve()` or `approval.deny()` on action (lines 239-244)

**ThinkingDisplay** (`components/ThinkingDisplay.tsx:19-118`)
- Filters events for type "reasoning" (lines 22-28)
- Renders expandable blocks with 150-char previews (lines 76-77)
- Uses purple theme to distinguish from other event types (lines 58, 86)

#### Data Flow: Task Creation to Display

**Step 1: User Input** (`page.tsx:49-62`)
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsCreating(true);
  try {
    const task = await workspace.createTask(prompt); // Creates task
    setSelectedTaskId(task.id);                       // Selects for viewing
    setPrompt("");                                     // Clears input
  } finally {
    setIsCreating(false);
  }
};
```

**Step 2: Workspace Creates Task** (detailed in Runtime Architecture section)
- Calls HTTP endpoint: `POST /api/agent` with action "create"
- Server returns `{ taskId, prompt }`
- `WorkspaceRuntime` creates `TaskRuntime` instance
- Starts event streaming immediately
- Notifies workspace listeners

**Step 3: Task List Updates** (`TaskListCompact.tsx:111`)
```tsx
const tasks = useWorkspaceTasks();
```
- `useWorkspaceTasks` uses `useSyncExternalStore` to subscribe to workspace changes
- When workspace notifies, React re-renders with new tasks array
- Component maps over tasks to render list items

**Step 4: Task Selection** (`page.tsx:57`)
```tsx
setSelectedTaskId(task.id);
```

**Step 5: Detail View Renders** (`TaskDetailView.tsx:248-250`)
```tsx
<TaskPrimitive.Root taskId={selectedTaskId}>
  <TaskDetailContent />
</TaskPrimitive.Root>
```
- `TaskPrimitive.Root` creates `TaskProvider` with taskId in context
- `TaskDetailContent` uses `useTask()` to retrieve runtime
- Multiple `useTaskState()` subscriptions for different state slices

**Step 6: Events Stream** (background process)
- `TaskRuntime` continuously receives events from `client.streamEvents()`
- Each event processed by `processEvent()` method
- State updates trigger notifications
- Subscribed components re-render with new data

### 2. Runtime Architecture

The `@assistant-ui/react-agent` package implements a four-level hierarchical state management system.

#### Runtime Class Hierarchy

```
WorkspaceRuntime
  ├─ Map<string, TaskRuntime>
  └─ TaskRuntime[]  (cached array)

TaskRuntime
  ├─ Map<string, AgentRuntime>
  ├─ Map<string, ApprovalRuntime>
  └─ TaskState {
       agents: AgentState[],
       pendingApprovals: ApprovalState[]
     }

AgentRuntime
  └─ AgentState {
       events: AgentEvent[]
     }

ApprovalRuntime
  └─ ApprovalState
```

#### WorkspaceRuntime (`packages/react-agent/src/runtime/WorkspaceRuntime.ts`)

**Responsibilities**:
- Manages collection of TaskRuntimes
- Creates new tasks via HTTP client
- Maintains subscription system for task list changes

**Key Methods**:

- **createTask()** (lines 38-57): Complete task creation flow
  ```typescript
  async createTask(prompt: string, options?: Partial<CreateTaskOptions>) {
    const taskOptions = { prompt, ...options };
    const handle = await this.client.createTask(taskOptions);  // HTTP POST
    const task = new TaskRuntime(handle, this.client);         // Create runtime
    this.tasks.set(task.id, task);                             // Store in Map
    task.subscribe(() => this.notify());                       // Cascade updates
    this.notify();                                             // Notify listeners
    return task;
  }
  ```

- **getTasks()** (lines 59-61): Returns cached array of all tasks
- **subscribe()** (lines 72-75): Registers callback, returns unsubscribe function
- **notify()** (lines 77-81): Updates cached array and invokes all listeners

**Cascading Subscriptions** (line 53):
When a task is created, workspace subscribes to its changes:
```typescript
task.subscribe(() => this.notify());
```
This ensures task-level updates propagate to workspace-level subscribers.

#### TaskRuntime (`packages/react-agent/src/runtime/TaskRuntime.ts`)

**Responsibilities**:
- Manages task lifecycle and state
- Processes streaming events from SDK
- Maintains collections of AgentRuntimes and ApprovalRuntimes
- Coordinates approval workflows

**Initialization** (lines 19-32):
```typescript
constructor(handle: TaskHandle, client: AgentClientInterface) {
  this.client = client;
  this.state = {
    id: handle.id,
    title: handle.prompt.slice(0, 100),  // Truncated prompt
    status: "queued",
    cost: 0,
    agents: [],
    pendingApprovals: [],
    createdAt: new Date(),
  };
  this.startStreaming();  // Begins event consumption immediately
}
```

**Event Streaming Loop** (lines 63-78):
```typescript
private async startStreaming(): Promise<void> {
  if (this.isStreaming) return;
  this.isStreaming = true;

  try {
    for await (const event of this.client.streamEvents(this.state.id)) {
      this.processEvent(event);  // Process each event
    }
  } catch (error) {
    console.error("Error streaming task events:", error);
    this.state = { ...this.state, status: "failed" };
    this.notify();
  } finally {
    this.isStreaming = false;
  }
}
```

**Event Processing** (lines 80-164):

The `processEvent()` method handles 6 event result types:

1. **taskUpdate** (lines 84-86): Merges task-level state changes
   ```typescript
   if (result.taskUpdate) {
     this.state = { ...this.state, ...result.taskUpdate };
   }
   ```

2. **newAgent** (lines 88-105): Creates AgentRuntime and manages parent-child relationships
   ```typescript
   const agentRuntime = new AgentRuntime(result.newAgent);
   this.agents.set(result.newAgent.id, agentRuntime);

   // Establish parent-child link
   if (result.newAgent.parentAgentId) {
     const parentAgent = this.agents.get(result.newAgent.parentAgentId);
     parentAgent?.addChildAgent(result.newAgent.id);
   }
   ```

3. **agentUpdate** (lines 107-123): Updates existing agent's state
   ```typescript
   const agent = this.agents.get(result.agentUpdate.id);
   agent.updateState(result.agentUpdate.update);
   // Also update state array for serialization
   this.state = {
     ...this.state,
     agents: this.state.agents.map(a =>
       a.id === result.agentUpdate.id
         ? { ...a, ...result.agentUpdate.update }
         : a
     )
   };
   ```

4. **newEvent** (lines 125-141): Adds event to agent's event log
   ```typescript
   const agent = this.agents.get(result.newEvent.agentId);
   agent.addEvent(result.newEvent);
   // Update state array
   this.state = {
     ...this.state,
     agents: this.state.agents.map(a =>
       a.id === result.newEvent.agentId
         ? { ...a, events: [...a.events, result.newEvent] }
         : a
     )
   };
   ```

5. **newApproval** (lines 143-156): Creates ApprovalRuntime with resolution callback
   ```typescript
   const approvalRuntime = new ApprovalRuntime(
     result.newApproval,
     this.client,
     (status: ApprovalStatus) =>
       this.onApprovalResolved(result.newApproval.id, status)
   );
   this.approvals.set(result.newApproval.id, approvalRuntime);
   this.state = {
     ...this.state,
     pendingApprovals: [...this.state.pendingApprovals, result.newApproval]
   };
   ```

6. **resolvedApprovalId** (lines 158-161): Removes approval from pending list

All event processing ends with `this.notify()` (line 163) to trigger React updates.

#### AgentRuntime (`packages/react-agent/src/runtime/AgentRuntime.ts`)

**Responsibilities**:
- Holds single AgentState object
- Manages event accumulation
- Tracks parent-child agent relationships

**Simple State Container**:
```typescript
class AgentRuntime {
  private state: AgentState;
  private listeners = new Set<() => void>();

  constructor(state: AgentState) {
    this.state = state;
  }

  updateState(update: Partial<AgentState>) {
    this.state = { ...this.state, ...update };
    this.notify();
  }

  addEvent(event: AgentEvent) {
    this.state = {
      ...this.state,
      events: [...this.state.events, event]
    };
    this.notify();
  }
}
```

#### ApprovalRuntime (`packages/react-agent/src/runtime/ApprovalRuntime.ts`)

**Responsibilities**:
- Manages approval state
- Provides approve/deny methods
- Notifies parent TaskRuntime via callback

**Approval Flow** (lines 32-41):
```typescript
async approve(): Promise<void> {
  if (this.state.status !== "pending") {
    throw new Error("Approval is not pending");
  }

  await this.client.approveToolUse(this.state.taskId, this.state.id, "allow");
  this.state = { ...this.state, status: "approved" };
  this.onResolve("approved");  // Callback to TaskRuntime
  this.notify();               // Notify local listeners
}
```

The callback pattern (lines 14-18) allows parent notification without direct coupling:
```typescript
constructor(
  state: ApprovalState,
  client: AgentClientInterface,
  onResolve: (status: ApprovalStatus) => void  // Callback injection
) {
  this.onResolve = onResolve;
}
```

### 3. Anthropic SDK Integration

The integration provides a dual-client architecture with a shared `AgentClientInterface` abstraction.

#### Client Architecture

**AgentClientInterface** (`packages/react-agent/src/sdk/HttpAgentClient.ts:14-23`)
```typescript
interface AgentClientInterface {
  createTask(options: CreateTaskOptions): Promise<TaskHandle>;
  streamEvents(taskId: string): AsyncGenerator<SDKEvent>;
  approveToolUse(taskId: string, approvalId: string, decision: "allow" | "deny"): Promise<void>;
  cancelTask(taskId: string): Promise<void>;
}
```

This abstraction enables:
- Swapping between real SDK and HTTP proxy
- Testing with mock clients
- Server-side vs browser-side execution

#### AnthropicAgentClient - Server-Side SDK Wrapper

**Purpose**: Wraps `@anthropic-ai/claude-agent-sdk` for Node.js runtime

**Key Implementation** (`packages/react-agent/src/sdk/AnthropicAgentClient.ts`):

**createTask()** (lines 27-39):
```typescript
async createTask(options: CreateTaskOptions): Promise<TaskHandle> {
  const taskId = nanoid();
  const controller = new TaskController(
    taskId,
    options.prompt,
    this.config,
    options
  );
  this.activeTasks.set(taskId, controller);
  controller.runTask(); // Start background execution
  return { id: taskId, prompt: options.prompt };
}
```

**TaskController** - Internal SDK execution engine (lines 77-349):

The TaskController manages the complete agent execution lifecycle:

1. **Initialization** (lines 156-174):
   - Generates agentId
   - Emits "task_started" event
   - Emits "agent_spawned" event

2. **SDK Query Loop** (lines 177-246):
   ```typescript
   for await (const message of query({
     prompt: this.prompt,
     model: this.config.model || "claude-opus-4-20241212",
     tools: this.options.allowedTools ||
            ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
     maxTurns: this.options.maxTurns || 250,
     canUseTool: async (toolName, toolInput) => {
       // Approval flow implementation
     }
   })) {
     // Process SDK messages
   }
   ```

3. **Approval Flow** (lines 192-238):
   - Checks if tool requires approval via `requiresApproval` callback
   - Generates approvalId and toolCallId
   - Emits "tool_use_requested" event
   - Creates promise that waits for human decision
   - Emits "tool_use_approved" or "tool_use_denied" event
   - Returns approval decision to SDK

4. **Message Processing** (lines 281-340):
   Maps SDK message types to internal events:
   - **"system"/"init"** → "system_init" event
   - **"assistant"** with text → "message" event
   - **"assistant"** with tool_use → "tool_use" event
   - **"result"** → "cost_update" event

5. **Completion** (lines 248-265):
   - Emits "agent_completed" event
   - Emits "task_completed" event
   - Both include cost data

6. **Event Queue Management** (lines 127-153):
   ```typescript
   async *events(): AsyncGenerator<SDKEvent> {
     while (true) {
       if (this.eventQueue.length > 0) {
         yield this.eventQueue.shift()!;
       } else {
         await this.waitForEvent();
       }
     }
   }
   ```

#### HttpAgentClient - Browser HTTP Proxy

**Purpose**: Browser-compatible client that proxies to server-side API

**Key Implementation** (`packages/react-agent/src/sdk/HttpAgentClient.ts`):

**createTask()** (lines 39-62):
```typescript
async createTask(options: CreateTaskOptions): Promise<TaskHandle> {
  const response = await fetch(this.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    },
    body: JSON.stringify({
      action: "create",
      ...options,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create task: ${await response.text()}`);
  }

  const result = await response.json();
  return {
    id: result.taskId,
    prompt: options.prompt,
  };
}
```

**streamEvents()** (lines 64-119) - Server-Sent Events (SSE):
```typescript
async *streamEvents(taskId: string): AsyncGenerator<SDKEvent> {
  const abortController = new AbortController();
  this.activeStreams.set(taskId, abortController);

  const response = await fetch(
    `${this.baseUrl}/stream?taskId=${taskId}`,
    {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: abortController.signal,
    }
  );

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;

        const event = JSON.parse(data) as SDKEvent;
        event.timestamp = new Date(event.timestamp); // Reconstruct Date
        yield event;
      }
    }
  }
}
```

**SSE Protocol**:
- Server sends events as `data: {json}\n\n`
- Client parses each line starting with "data: "
- Terminates on "[DONE]" marker
- Reconstructs Date objects from ISO strings

#### SDK Event Converters

**processSDKEvent()** (`packages/react-agent/src/sdk/converters.ts:23-232`)

Transforms `SDKEvent` objects into `ProcessEventResult` containing state updates:

**Event Type Mappings**:

1. **"task_started"** (lines 30-34):
   ```typescript
   result.taskUpdate = { status: "running" };
   ```

2. **"task_completed"** (lines 36-44):
   ```typescript
   result.taskUpdate = {
     status: "completed",
     cost: event.data.totalCost || 0,
     completedAt: new Date()
   };
   ```

3. **"task_failed"** (lines 46-63):
   ```typescript
   result.taskUpdate = { status: "failed" };
   result.newEvent = {
     id: nanoid(),
     type: "error",
     agentId: event.agentId,
     content: { message: event.data.reason },
     timestamp: event.timestamp
   };
   ```

4. **"agent_spawned"** (lines 65-79):
   ```typescript
   result.newAgent = {
     id: event.agentId,
     name: event.data.name,
     status: "running",
     cost: 0,
     events: [],
     parentAgentId: event.data.parentAgentId,
     childAgentIds: [],
     taskId: event.taskId
   };
   ```

5. **"tool_use_requested"** (lines 116-147):
   Creates both approval state and tool_call event:
   ```typescript
   result.newApproval = {
     id: event.data.approvalId,
     toolName: event.data.toolName,
     toolInput: event.data.toolInput,
     reason: event.data.reason,
     status: "pending",
     agentId: event.agentId,
     taskId: event.taskId,
     createdAt: event.timestamp
   };

   result.newEvent = {
     id: nanoid(),
     type: "tool_call",
     agentId: event.agentId,
     content: {
       toolName: event.data.toolName,
       toolInput: event.data.toolInput,
       toolCallId: event.data.toolCallId
     },
     timestamp: event.timestamp
   };
   ```

6. **"tool_result"** (lines 162-181):
   ```typescript
   result.newEvent = {
     id: nanoid(),
     type: "tool_result",
     agentId: event.agentId,
     content: {
       toolCallId: event.data.toolCallId,
       result: event.data.result,
       isError: event.data.isError
     },
     timestamp: event.timestamp
   };
   ```

7. **"reasoning"** (lines 184-195):
   ```typescript
   result.newEvent = {
     id: nanoid(),
     type: "reasoning",
     agentId: event.agentId,
     content: { text: event.data.text },
     timestamp: event.timestamp
   };
   ```

8. **"cost_update"** (lines 212-228):
   ```typescript
   if (event.agentId && event.data.cost !== undefined) {
     result.agentUpdate = {
       id: event.agentId,
       update: { cost: event.data.cost }
     };
   }
   if (event.data.totalCost !== undefined) {
     result.taskUpdate = { cost: event.data.totalCost };
   }
   ```

### 4. Hooks and Primitives System

The package implements a four-layer architecture: Runtime (state) → Context (distribution) → Hooks (subscription) → Primitives (UI components).

#### Context Layer

**Workspace Context** (`packages/react-agent/src/hooks/useAgentWorkspace.tsx`):

```typescript
const WorkspaceContext = createContext<WorkspaceRuntime | null>(null);

export function AgentWorkspaceProvider({ apiKey, baseUrl, children }) {
  const runtime = useMemo(() => {
    return new WorkspaceRuntime({ apiKey, baseUrl });
  }, [apiKey, baseUrl]);

  return (
    <WorkspaceContext.Provider value={runtime}>
      {children}
    </WorkspaceContext.Provider>
  );
}
```

**Task/Agent/Approval Contexts**: Store IDs only, not full runtimes
```typescript
const TaskContext = createContext<string | null>(null);
const AgentContext = createContext<string | null>(null);
const ApprovalContext = createContext<string | null>(null);
```

This pattern reduces context updates and allows runtime lookup from parent workspace.

#### Hooks Layer

**Workspace Hooks**:

1. **useAgentWorkspace()** (lines 38-46):
   ```typescript
   export function useAgentWorkspace(): WorkspaceRuntime {
     const runtime = useContext(WorkspaceContext);
     if (!runtime) {
       throw new Error("useAgentWorkspace must be used within AgentWorkspaceProvider");
     }
     return runtime;
   }
   ```
   Returns full runtime with methods - no subscription, no automatic re-renders.

2. **useWorkspaceTasks()** (lines 48-56):
   ```typescript
   export function useWorkspaceTasks() {
     const workspace = useAgentWorkspace();

     return useSyncExternalStore(
       (callback) => workspace.subscribe(callback),
       () => workspace.getTasks(),
       () => EMPTY_TASKS  // SSR fallback
     );
   }
   ```
   Uses `useSyncExternalStore` for optimal re-render control:
   - First arg: Subscribe function that registers callback
   - Second arg: Snapshot function that reads current state
   - Third arg: Server snapshot (empty array for SSR safety)

**Task Hooks**:

1. **useTask()** (lines 31-39):
   ```typescript
   export function useTask(): TaskRuntime {
     const workspace = useAgentWorkspace();
     const taskId = useTaskId();
     const task = workspace.getTask(taskId);
     if (!task) {
       throw new Error(`Task not found: ${taskId}`);
     }
     return task;
   }
   ```
   Traverses hierarchy: Context → Workspace → Task lookup

2. **useTaskState()** with selector (lines 41-49):
   ```typescript
   export function useTaskState<T>(selector: (state: TaskState) => T): T {
     const task = useTask();

     return useSyncExternalStore(
       (callback) => task.subscribe(callback),
       () => selector(task.getState()),
       () => selector(task.getState())
     );
   }
   ```
   **Selector pattern benefits**:
   - Component only re-renders if selected slice changes
   - Multiple subscriptions can have different selectors
   - Optimal performance for large state objects

**Agent and Approval hooks follow identical patterns** with their respective runtime types.

#### Primitives Layer

Primitives provide composable UI components that automatically subscribe to runtime state.

**TaskPrimitive** (`packages/react-agent/src/primitives/TaskPrimitive.tsx`):

**Compound Component Pattern** (lines 119-128):
```typescript
export const TaskPrimitive = {
  Root,
  Title,
  Status,
  Cost,
  Cancel,
  Agents,
  Approvals,
  If
};
```

**Usage**:
```tsx
<TaskPrimitive.Root taskId="123">
  <TaskPrimitive.Title />
  <TaskPrimitive.Status showIcon />
  <TaskPrimitive.Cost precision={4} />
  <TaskPrimitive.If status="running">
    <TaskPrimitive.Cancel />
  </TaskPrimitive.If>
</TaskPrimitive.Root>
```

**Key Components**:

1. **Root** (lines 12-14): Creates TaskProvider context
   ```typescript
   function TaskRoot({ taskId, children }) {
     return <TaskProvider taskId={taskId}>{children}</TaskProvider>;
   }
   ```

2. **Title** (lines 18-21): Subscribes to title with selector
   ```typescript
   function TaskTitle(props) {
     const title = useTaskState((s) => s.title);
     return <span {...props}>{title}</span>;
   }
   ```

3. **Status** (lines 29-47): Displays status with icons
   ```typescript
   const statusIcons = {
     queued: "⏳", running: "🔄", completed: "✅", failed: "❌"
   };

   function TaskStatus({ showIcon = true, ...props }) {
     const status = useTaskState((s) => s.status);
     return (
       <span {...props}>
         {showIcon && `${statusIcons[status]} `}
         {status}
       </span>
     );
   }
   ```

4. **Cancel** (lines 60-73): Conditional button with method call
   ```typescript
   function TaskCancel(props) {
     const task = useTask();
     const status = useTaskState((s) => s.status);

     if (status !== "running" && status !== "queued") {
       return null;
     }

     return (
       <button onClick={() => task.cancel()} {...props}>
         {props.children ?? "Cancel"}
       </button>
     );
   }
   ```

5. **Agents** (lines 77-85): Render prop for lists
   ```typescript
   function TaskAgents({ children }) {
     const agents = useTaskState((s) => s.agents);
     return <>{children(agents.map(a => ({ id: a.id })))}</>;
   }
   ```
   Passes minimal data (IDs only) to avoid prop drilling full state.

6. **If** (lines 106-115): Conditional rendering
   ```typescript
   function TaskIf({ status, children }) {
     const currentStatus = useTaskState((s) => s.status);
     const statuses = Array.isArray(status) ? status : [status];

     if (!statuses.includes(currentStatus)) {
       return null;
     }

     return <>{children}</>;
   }
   ```

**ApprovalPrimitive** key components:

1. **Approve/Deny Buttons** (lines 51-83):
   ```typescript
   function ApprovalApprove(props) {
     const approval = useApproval();
     const status = useApprovalState((s) => s.status);

     if (status !== "pending") return null;

     return (
       <button onClick={() => approval.approve()} {...props}>
         {props.children ?? "Approve"}
       </button>
     );
   }
   ```

### 5. Complete Data Flow

#### Event Flow: Anthropic SDK → React Component

**Complete Pipeline**:

1. **SDK Invocation** (`AnthropicAgentClient.ts:177`):
   ```typescript
   for await (const message of query({ prompt, options }))
   ```

2. **SDK Message → Internal Event** (`AnthropicAgentClient.ts:245`):
   ```typescript
   this.processSDKMessage(message, agentId);
   ```
   Transforms SDK format to `SDKEvent` format

3. **Event Queue** (`AnthropicAgentClient.ts:150-153`):
   ```typescript
   private pushEvent(event: SDKEvent) {
     this.eventQueue.push(event);
     this.eventListeners.forEach(listener => listener());
   }
   ```

4. **Stream to Client** (`AnthropicAgentClient.ts:41-50`):
   ```typescript
   async *streamEvents(taskId: string) {
     for await (const event of controller.events()) {
       yield event;
     }
   }
   ```

5. **HTTP Transport** (for browser mode):
   Server API route sends as SSE:
   ```typescript
   for await (const event of controller.events()) {
     const data = `data: ${JSON.stringify(event)}\n\n`;
     streamController.enqueue(encoder.encode(data));
   }
   ```

6. **HTTP Client Receives** (`HttpAgentClient.ts:100-109`):
   ```typescript
   if (line.startsWith("data: ")) {
     const event = JSON.parse(data) as SDKEvent;
     event.timestamp = new Date(event.timestamp);
     yield event;
   }
   ```

7. **TaskRuntime Processes** (`TaskRuntime.ts:68-69`):
   ```typescript
   for await (const event of this.client.streamEvents(this.state.id)) {
     this.processEvent(event);
   }
   ```

8. **Event Conversion** (`TaskRuntime.ts:81`):
   ```typescript
   const result = processSDKEvent(event, this.state);
   ```

9. **State Updates** (`TaskRuntime.ts:84-161`):
   Applies updates based on result type

10. **Notification** (`TaskRuntime.ts:163`):
    ```typescript
    this.notify();
    ```

11. **React Re-render**:
    ```typescript
    useSyncExternalStore(
      (callback) => task.subscribe(callback),  // This fires
      () => selector(task.getState()),          // New snapshot compared
      ...
    )
    ```

12. **Component Updates**: If selector output changed, React re-renders

#### Approval Resolution Flow

**User clicks approve** → **ApprovalRuntime.approve()** → **HTTP POST** → **SDK receives approval** → **Tool executes** → **Events stream back**

Complete flow:

1. `EnhancedApproval.tsx:242`: `ApprovalPrimitive.Approve` clicked
2. `ApprovalPrimitive.tsx:60`: Calls `approval.approve()`
3. `ApprovalRuntime.ts:37`: POSTs to API with decision "allow"
4. `ApprovalRuntime.ts:38-40`: Updates local state, calls `onResolve` callback, notifies
5. `TaskRuntime.ts:166-175`: `onApprovalResolved` updates approval status in state
6. Server SDK receives approval, continues execution
7. Server sends "tool_use_approved" event via SSE
8. `TaskRuntime.ts:159-161`: Removes from pendingApprovals array
9. Component re-renders with approval removed from UI

## Code References

### Dashboard Components
- `examples/agent-dashboard-mvp/app/page.tsx:226-232` - Application entry point
- `examples/agent-dashboard-mvp/components/TaskListCompact.tsx:106-180` - Task list UI
- `examples/agent-dashboard-mvp/components/TaskDetailView.tsx:242-254` - Task detail UI
- `examples/agent-dashboard-mvp/components/EventStream.tsx:53-211` - Event timeline display
- `examples/agent-dashboard-mvp/components/EnhancedApproval.tsx:252-261` - Approval UI
- `examples/agent-dashboard-mvp/components/ThinkingDisplay.tsx:19-118` - Reasoning display

### Runtime Classes
- `packages/react-agent/src/runtime/WorkspaceRuntime.ts:20-81` - Top-level orchestrator
- `packages/react-agent/src/runtime/TaskRuntime.ts:11-189` - Task lifecycle manager
- `packages/react-agent/src/runtime/AgentRuntime.ts:7-51` - Agent state container
- `packages/react-agent/src/runtime/ApprovalRuntime.ts:8-61` - Approval flow manager

### SDK Integration
- `packages/react-agent/src/sdk/AnthropicAgentClient.ts:19-349` - Server-side SDK wrapper
- `packages/react-agent/src/sdk/HttpAgentClient.ts:29-170` - Browser HTTP client
- `packages/react-agent/src/sdk/converters.ts:23-232` - Event transformation layer

### Hooks
- `packages/react-agent/src/hooks/useAgentWorkspace.tsx:22-56` - Workspace hooks
- `packages/react-agent/src/hooks/useTaskState.tsx:19-66` - Task state hooks
- `packages/react-agent/src/hooks/useAgentState.tsx:19-69` - Agent state hooks
- `packages/react-agent/src/hooks/useApprovalState.tsx:24-74` - Approval state hooks

### Primitives
- `packages/react-agent/src/primitives/TaskPrimitive.tsx:12-128` - Task UI components
- `packages/react-agent/src/primitives/AgentPrimitive.tsx:12-127` - Agent UI components
- `packages/react-agent/src/primitives/ApprovalPrimitive.tsx:12-116` - Approval UI components

### Type Definitions
- `packages/react-agent/src/runtime/types.ts:9-146` - Core type system

## Architecture Insights

### Key Patterns

1. **Hierarchical State Management**: Four-tier runtime hierarchy (Workspace → Task → Agent/Approval) mirrors the conceptual model of agent workspaces. Each level has independent subscription system with upward propagation.

2. **Observer Pattern with useSyncExternalStore**: All runtimes implement `subscribe(callback)` and `notify()` for observation. React's `useSyncExternalStore` hooks into this for optimal concurrent rendering support.

3. **Dual-Client Architecture**: `AgentClientInterface` abstraction allows seamless swapping between direct SDK access (server) and HTTP proxy (browser) with identical API.

4. **Event Sourcing**: All state changes originate from `SDKEvent` stream. The `processSDKEvent()` converter is single source of truth for state transformations.

5. **Selector Pattern for Re-render Optimization**: Hooks accept selector functions `(state) => value` so components only re-render when selected slice changes, not entire state.

6. **Compound Component Pattern**: Primitives export object with related components (`TaskPrimitive.Root`, `TaskPrimitive.Title`, etc.) for flexible composition.

7. **Context Minimization**: Only top-level WorkspaceRuntime stored in context. Child contexts store IDs only, retrieving runtimes from parent. Reduces context propagation overhead.

8. **Immutable State Updates**: All mutations use spread operators to create new objects, enabling React's referential equality checks.

9. **Promise-based Approval Flow**: SDK execution suspends on `await` of approval promise, which resolves when user clicks approve/deny. Elegant integration of async human-in-the-loop.

10. **Render Props for Collections**: Components like `TaskAgents` and `AgentEvents` use render props to give consumer control while component manages subscription.

### Design Decisions

**Why separate runtime Maps and state arrays?**
- Runtime Maps provide O(1) lookup and method access
- State arrays enable serialization and immutable updates
- Both must stay synchronized

**Why use IDs in child contexts instead of runtime instances?**
- Reduces context updates (IDs rarely change)
- Prevents unnecessary re-renders down tree
- Allows workspace to be single source of truth

**Why selector pattern instead of direct state access?**
- Enables granular subscriptions at component level
- React compares selector output, not entire state
- Dramatically reduces re-renders in large state trees

**Why dual-client architecture?**
- Browser can't directly import Node.js SDK (fs, child_process dependencies)
- HTTP proxy allows browser usage while keeping SDK on server
- Same interface enables testing, mocking, custom implementations

**Why useSyncExternalStore over useState/useReducer?**
- Designed for external state stores like class instances
- Prevents tearing in React 18 concurrent rendering
- Subscription model matches runtime notification pattern

### Performance Considerations

**Re-render Optimization**:
- Selector pattern limits re-renders to components consuming changed data
- Example: 100 components using `useTaskState((s) => s.status)` all re-render only when status changes
- Components using `useTaskState((s) => s.cost)` unaffected by status change

**Memory Management**:
- Event streams cleaned up via finally block in `startStreaming()`
- AbortController terminates HTTP streams on task cancel
- Unsubscribe functions returned from `subscribe()` allow cleanup

**Subscription Cascading**:
- Task subscribes to workspace: `task.subscribe(() => this.notify())`
- Single agent update triggers: AgentRuntime.notify() → TaskRuntime.notify() → WorkspaceRuntime.notify()
- Only workspace subscribers (like `useWorkspaceTasks`) re-render
- Task-specific subscribers (like `useTaskState`) also re-render
- Unrelated tasks' subscribers don't fire

### Security Considerations

**API Key Handling**:
- Demo mode passes "demo-key" but doesn't expose real credentials
- Server-side API validates keys (implementation-dependent)
- SDK credentials never sent to browser

**Tool Approval System**:
- Configurable `requiresApproval` callback per tool
- SDK execution suspends until human approval
- Risk levels (low/medium/high) guide UI presentation

**SSRF Prevention**:
- Tool execution happens server-side via SDK
- Client only sends tool names and JSON-serializable inputs
- SDK's tool implementations handle validation

## Open Questions

1. **How does the demo-key mode work in the example?**
   - The code passes "demo-key" but has no special handling
   - Server API routes don't validate keys
   - Actual SDK authentication mechanism unclear from code
   - May rely on environment variables or system configuration

2. **What happens if multiple approval requests arrive simultaneously?**
   - Each gets unique approvalId
   - SDK likely queues tool executions
   - UI shows all pending approvals
   - Order of resolution may affect execution flow

3. **How are nested/child agents handled in UI?**
   - AgentState includes `parentAgentId` and `childAgentIds`
   - Runtime maintains parent-child links
   - Current UI flattens all agents - no hierarchical display
   - Potential enhancement: tree view of agent hierarchy

4. **What's the cost calculation mechanism?**
   - SDK sends "cost_update" events with `cost` and `totalCost`
   - Values appear to be USD amounts
   - Source of cost data unclear (token counting? API metadata?)
   - Default value of 0 suggests optional feature

5. **How does task cancellation affect in-flight approvals?**
   - TaskRuntime.cancel() calls client.cancelTask()
   - HttpAgentClient aborts stream via AbortController
   - Pending approvals may be orphaned
   - UI implications unclear

6. **Can the workspace be serialized and restored?**
   - State structures are JSON-serializable
   - Runtime instances would need reconstruction
   - Event streams would need reconnection
   - No built-in persistence mechanism observed

## Related Research

- `/Users/sam/Desktop/work/.wt/aui/agent-ui-simple/CLAUDE.md` - Project build instructions and architecture overview
- `/Users/sam/Desktop/work/.wt/aui/agent-ui-simple/packages/react-agent/README.md` - Package documentation (if exists)
- `@anthropic-ai/claude-agent-sdk` documentation - External dependency

## Conclusion

The `agent-dashboard-mvp` and `@assistant-ui/react-agent` integration demonstrates a sophisticated, production-ready architecture for building agentic UIs with React. The hierarchical runtime system, event-driven state management, and optimal re-render control via selectors create a robust foundation for complex agent workflows. The dual-client architecture elegantly bridges browser and server environments while maintaining a clean abstraction layer. The primitives system provides flexibility for UI composition while the hooks system offers granular state access with optimal performance characteristics.
